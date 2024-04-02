import { AnchorProvider, Program } from '@coral-xyz/anchor'
import * as splToken from '@solana/spl-token'
import IDL from '../claim_sdk/idl/token_dispenser.json'
import {
  ComputeBudgetProgram,
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  Secp256k1Program,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import dotenv from 'dotenv'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { ethers } from 'ethers'
import { loadFunderWallets } from '../claim_sdk/testWallets'
import { mockfetchFundTransaction } from './api'
import {
  checkAllProgramsWhitelisted,
  checkProgramAppears,
  checkSetComputeBudgetInstructionsAreSetComputeUnitLimit,
  checkTransaction,
  checkTransactions,
  checkV0,
  countTotalSignatures,
} from '../utils/verifyTransaction'
import { treasuries } from '../claim_sdk/treasury'
import { tokenDispenserProgramId } from '../utils/constants'

dotenv.config()
const tokenDispenserPublicKey = new PublicKey(tokenDispenserProgramId)
const WHITELISTED_PROGRAMS: PublicKey[] = [
  splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
  tokenDispenserPublicKey,
  Secp256k1Program.programId,
  Ed25519Program.programId,
  ComputeBudgetProgram.programId,
]

const RANDOM_BLOCKHASH = 'HXq5QPm883r7834LWwDpcmEM8G8uQ9Hqm1xakCHGxprV'
const funderWallets = loadFunderWallets()
const funderPubkey = Object.entries(funderWallets)[0][1].publicKey

function getTestPayers(): [PublicKey, PublicKey] {
  const wallets = loadFunderWallets()
  const walletsArray = Object.entries(wallets)
  return [walletsArray[0][1].publicKey, treasuries[0]]
}

function createTestTransactionFromInstructions(
  instructions: TransactionInstruction[]
) {
  return new VersionedTransaction(
    new TransactionMessage({
      instructions,
      payerKey: funderPubkey,
      recentBlockhash: RANDOM_BLOCKHASH,
    }).compileToV0Message()
  )
}

describe('test fund transaction api', () => {
  it('tests the api', async () => {
    const tokenDispenser = new Program(
      IDL as any,
      tokenDispenserPublicKey,
      new AnchorProvider(
        new Connection('http://localhost:8899'),
        new NodeWallet(new Keypair()),
        AnchorProvider.defaultOptions()
      )
    )

    const tokenDispenserInstruction = await tokenDispenser.methods
      .claim([])
      .accounts({
        funder: funderPubkey,
        claimant: PublicKey.unique(),
        claimantFund: PublicKey.unique(),
        config: PublicKey.unique(),
        mint: PublicKey.unique(),
        treasury: PublicKey.unique(),
        tokenProgram: PublicKey.unique(),
        systemProgram: PublicKey.unique(),
        sysvarInstruction: PublicKey.unique(),
        associatedTokenProgram: PublicKey.unique(),
      })
      .instruction()

    const secp256k1ProgramInstruction =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })
    const ed25519ProgramInstruction =
      Ed25519Program.createInstructionWithPrivateKey({
        privateKey: new Keypair().secretKey,
        message: Buffer.from('hello'),
      })
    const computeBudgetRequestHeapFrame = ComputeBudgetProgram.requestHeapFrame(
      { bytes: 1000 }
    )
    const computeBudgetSetComputeUnits =
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1000 })
    const systemProgramInstruction = SystemProgram.transfer({
      fromPubkey: PublicKey.unique(),
      toPubkey: PublicKey.unique(),
      lamports: 1000,
    })

    const computeBudgetUnitPrice = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: BigInt(1000),
    })

    // API call

    const transactionOK1 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      computeBudgetUnitPrice,
    ])

    const transactionOK2 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      secp256k1ProgramInstruction,
      computeBudgetSetComputeUnits,
      computeBudgetUnitPrice,
    ])

    const transactionTooManySigs = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      secp256k1ProgramInstruction,
      ed25519ProgramInstruction,
      computeBudgetSetComputeUnits,
    ])

    const transactionBadTransfer = createTestTransactionFromInstructions([
      systemProgramInstruction,
    ])

    const transactionBadNoTokenDispenser =
      createTestTransactionFromInstructions([
        secp256k1ProgramInstruction,
        ed25519ProgramInstruction,
        computeBudgetSetComputeUnits,
      ])

    const transactionBadComputeHeap = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      computeBudgetRequestHeapFrame,
    ])

    const transactionBadTransfer2 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      systemProgramInstruction,
    ])

    const transactionBadTransfer3 = createTestTransactionFromInstructions([
      systemProgramInstruction,
      tokenDispenserInstruction,
    ])

    const transactionLegacy = new VersionedTransaction(
      new TransactionMessage({
        instructions: [tokenDispenserInstruction],
        payerKey: funderPubkey,
        recentBlockhash: RANDOM_BLOCKHASH,
      }).compileToLegacyMessage()
    )

    await mockfetchFundTransaction([
      {
        tx: transactionOK1,
        payers: getTestPayers(),
      },
    ])
    expect(
      checkTransactions(
        [transactionOK1],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)

    await mockfetchFundTransaction([
      {
        tx: transactionOK2,
        payers: getTestPayers(),
      },
    ])
    expect(
      checkTransactions(
        [transactionOK2],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)

    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionTooManySigs,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionTooManySigs],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionBadTransfer,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadTransfer],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionBadNoTokenDispenser,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadNoTokenDispenser],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([
        { tx: transactionBadComputeHeap, payers: getTestPayers() },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadComputeHeap],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionBadTransfer2,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadTransfer2],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionBadTransfer3,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadTransfer3],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionLegacy,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionLegacy],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    // More granular tests
    expect(
      checkTransaction(
        transactionOK1,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)
    expect(checkProgramAppears(transactionOK1, tokenDispenserPublicKey)).toBe(
      true
    )
    expect(
      checkAllProgramsWhitelisted(transactionOK1, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionOK1)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transactionOK1)
    ).toBe(true)
    expect(countTotalSignatures(transactionOK1)).toBe(2)

    expect(
      checkTransaction(
        transactionOK2,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)
    expect(checkProgramAppears(transactionOK2, tokenDispenserPublicKey)).toBe(
      true
    )
    expect(
      checkAllProgramsWhitelisted(transactionOK2, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionOK2)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transactionOK2)
    ).toBe(true)
    expect(countTotalSignatures(transactionOK2)).toBe(3)

    expect(
      checkTransaction(
        transactionTooManySigs,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(transactionTooManySigs, tokenDispenserPublicKey)
    ).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionTooManySigs, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionTooManySigs)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionTooManySigs
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionTooManySigs)).toBe(4)

    expect(
      checkTransaction(
        transactionBadTransfer,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(transactionBadTransfer, tokenDispenserPublicKey)
    ).toBe(false)
    expect(
      checkAllProgramsWhitelisted(transactionBadTransfer, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkV0(transactionBadTransfer)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadTransfer
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadTransfer)).toBe(2)

    expect(
      checkTransaction(
        transactionBadNoTokenDispenser,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(
        transactionBadNoTokenDispenser,
        tokenDispenserPublicKey
      )
    ).toBe(false)
    expect(
      checkAllProgramsWhitelisted(
        transactionBadNoTokenDispenser,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)
    expect(checkV0(transactionBadNoTokenDispenser)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadNoTokenDispenser
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadNoTokenDispenser)).toBe(3)

    expect(
      checkTransaction(
        transactionBadComputeHeap,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(transactionBadComputeHeap, tokenDispenserPublicKey)
    ).toBe(true)
    expect(
      checkAllProgramsWhitelisted(
        transactionBadComputeHeap,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)
    expect(checkV0(transactionBadComputeHeap)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadComputeHeap
      )
    ).toBe(false)
    expect(countTotalSignatures(transactionBadComputeHeap)).toBe(2)

    expect(
      checkTransaction(
        transactionBadTransfer2,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(transactionBadTransfer2, tokenDispenserPublicKey)
    ).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionBadTransfer2, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkV0(transactionBadTransfer2)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadTransfer2
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadTransfer2)).toBe(3)

    expect(
      checkTransaction(
        transactionBadTransfer3,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(transactionBadTransfer3, tokenDispenserPublicKey)
    ).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionBadTransfer3, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkV0(transactionBadTransfer3)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadTransfer3
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadTransfer3)).toBe(3)

    expect(
      checkTransaction(
        transactionLegacy,
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(transactionLegacy, tokenDispenserPublicKey)
    ).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionLegacy, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionLegacy)).toBe(false)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transactionLegacy)
    ).toBe(true)
    expect(countTotalSignatures(transactionLegacy)).toBe(2)

    // Grouped transactions
    await mockfetchFundTransaction([
      {
        tx: transactionOK1,
        payers: getTestPayers(),
      },
      {
        tx: transactionOK2,
        payers: getTestPayers(),
      },
    ])
    expect(
      checkTransactions(
        [transactionOK1, transactionOK2],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)

    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionOK1,
          payers: getTestPayers(),
        },
        {
          tx: transactionBadTransfer3,
          payers: getTestPayers(),
        },
        {
          tx: transactionOK2,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionOK1, transactionBadTransfer3, transactionOK2],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    await expect(
      mockfetchFundTransaction([
        {
          tx: transactionOK1,
          payers: getTestPayers(),
        },
        {
          tx: transactionOK2,
          payers: getTestPayers(),
        },
        {
          tx: transactionBadComputeHeap,
          payers: getTestPayers(),
        },
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionOK1, transactionOK2, transactionBadComputeHeap],
        tokenDispenserPublicKey,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
  })

  it('tests counting signatures', async () => {
    const secp256k1ProgramInstruction =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })

    const secp256k1ProgramInstruction2Sigs =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })
    secp256k1ProgramInstruction2Sigs.data[0] = 2

    const secp256k1ProgramInstruction3Sigs =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })
    secp256k1ProgramInstruction3Sigs.data[0] = 3

    expect(
      countTotalSignatures(
        createTestTransactionFromInstructions([
          secp256k1ProgramInstruction,
          secp256k1ProgramInstruction2Sigs,
          secp256k1ProgramInstruction3Sigs,
        ])
      )
    ).toBe(7)
    expect(
      countTotalSignatures(
        createTestTransactionFromInstructions([
          secp256k1ProgramInstruction2Sigs,
          secp256k1ProgramInstruction,
        ])
      )
    ).toBe(4)
  })
})
