import * as anchor from '@coral-xyz/anchor'
import { expect } from '@jest/globals'

import { SignedMessage } from '../claim_sdk/ecosystems/signatures'
import { Ecosystem, ClaimInfo } from '../claim_sdk/claim'
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import { Buffer } from 'buffer'
import { TokenDispenserProvider } from '../claim_sdk/solana'
import { TokenDispenserEventSubscriber } from '../claim_sdk/eventSubscriber'
import {
  DiscordTestWallet,
  TestWallet,
  getTestClaimPayers,
  loadAnchorWallet,
  loadFunderWallets,
} from '../claim_sdk/testWallets'
import { loadTestWallets } from '../claim_sdk/testWallets'
import { mockFetchAmountAndProof, mockfetchFundTransaction } from './api'
import { ethers } from 'ethers'
import {
  addTestWalletsToDatabase as addTestWalletsToInMemoryDb,
  clearInMemoryDb,
} from './utils'

describe('integration test', () => {
  let root: Buffer
  let maxAmount: anchor.BN
  let testWallets: Record<Ecosystem, TestWallet[]>
  let dispenserGuard: PublicKey

  beforeAll(async () => {
    testWallets = await loadTestWallets()
    // TODO replace it with a in memory flat file db
    let result = addTestWalletsToInMemoryDb(testWallets)
    root = result[0]
    maxAmount = result[1]
    dispenserGuard = (testWallets.discord[0] as unknown as DiscordTestWallet)
      .dispenserGuardPublicKey
  })

  afterAll(() => {
    clearInMemoryDb()
  })

  describe('Api test', () => {
    // Test does not add any value since it test the API call that was removed
    it.skip('call the api with a real identity', async () => {
      const response = await mockFetchAmountAndProof(
        'evm',
        testWallets.evm[0].address()
      )
      expect(response).toBeTruthy()
      expect(response?.claimInfo).toEqual({
        ecosystem: 'evm',
        identity: testWallets.evm[0].address(),
        amount: new anchor.BN(3000000),
      })
    })

    // Test does not add any value since it test the API call that was removed
    it.skip('call the api with a fake identity', async () => {
      expect(
        await mockFetchAmountAndProof('evm', 'this_is_a_fake_address')
      ).toBeFalsy()
    })
  })

  describe('token dispenser e2e', () => {
    const wallet = loadAnchorWallet()
    const funderWallet = Object.entries(loadFunderWallets())[0][1]
    const endpoint = 'http://127.0.0.1:8899'
    const tokenDispenserPid = new PublicKey(
      'Wapq3Hpv2aSKjWrh4pM8eweh8jVJB7D1nLBw9ikjVYx'
    )

    const confirmOpts: anchor.web3.ConfirmOptions = {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      commitment: 'confirmed',
    }

    const deployerTokenDispenserProvider = new TokenDispenserProvider(
      [endpoint],
      funderWallet,
      tokenDispenserPid,
      confirmOpts
    )

    const tokenDispenserProvider = new TokenDispenserProvider(
      [endpoint],
      wallet,
      tokenDispenserPid,
      confirmOpts
    )

    const tenMinTimeWindow = 10 * 60
    const tokenDispenserEventSubscriber = new TokenDispenserEventSubscriber(
      endpoint,
      tokenDispenserPid,
      tenMinTimeWindow,
      undefined,
      50,
      confirmOpts
    )

    let mint: Token
    let treasury: PublicKey
    let expectedTreasuryBalance = new anchor.BN(1000000000)
    const makeClaim = (
      claimInfo: ClaimInfo,
      proofOfInclusion: Uint8Array[],
      signedMessage?: SignedMessage
    ) => ({
      funder: funderWallet.publicKey,
      treasury,
      claimInfo,
      proofOfInclusion,
      signedMessage,
    })
    beforeAll(async () => {
      const mintAndTreasury =
        await deployerTokenDispenserProvider.setupMintAndTreasury()
      mint = mintAndTreasury.mint
      treasury = mintAndTreasury.treasury
    }, 10000)

    it('initializes the token dispenser', async () => {
      const [_, configBump] = deployerTokenDispenserProvider.getConfigPda()
      await deployerTokenDispenserProvider.initialize(
        root,
        mint.publicKey,
        dispenserGuard,
        [treasury],
        [funderWallet.publicKey],
        maxAmount
      )

      const configAccount = await deployerTokenDispenserProvider.getConfig()

      expect(configAccount.bump).toEqual(configBump)
      expect(configAccount.merkleRoot).toEqual(Array.from(root))
      expect(configAccount.mint).toEqual(mint.publicKey)
      expect(configAccount.dispenserGuard).toEqual(dispenserGuard)
      const lookupTableAddress = configAccount.addressLookupTable
      const lookupTableResp =
        await deployerTokenDispenserProvider.connection.getAddressLookupTable(
          lookupTableAddress
        )
      expect(lookupTableResp.value).toBeDefined()
      const lookupTableAddresses = lookupTableResp.value!.state.addresses.map(
        (a) => a.toBase58()
      )
      expect(
        lookupTableAddresses.includes(
          deployerTokenDispenserProvider.getConfigPda()[0].toBase58()
        )
      ).toBeTruthy()
      expect(lookupTableAddresses.includes(treasury.toBase58())).toBeTruthy()
      expect(
        lookupTableAddresses.includes(TOKEN_PROGRAM_ID.toBase58())
      ).toBeTruthy()
      expect(
        lookupTableAddresses.includes(SystemProgram.programId.toBase58())
      ).toBeTruthy()
      expect(
        lookupTableAddresses.includes(SYSVAR_INSTRUCTIONS_PUBKEY.toBase58())
      ).toBeTruthy()
      const { txnEvents } =
        await tokenDispenserEventSubscriber.parseTransactionLogs()
      expect(txnEvents.length).toEqual(1)
      // no events emitted in initialize
      expect(txnEvents[0].event).toBeUndefined()
    })

    it('submits an evm claim', async () => {
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'evm',
        testWallets.evm[0].address()
      ))!

      const signedMessage = await testWallets.evm[0].signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await Promise.all(
        await tokenDispenserProvider.submitClaims(
          [makeClaim(claimInfo, proofOfInclusion, signedMessage)],
          mockfetchFundTransaction,
          getTestClaimPayers(treasury)
        )
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(claimantFund.amount.eq(new anchor.BN(3000000))).toBeTruthy()

      // check event
      const { txnEvents } =
        await tokenDispenserEventSubscriber.parseTransactionLogs()
      expect(txnEvents.length).toEqual(2)
      expect(txnEvents[0].event).toBeDefined()
      const evmClaimEvent = txnEvents[0].event!
      expect(evmClaimEvent.claimant.equals(wallet.publicKey)).toBeTruthy()
      expect(evmClaimEvent.claimInfo.identity).toEqual({
        evm: {
          pubkey: Array.from(ethers.getBytes(testWallets.evm[0].address())),
        },
      })
      expect(
        new anchor.BN(evmClaimEvent.claimInfo.amount.toString()).eq(
          claimInfo.amount
        )
      ).toBeTruthy()
      expectedTreasuryBalance = expectedTreasuryBalance.sub(claimInfo.amount)
      const eventRemainingBalance = new anchor.BN(
        evmClaimEvent.remainingBalance.toString()
      )
      expect(
        new anchor.BN(evmClaimEvent.remainingBalance.toString()).eq(
          expectedTreasuryBalance
        )
      ).toBeTruthy()
    }, 40000)

    it('submits a terra claim', async () => {
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'terra',
        testWallets.terra[0].address()
      ))!

      const signedMessage = await testWallets.terra[0].signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await Promise.all(
        await tokenDispenserProvider.submitClaims(
          [makeClaim(claimInfo, proofOfInclusion, signedMessage)],
          mockfetchFundTransaction,
          getTestClaimPayers(treasury)
        )
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(
        claimantFund.amount.eq(new anchor.BN(3000000 + 7000000))
      ).toBeTruthy()

      const { txnEvents } =
        await tokenDispenserEventSubscriber.parseTransactionLogs()
      expect(txnEvents.length).toEqual(3)
      expect(txnEvents[0].event).toBeDefined()
      const cosmClaimEvent = txnEvents[0].event!
      expect(cosmClaimEvent.claimant.equals(wallet.publicKey)).toBeTruthy()
      expect(cosmClaimEvent.claimInfo.identity).toEqual({
        cosmwasm: { address: testWallets.terra[0].address() },
      })
      expect(
        new anchor.BN(cosmClaimEvent.claimInfo.amount.toString()).eq(
          claimInfo.amount
        )
      ).toBeTruthy()
      expectedTreasuryBalance = expectedTreasuryBalance.sub(claimInfo.amount)
      expect(
        new anchor.BN(cosmClaimEvent.remainingBalance.toString()).eq(
          expectedTreasuryBalance
        )
      ).toBeTruthy()
    }, 40000)

    it('submits multiple claims at once', async () => {
      const wallets = {
        injective: testWallets.injective[0],
        osmosis: testWallets.osmosis[0],
      }

      const claims = await Promise.all(
        Object.entries(wallets).map(async ([ecosystem, wallet]) => {
          const { claimInfo, proofOfInclusion } =
            (await mockFetchAmountAndProof(
              ecosystem as Ecosystem,
              wallet.address()
            ))!
          return makeClaim(
            claimInfo,
            proofOfInclusion,
            await wallet.signMessage(
              tokenDispenserProvider.generateAuthorizationPayload()
            )
          )
        })
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[0].claimInfo
        )
      ).toBeFalsy()

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[1].claimInfo
        )
      ).toBeFalsy()

      await Promise.all(
        await tokenDispenserProvider.submitClaims(
          claims,
          mockfetchFundTransaction,
          getTestClaimPayers(treasury)
        )
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[0].claimInfo
        )
      ).toBeTruthy()

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[1].claimInfo
        )
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(
        claimantFund.amount.eq(
          new anchor.BN(3000000 + 7000000 + 8000000 + 9000000)
        )
      ).toBeTruthy()
    })

    it('submits an aptos claim', async () => {
      const wallet = testWallets.aptos[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'aptos',
        wallet.address()
      ))!
      const signedMessage = await wallet.signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await Promise.all(
        await tokenDispenserProvider.submitClaims(
          [makeClaim(claimInfo, proofOfInclusion, signedMessage)],
          mockfetchFundTransaction,
          getTestClaimPayers(treasury)
        )
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(
        claimantFund.amount.eq(
          new anchor.BN(3000000 + 7000000 + 8000000 + 9000000 + 6000000)
        )
      ).toBeTruthy()
    })

    it('submits a discord claim', async () => {
      const wallet = testWallets.discord[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'discord',
        wallet.address()
      ))!

      expect(wallet instanceof DiscordTestWallet).toBeTruthy()
      if (wallet instanceof DiscordTestWallet) {
        const signedMessage = await wallet.signDiscordMessage(
          claimInfo.identity,
          tokenDispenserProvider.claimant
        )

        await Promise.all(
          await tokenDispenserProvider.submitClaims(
            [makeClaim(claimInfo, proofOfInclusion, signedMessage)],
            mockfetchFundTransaction,
            getTestClaimPayers(treasury)
          )
        )

        expect(
          await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
        ).toBeTruthy()

        const claimantFundPubkey =
          await tokenDispenserProvider.getClaimantFundAddress()

        const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

        expect(
          claimantFund.amount.eq(
            new anchor.BN(
              3000000 + 7000000 + 8000000 + 9000000 + 6000000 + 1000000
            )
          )
        ).toBeTruthy()
      }
    })

    it('submits a solana claim', async () => {
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'solana',
        tokenDispenserProvider.claimant.toBase58()
      ))!

      // No signing since claimant will sign the transaction

      await Promise.all(
        await tokenDispenserProvider.submitClaims(
          [makeClaim(claimInfo, proofOfInclusion, undefined)],
          mockfetchFundTransaction,
          getTestClaimPayers(treasury)
        )
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(
        claimantFund.amount.eq(
          new anchor.BN(
            3000000 + 7000000 + 8000000 + 9000000 + 6000000 + 1000000 + 2000000
          )
        )
      ).toBeTruthy()
    }, 40000)

    it('submits a sui claim', async () => {
      const wallet = testWallets.sui[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'sui',
        wallet.address()
      ))!
      const signedMessage = await wallet.signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await Promise.all(
        await tokenDispenserProvider.submitClaims(
          [makeClaim(claimInfo, proofOfInclusion, signedMessage)],
          mockfetchFundTransaction,
          getTestClaimPayers(treasury)
        )
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(
        claimantFund.amount.eq(
          new anchor.BN(
            3000000 +
              7000000 +
              8000000 +
              9000000 +
              6000000 +
              1000000 +
              2000000 +
              4000000
          )
        )
      ).toBeTruthy()
    }, 40000)

    it('fails to submit a duplicate claim', async () => {
      const wallet = testWallets.sui[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'sui',
        wallet.address()
      ))!
      const signedMessage = await wallet.signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      const res = await Promise.all(
        await tokenDispenserProvider.submitClaims(
          [makeClaim(claimInfo, proofOfInclusion, signedMessage)],
          mockfetchFundTransaction,
          getTestClaimPayers(treasury)
        )
      )
      expect(JSON.stringify(res[0]).includes('InstructionError')).toBeTruthy()
    })

    it('eventSubscriber parses error transaction logs', async () => {
      const { txnEvents, failedTxnInfos } =
        await tokenDispenserEventSubscriber.parseTransactionLogs()
      expect(failedTxnInfos.length).toEqual(1)
    }, 40000)
  })
})
