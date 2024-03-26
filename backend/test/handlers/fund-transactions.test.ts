import { afterEach, beforeAll, describe, expect, test } from '@jest/globals'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { ethers } from 'ethers'
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
  VersionedTransaction
} from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import IDL from '../../src/token-dispenser.json'
import { fundTransactions } from '../../src/handlers/fund-transactions'

const RANDOM_BLOCKHASH = 'HXq5QPm883r7834LWwDpcmEM8G8uQ9Hqm1xakCHGxprV'
const PROGRAM_ID = new Keypair().publicKey
const FUNDER_KEY = new Keypair()
const server = setupServer()
let input: VersionedTransaction[]
let response: APIGatewayProxyResult

describe('fundTransactions integration test', () => {
  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = 'key'
    process.env.AWS_SECRET_ACCESS_KEY = 'secret'
    process.env.TOKEN_DISPENSER_PROGRAM_ID = PROGRAM_ID.toString()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  test('should pass if all required instructions included', async () => {
    givenDownstreamServicesWork()

    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createComputeUnitLimitInstruction(200),
      createComputeUnitPriceInstruction(BigInt(5000)),
      createSecp256k1ProgramInstruction()
    ]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    thenResponseIsSuccessful()
  })

  test('should pass if compute unit limit not included', async () => {
    givenDownstreamServicesWork()

    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createComputeUnitPriceInstruction(BigInt(5000)),
      createSecp256k1ProgramInstruction()
    ]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    thenResponseIsSuccessful()
  })

  test('should pass if txn is not signed twice', async () => {
    givenDownstreamServicesWork()

    // to create below instruction, it requires to have a valid keypair
    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createComputeUnitPriceInstruction(BigInt(5000))
    ]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    thenResponseIsSuccessful()
  })

  test('should fail if compute unit price not set', async () => {
    givenDownstreamServicesWork()

    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createComputeUnitLimitInstruction(200),
      createSecp256k1ProgramInstruction()
    ]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    expect(response.statusCode).toBe(403)
  })

  test('should fail if transaction has too many signatures', async () => {
    givenDownstreamServicesWork()

    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createComputeUnitLimitInstruction(200),
      createComputeUnitPriceInstruction(BigInt(5000)),
      createSecp256k1ProgramInstruction(),
      createEd25519ProgramInstruction()
    ]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    expect(response.statusCode).toBe(403)
  })

  test('should fail if transaction does not have token dispenser instruction', async () => {
    givenDownstreamServicesWork()

    const instructions = [
      createComputeUnitLimitInstruction(200),
      createComputeUnitPriceInstruction(BigInt(5000)),
      createSecp256k1ProgramInstruction()
    ]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    expect(response.statusCode).toBe(403)
  })

  test('should fail if transaction does not contain any known instruction', async () => {
    givenDownstreamServicesWork()

    const instructions = [createSystemProgramInstruction()]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    expect(response.statusCode).toBe(403)
  })

  test('should fail if transaction does not contain whitelisted program id', async () => {
    givenDownstreamServicesWork()

    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createSystemProgramInstruction()
    ]

    input = [createTestTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    expect(response.statusCode).toBe(403)
  })

  test('should fail if legacy transaction is passed', async () => {
    givenDownstreamServicesWork()

    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createComputeUnitLimitInstruction(200),
      createComputeUnitPriceInstruction(BigInt(5000)),
      createSecp256k1ProgramInstruction()
    ]

    input = [createTestLegacyTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    expect(response.statusCode).toBe(403)
  })

  test('should fail if compute unit price set is incorrect', async () => {
    givenDownstreamServicesWork()

    const tokenDispenserInstruction =
      await createTokenDispenserProgramInstruction()

    const instructions = [
      tokenDispenserInstruction,
      createComputeUnitLimitInstruction(200),
      createComputeUnitPriceInstruction(BigInt(10000000)),
      createSecp256k1ProgramInstruction()
    ]

    input = [createTestLegacyTransactionFromInstructions(instructions)]

    await whenFundTransactionsCalled()

    expect(response.statusCode).toBe(403)
  })
})

/**
 * mocks aws secrets manager responses
 */
const givenDownstreamServicesWork = () => {
  server.use(
    http.all('https://secretsmanager.us-east-2.amazonaws.com', () => {
      return HttpResponse.json({
        SecretString: JSON.stringify({ key: [...FUNDER_KEY.secretKey] })
      })
    })
  )
  server.listen()
}

const whenFundTransactionsCalled = async () => {
  response = await fundTransactions({
    body: JSON.stringify(input.map((tx) => Buffer.from(tx.serialize())))
  } as unknown as APIGatewayProxyEvent)
}

const thenResponseIsSuccessful = () => {
  expect(response.statusCode).toBe(200)
  const signedTxs = JSON.parse(response.body!)
  expect(signedTxs).toHaveLength(1)
  const tx = VersionedTransaction.deserialize(Buffer.from(signedTxs[0]))
  expect(tx.message.recentBlockhash).toBe(input[0].message.recentBlockhash)
}

const createTestTransactionFromInstructions = (
  instructions: TransactionInstruction[]
) => {
  return new VersionedTransaction(
    new TransactionMessage({
      instructions,
      payerKey: FUNDER_KEY.publicKey,
      recentBlockhash: RANDOM_BLOCKHASH
    }).compileToV0Message()
  )
}

const createTestLegacyTransactionFromInstructions = (
  instructions: TransactionInstruction[]
) => {
  return new VersionedTransaction(
    new TransactionMessage({
      instructions,
      payerKey: FUNDER_KEY.publicKey,
      recentBlockhash: RANDOM_BLOCKHASH
    }).compileToLegacyMessage()
  )
}

const createTokenDispenserProgramInstruction = async () => {
  const tokenDispenser = new Program(
    IDL as any,
    PROGRAM_ID,
    new AnchorProvider(
      new Connection('http://localhost:8899'),
      new NodeWallet(new Keypair()),
      AnchorProvider.defaultOptions()
    )
  )

  const tokenDispenserInstruction = await tokenDispenser.methods
    .claim([])
    .accounts({
      funder: FUNDER_KEY.publicKey,
      claimant: PublicKey.unique(),
      claimantFund: PublicKey.unique(),
      config: PublicKey.unique(),
      mint: PublicKey.unique(),
      treasury: PublicKey.unique(),
      tokenProgram: PublicKey.unique(),
      systemProgram: PublicKey.unique(),
      sysvarInstruction: PublicKey.unique(),
      associatedTokenProgram: PublicKey.unique()
    })
    .instruction()

  return tokenDispenserInstruction
}

const createComputeUnitLimitInstruction = (computeUnitLimits: number) => {
  return ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimits })
}

const createComputeUnitPriceInstruction = (computeUnitPrice: bigint) => {
  return ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeUnitPrice
  })
}

const createSystemProgramInstruction = () => {
  return SystemProgram.transfer({
    fromPubkey: FUNDER_KEY.publicKey,
    toPubkey: PublicKey.unique(),
    lamports: 1000
  })
}

const createSecp256k1ProgramInstruction = () => {
  return Secp256k1Program.createInstructionWithPrivateKey({
    privateKey: Buffer.from(
      ethers.Wallet.createRandom().privateKey.slice(2),
      'hex'
    ),
    message: Buffer.from('hello')
  })
}

const createEd25519ProgramInstruction = () => {
  return Ed25519Program.createInstructionWithPrivateKey({
    privateKey: new Keypair().secretKey,
    message: Buffer.from('hello')
  })
}
