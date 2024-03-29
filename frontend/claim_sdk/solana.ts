import * as anchor from '@coral-xyz/anchor'
import { Wallet } from '@coral-xyz/anchor/dist/cjs/provider'
import tokenDispenser from './idl/token_dispenser.json'
import type { TokenDispenser } from './idl/token_dispenser'
import { Idl, IdlAccounts, IdlTypes, Program } from '@coral-xyz/anchor'
import { Buffer } from 'buffer'
import { MerkleTree } from './merkleTree'
import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  ComputeBudgetProgram,
  Connection,
  Ed25519Program,
  LAMPORTS_PER_SOL,
  PublicKey,
  Secp256k1Program,
  SignatureStatus,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionError,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js'
import * as splToken from '@solana/spl-token'
import { ClaimInfo, Ecosystem } from './claim'
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import { SignedMessage } from './ecosystems/signatures'
import { extractChainId } from './ecosystems/cosmos'
import { fetchFundTransaction } from '../utils/api'
import { getClaimPayers } from './treasury'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'

export const ERROR_SIGNING_TX = 'error: signing transaction'
export const ERROR_FUNDING_TX = 'error: funding transaction'
export const ERROR_RPC_CONNECTION = 'error: rpc connection'
export const ERROR_CRAFTING_TX = 'error: crafting transaction'

type bump = number
// NOTE: This must be kept in sync with the on-chain program
const AUTHORIZATION_PAYLOAD = [
  'W Airdrop PID:\n',
  '\nI authorize Solana wallet\n',
  '\nto claim my W tokens.\n',
]

export type TransactionWithPayers = {
  tx: VersionedTransaction
  payers: [PublicKey, PublicKey]
}

/**
 * This class wraps the interaction with the TokenDispenser
 * program for a specific claimant. The claimant will be the
 * solana pubkey of the wallet used in the constructor.
 *
 * TODO: add more documentation
 */
export class TokenDispenserProvider {
  tokenDispenserProgram: anchor.Program<TokenDispenser>
  configPda: [anchor.web3.PublicKey, bump]
  config: IdlAccounts<TokenDispenser>['Config'] | undefined
  providers: anchor.Provider[]

  constructor(
    endpoints: string[],
    wallet: Wallet,
    programId: anchor.web3.PublicKey,
    confirmOpts?: anchor.web3.ConfirmOptions
  ) {
    confirmOpts = confirmOpts ?? anchor.AnchorProvider.defaultOptions()

    this.providers = endpoints.map(
      (endpoint) =>
        new anchor.AnchorProvider(
          new anchor.web3.Connection(
            endpoint,
            confirmOpts?.preflightCommitment
          ),
          wallet,
          confirmOpts ?? anchor.AnchorProvider.defaultOptions()
        )
    )

    this.tokenDispenserProgram = new Program(
      tokenDispenser as Idl,
      programId,
      this.providers[0]
    ) as unknown as Program<TokenDispenser>

    this.configPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      this.programId
    )
  }

  get programId(): anchor.web3.PublicKey {
    return this.tokenDispenserProgram.programId
  }

  get connection(): anchor.web3.Connection {
    return this.provider.connection
  }

  get claimant(): anchor.web3.PublicKey {
    return this.provider.publicKey!
  }

  get provider(): anchor.Provider {
    return this.tokenDispenserProgram.provider
  }

  public getConfigPda(): [anchor.web3.PublicKey, bump] {
    return this.configPda
  }

  public async getConfig(): Promise<IdlAccounts<TokenDispenser>['Config']> {
    // config is immutable once its been initialized so this is safe.
    if (this.config === undefined) {
      this.config = await this.fetchConfigData()
    }
    return this.config
  }

  private async fetchConfigData(): Promise<
    IdlAccounts<TokenDispenser>['Config']
  > {
    const configAccountInfo = await this.provider.connection.getAccountInfo(
      this.getConfigPda()[0]
    )
    if (configAccountInfo === null) {
      throw new Error('Config account not found')
    }
    return await this.tokenDispenserProgram.coder.accounts.decode(
      'Config',
      configAccountInfo.data
    )
  }

  public getReceiptPda(claimInfo: ClaimInfo): [anchor.web3.PublicKey, bump] {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('receipt'), MerkleTree.hashLeaf(claimInfo.toBuffer())],
      this.programId
    )
  }

  public async isClaimAlreadySubmitted(claimInfo: ClaimInfo): Promise<boolean> {
    return (
      (
        await this.connection.getAccountInfo(this.getReceiptPda(claimInfo)[0])
      )?.owner.equals(this.programId) ?? false
    )
  }

  public async initialize(
    root: Buffer,
    mint: anchor.web3.PublicKey,
    dispenserGuard: anchor.web3.PublicKey,
    treasuries: readonly anchor.web3.PublicKey[],
    funders: readonly anchor.web3.PublicKey[],
    maxTransfer: anchor.BN
  ): Promise<TransactionSignature> {
    const addressLookupTable = await this.initAddressLookupTable(
      mint,
      treasuries,
      funders
    )

    return this.tokenDispenserProgram.methods
      .initialize(Array.from(root), dispenserGuard, maxTransfer)
      .accounts({
        config: this.getConfigPda()[0],
        mint,
        systemProgram: anchor.web3.SystemProgram.programId,
        addressLookupTable,
      })
      .rpc()
  }

  async initAddressLookupTable(
    mint: anchor.web3.PublicKey,
    treasuries: readonly anchor.web3.PublicKey[],
    funders: readonly anchor.web3.PublicKey[]
  ): Promise<anchor.web3.PublicKey> {
    const recentSlot = await this.provider.connection.getSlot()
    const [lookupTableInstruction, lookupTableAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: this.provider.publicKey!,
        payer: this.provider.publicKey!,
        recentSlot,
      })
    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
      payer: this.provider.publicKey,
      authority: this.provider.publicKey!,
      lookupTable: lookupTableAddress,
      addresses: [
        this.configPda[0],
        mint,
        TOKEN_PROGRAM_ID,
        SystemProgram.programId,
        SYSVAR_INSTRUCTIONS_PUBKEY,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        ...treasuries,
        ...funders,
      ],
    })
    let createLookupTableTx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [lookupTableInstruction, extendInstruction],
        payerKey: this.provider.publicKey!,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message()
    )
    await this.provider.sendAndConfirm!(createLookupTableTx, [], {
      skipPreflight: true,
    })
    return lookupTableAddress
  }

  private async getLookupTableAccount(): Promise<AddressLookupTableAccount> {
    const lookupTableAddress = (await this.getConfig()).addressLookupTable
    const resp = await this.connection.getAddressLookupTable(lookupTableAddress)
    if (resp.value === null) {
      throw new Error(`No Address Lookup Table found at ${lookupTableAddress}`)
    }
    return resp.value
  }

  public generateAuthorizationPayload(): string {
    return AUTHORIZATION_PAYLOAD[0].concat(
      this.programId.toString(),
      AUTHORIZATION_PAYLOAD[1],
      this.claimant.toString(),
      AUTHORIZATION_PAYLOAD[2]
    )
  }

  public async submitClaims(
    claims: {
      claimInfo: ClaimInfo
      proofOfInclusion: Uint8Array[]
      signedMessage: SignedMessage | undefined
    }[],
    fetchFundTransactionFunction: (
      transactions: TransactionWithPayers[]
    ) => Promise<VersionedTransaction[]> = fetchFundTransaction, // This argument is only used for testing where we can't call the API
    getPayersForClaim: (
      claimInfo: ClaimInfo
    ) => [anchor.web3.PublicKey, anchor.web3.PublicKey] = getClaimPayers // This argument is only used for testing where we can't call the API
  ): Promise<Promise<TransactionError | null>[][]> {
    const txs: TransactionWithPayers[] = []

    try {
      for (const claim of claims) {
        const [funder, treasury] = getPayersForClaim(claim.claimInfo)

        txs.push({
          tx: await this.generateClaimTransaction(
            funder,
            treasury,
            claim.claimInfo,
            claim.proofOfInclusion,
            claim.signedMessage
          ),
          payers: [funder, treasury],
        })
      }
    } catch (e) {
      console.error(e)
      throw new Error(ERROR_CRAFTING_TX)
    }

    let txsSignedOnce: VersionedTransaction[]

    try {
      txsSignedOnce = await (
        this.tokenDispenserProgram.provider as anchor.AnchorProvider
      ).wallet.signAllTransactions(txs.map((tx) => tx.tx))
    } catch (e) {
      console.error(e)
      throw new Error(ERROR_SIGNING_TX)
    }

    const txsSignedOnceWithPayers: TransactionWithPayers[] = txsSignedOnce.map(
      (tx, index) => {
        return {
          tx: tx,
          payers: txs[index].payers,
        }
      }
    )

    let txsSignedTwice: VersionedTransaction[]
    try {
      txsSignedTwice = await fetchFundTransactionFunction(
        txsSignedOnceWithPayers
      )
    } catch (e) {
      console.error(e)
      throw new Error(ERROR_FUNDING_TX)
    }

    // send the txns. Associated token account will be created if needed.
    const sendTxs = await this.multiBroadcastTransactions(txsSignedTwice)

    const mapToOutput = sendTxs.map((tx) => {
      // if the transaction comes back null this is actually an error
      if (tx === null) {
        //return as a promise
        return Promise.resolve('Transaction failed to broadcast')
      }
      // if the transaction errored we will also have to handle that
      if (tx.err) {
        return Promise.resolve(tx.err)
      }
      //otherwise we are fine, return null
      return Promise.resolve(null)
    })

    //Pack into another array for typechecking
    return [mapToOutput]
  }

  public async generateClaimTransaction(
    funder: PublicKey,
    treasury: PublicKey,
    claimInfo: ClaimInfo,
    proofOfInclusion: Uint8Array[],
    signedMessage: SignedMessage | undefined
  ): Promise<VersionedTransaction> {
    const [receiptPda, receiptBump] = this.getReceiptPda(claimInfo)
    const { mint } = await this.getConfig()
    //same as getClaimantFundAddress / getAssociatedTokenAddress but with bump
    const [claimantFund, claimaintFundBump] = PublicKey.findProgramAddressSync(
      [
        this.claimant.toBytes(),
        splToken.TOKEN_PROGRAM_ID.toBytes(),
        mint.toBytes(),
      ],
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID
    )
    const [claimantFundAccount, lookupTableAccount] = await Promise.all([
      this.connection.getAccountInfo(claimantFund),
      this.getLookupTableAccount(),
    ])

    const ixs: anchor.web3.TransactionInstruction[] = []

    // 1. add signatureVerification instruction if needed
    const signatureVerificationIx =
      this.generateSignatureVerificationInstruction(
        claimInfo.ecosystem,
        signedMessage
      )

    if (signatureVerificationIx) ixs.push(signatureVerificationIx)

    // 2. add create ATA instruction if needed
    const claimantFundExists = claimantFundAccount !== null

    if (!claimantFundExists)
      ixs.push(
        splToken.Token.createAssociatedTokenAccountInstruction(
          splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
          splToken.TOKEN_PROGRAM_ID,
          mint,
          claimantFund,
          this.claimant,
          funder
        )
      )

    // 3. add claim instruction
    const proofOfIdentity = this.createProofOfIdentity(
      claimInfo,
      signedMessage,
      0
    )

    const claimCert: IdlTypes<TokenDispenser>['ClaimCertificate'] = {
      amount: claimInfo.amount,
      proofOfIdentity,
      proofOfInclusion,
    }

    ixs.push(
      await this.tokenDispenserProgram.methods
        .claim(claimCert)
        .accounts({
          funder,
          claimant: this.claimant,
          claimantFund,
          config: this.getConfigPda()[0],
          mint,
          treasury,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          sysvarInstruction: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          {
            pubkey: receiptPda,
            isWritable: true,
            isSigner: false,
          },
        ])
        .instruction()
    )

    // 4. add Compute Unit instructions
    const pdaDerivationCosts = (bump: number) => {
      const maxBump = 255
      const cusPerPdaDerivation = 1500
      return (maxBump - bump) * cusPerPdaDerivation
    }
    const safetyMargin = 1000
    const ataCreationCost = 20460
    //determined experimentally:
    const ecosystemCUs = {
      discord: 44200,
      solana: 40450,
      evm: 66600,
      sui: 79200,
      aptos: 78800,
      terra: 113500,
      osmosis: 113200,
      injective: 71700,
      algorand: 70700,
    }

    const units =
      safetyMargin +
      ecosystemCUs[claimInfo.ecosystem] +
      pdaDerivationCosts(claimaintFundBump) +
      pdaDerivationCosts(receiptBump) +
      (claimantFundExists
        ? 0
        : ataCreationCost + pdaDerivationCosts(claimaintFundBump))
    ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units }))

    const microLamports = 1_000_000 //somewhat arbitrary choice
    ixs.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }))

    // 5. build and return the transaction
    return new VersionedTransaction(
      new TransactionMessage({
        instructions: ixs,
        payerKey: funder,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message([lookupTableAccount!])
    )
  }

  private createProofOfIdentity(
    claimInfo: ClaimInfo,
    signedMessage: SignedMessage | undefined,
    verificationInstructionIndex: number
  ): IdlTypes<TokenDispenser>['IdentityCertificate'] {
    if (claimInfo.ecosystem === 'solana') {
      return {
        solana: {},
      }
    }

    if (signedMessage) {
      switch (claimInfo.ecosystem) {
        case 'evm':
        case 'aptos':
        case 'sui':
        case 'algorand':
        case 'injective': {
          return {
            [claimInfo.ecosystem]: {
              pubkey: Array.from(signedMessage.publicKey),
              verificationInstructionIndex,
            },
          }
        }
        case 'osmosis':
        case 'terra': {
          return {
            cosmwasm: {
              pubkey: Array.from(signedMessage.publicKey),
              chainId: extractChainId(claimInfo.identity),
              signature: Array.from(signedMessage.signature),
              recoveryId: signedMessage.recoveryId!,
              message: Buffer.from(signedMessage.fullMessage),
            },
          }
        }
        case 'discord': {
          return {
            discord: {
              username: claimInfo.identity,
              verificationInstructionIndex,
            },
          }
        }
        //TODO: implement other ecosystems
        default: {
          throw new Error(`unknown ecosystem type: ${claimInfo.ecosystem}`)
        }
      }
    } else {
      throw new Error(
        'signedMessage must be provided for non-solana ecosystems'
      )
    }
  }

  private generateSignatureVerificationInstruction(
    ecosystem: Ecosystem,
    signedMessage: SignedMessage | undefined,
    instructionIndex: number = 0
  ): anchor.web3.TransactionInstruction | undefined {
    if (ecosystem === 'solana') {
      return undefined
    }

    if (signedMessage) {
      switch (ecosystem) {
        case 'evm':
        case 'injective': {
          return Secp256k1Program.createInstructionWithEthAddress({
            ethAddress: signedMessage.publicKey,
            message: signedMessage.fullMessage,
            signature: signedMessage.signature,
            recoveryId: signedMessage.recoveryId!,
            instructionIndex,
          })
        }
        case 'osmosis':
        case 'terra': {
          return undefined
        }
        case 'discord':
        case 'sui':
        case 'algorand':
        case 'aptos': {
          return Ed25519Program.createInstructionWithPublicKey({
            publicKey: signedMessage.publicKey,
            message: signedMessage.fullMessage,
            signature: signedMessage.signature,
            instructionIndex,
          })
        }
        default: {
          // TODO: support the other ecosystems
          throw new Error(`unknown ecosystem type: ${ecosystem}`)
        }
      }
    } else {
      throw new Error(
        'signedMessage must be provided for non-solana ecosystems'
      )
    }
  }

  public async getClaimantFundAddress(): Promise<PublicKey> {
    const config = await this.getConfig()
    const associatedTokenAccount =
      await splToken.Token.getAssociatedTokenAddress(
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        splToken.TOKEN_PROGRAM_ID,
        config.mint,
        this.claimant
      )
    return associatedTokenAccount
  }

  public async setupMintAndTreasury(): Promise<{
    mint: Token
    treasury: PublicKey
  }> {
    const mintAuthority = anchor.web3.Keypair.generate()

    await airdrop(this.connection, LAMPORTS_PER_SOL, mintAuthority.publicKey)
    const mint = await Token.createMint(
      this.connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    )

    const treasury = await mint.createAccount(mintAuthority.publicKey)
    await mint.mintTo(treasury, mintAuthority, [], 1000000000)
    await mint.approve(
      treasury,
      this.getConfigPda()[0],
      mintAuthority,
      [],
      1000000000
    )
    return { mint, treasury }
  }

  private async multiBroadcastTransactions(
    transactions: VersionedTransaction[]
  ): Promise<(anchor.web3.SignatureStatus | null)[]> {
    const output: (anchor.web3.SignatureStatus | null)[] = []
    if (this.providers.length === 0) {
      throw new Error('No valid endpoints to broadcast transactions')
    }
    const redundantBroadcasts = new Map<
      VersionedTransaction,
      Promise<anchor.web3.SignatureStatus | null>[]
    >()

    try {
      for (const transaction of transactions) {
        redundantBroadcasts.set(transaction, [])
        //Cancellation token closure
        let cancelled = false
        const getCancellationSignal = () => cancelled
        for (const endpoint of this.providers.map(
          (provider) => provider.connection.rpcEndpoint
        )) {
          redundantBroadcasts.get(transaction)!.push(
            this.broadcastTransaction(
              transaction,
              endpoint,
              getCancellationSignal
            ).then(
              //call the cancellation only if the transaction signature is successful
              (result) => {
                if (
                  result != null &&
                  result.confirmations &&
                  result.confirmations > 0
                ) {
                  cancelled = true
                }
                return result
              }
            )
          )
        }
      }

      for (const transaction of transactions) {
        const allSettledPromises = await Promise.allSettled(
          redundantBroadcasts.get(transaction)!
        )
        const successfulResults = allSettledPromises
          .filter(
            (result) =>
              result.status === 'fulfilled' &&
              result.value != null &&
              result.value.confirmations &&
              result.value.confirmations > 0
          )
          .map((result) =>
            result.status === 'fulfilled' ? result.value : null
          )

        if (successfulResults.length >= 1) {
          output.push(successfulResults[0])
        } else {
          output.push(successfulResults[0])
        }
      }

      return output
    } catch (e) {
      //This should never hit
      throw new Error('Top level error broadcasting transactions: ', e)
    }
  }

  private async broadcastTransaction(
    transaction: VersionedTransaction,
    endpoint: string,
    getCancellationSignal: () => boolean
  ): Promise<anchor.web3.SignatureStatus | null> {
    //Noting the time at start so that we can't inifinte loop in the event of a halted thread or dead rpc.
    const timeStart = Date.now()
    // 35 seconds
    const maxTimeout = 35 * 1000
    const connection = new Connection(endpoint)
    let shouldRetry = getCancellationSignal()
    //TODO check that this is really the txId
    const txId = bs58.encode(transaction.signatures[0])

    while (shouldRetry) {
      //first send the transaction raw
      try {
        await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: true,
          maxRetries: 0,
        })
      } catch (e) {
        //just swallow it if it fails for now.
      }

      //Pull the signature status
      try {
        const status = await connection.getSignatureStatus(txId)
        if (
          status.value?.confirmationStatus === 'confirmed' ||
          status.value?.confirmationStatus === 'finalized'
          //Intentionally omitting processed, confirmed means 66% of stake voted on it
        ) {
          //If the transaction is confirmed or finalized we're all done.
          return status.value
          //Multibroadcast function should invoke the cancel token to cancel the other parallel broadcasts
        }
      } catch (e) {
        //This means the status call actually rejected, which we can't really do anything about
      }

      //If we're here, we need to check the time and see if we should retry.
      const timeEnd = Date.now()
      //This should only trigger after we are sufficiently sure the blockhash will have expired.
      if (timeEnd - timeStart > maxTimeout) {
        return null
      }

      //wait 1.8 seconds so as to not murder the RPC
      await wait(1800)

      shouldRetry = getCancellationSignal()
    }

    //This means we got manually cancelled.
    return null
  }
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function airdrop(
  connection: Connection,
  amount: number,
  pubkey: PublicKey
): Promise<void> {
  const airdropTxn = await connection.requestAirdrop(pubkey, amount)
  await connection.confirmTransaction({
    signature: airdropTxn,
    ...(await connection.getLatestBlockhash()),
  })
}
