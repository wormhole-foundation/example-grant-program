import { afterEach, beforeAll, describe, expect, test } from '@jest/globals'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
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
import { extractCallData } from '../../src/utils/fund-transactions'
import { AnchorProvider, IdlTypes, Program, BN } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { IDL, TokenDispenser } from '../../src/token-dispenser'
import { fundTransactions } from '../../src/handlers/fund-transactions'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { InfluxDB } from '@influxdata/influxdb-client'

const RANDOM_BLOCKHASH = 'HXq5QPm883r7834LWwDpcmEM8G8uQ9Hqm1xakCHGxprV'
const INFLUX_TOKEN =
  'jsNTEHNBohEjgKqWj1fR8fJjYlBvcYaRTY68-iQ5Y55X_Qr3VKGSvqJz78g4jV8mPiUTQLPYq2tLs_Dy8M--nw=='
const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')
const FUNDER_KEY = new Keypair()
const server = setupServer()
const influx = new GenericContainer('influxdb')

let input: VersionedTransaction[]
let response: APIGatewayProxyResult

describe('fundTransactions integration test', () => {
  let startedInflux: StartedTestContainer

  beforeAll(async () => {
    startedInflux = await influx
      .withExposedPorts(8086)
      .withEnvironment({
        DOCKER_INFLUXDB_INIT_MODE: 'setup',
        DOCKER_INFLUXDB_INIT_USERNAME: 'admin',
        DOCKER_INFLUXDB_INIT_PASSWORD: 'password',
        DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: INFLUX_TOKEN,
        DOCKER_INFLUXDB_INIT_ORG: 'xl',
        DOCKER_INFLUXDB_INIT_BUCKET: 'ad'
      })
      .start()
    process.env.INFLUXDB_ORG = 'xl'
    process.env.INFLUXDB_BUCKET = 'ad'
    process.env.INFLUXDB_TOKEN = INFLUX_TOKEN
    process.env.INFLUXDB_URL = `http://${startedInflux.getHost()}:${startedInflux.getMappedPort(
      8086
    )}`
    process.env.INFLUXDB_FLUSH_ENABLED = 'true'

    process.env.FUNDING_WALLET_KEY = `[${FUNDER_KEY.secretKey}]`
    process.env.TOKEN_DISPENSER_PROGRAM_ID = PROGRAM_ID.toString()
  }, 20_000)

  afterAll(async () => {
    await startedInflux.stop()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  test('should pass if all required instructions included', async () => {
    givenDownstreamServicesWork()
    await givenCorrectTransaction()

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

  test('should extract claim info', async () => {
    const versionedTx = createTestTransactionFromInstructions([
      await createTokenDispenserProgramInstruction()
    ])

    const callData = extractCallData(versionedTx, PROGRAM_ID.toBase58())

    expect(callData).not.toBeNull()
    expect(callData?.amount.toNumber()).toBe(3000000)
    expect(callData?.proofOfInclusion).toBeDefined()
    expect(callData?.proofOfIdentity.discord?.username).toBe('username')
  })

  test('should persist signed claims', async () => {
    givenDownstreamServicesWork()
    await givenCorrectTransaction()

    await whenFundTransactionsCalled()

    thenResponseIsSuccessful()
    await thenDataIsAvailable()
  })
})

/**
 * mocks aws secrets manager responses
 */
const givenDownstreamServicesWork = () => {
  server.use(
    http.all('https://secretsmanager.us-east-2.amazonaws.com', () => {
      return HttpResponse.json({
        SecretString: JSON.stringify({ key: `[${[...FUNDER_KEY.secretKey]}]` })
      })
    })
  )
  server.listen({ onUnhandledRequest: 'bypass' })
}

const givenCorrectTransaction = async () => {
  const tokenDispenserInstruction =
    await createTokenDispenserProgramInstruction()

  const instructions = [
    tokenDispenserInstruction,
    createComputeUnitLimitInstruction(200),
    createComputeUnitPriceInstruction(BigInt(5000)),
    createSecp256k1ProgramInstruction()
  ]

  input = [createTestTransactionFromInstructions(instructions)]
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

const thenDataIsAvailable = async () => {
  let found = 0
  const reader = new InfluxDB({
    url: process.env.INFLUXDB_URL!,
    token: process.env.INFLUXDB_TOKEN!
  }).getQueryApi(process.env.INFLUXDB_ORG!)
  for await (const { values, tableMeta } of reader.iterateRows(
    'from(bucket: "ad") |> range(start:0) |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")'
  )) {
    const row = tableMeta.toObject(values)
    expect(row).toHaveProperty('amount', 3000000)
    expect(row).toHaveProperty('type', 'transaction_signed')
    expect(row).toHaveProperty('ecosystem', 'discord')
    expect(row).toHaveProperty('subecosystem', 'discord')
    expect(row).toHaveProperty('sig', expect.any(String))
    found++
  }
  expect(found).toBeGreaterThan(1)
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
    IDL,
    PROGRAM_ID,
    new AnchorProvider(
      new Connection('http://localhost:8899'),
      new NodeWallet(new Keypair()),
      AnchorProvider.defaultOptions()
    )
  )

  const claimCert: IdlTypes<TokenDispenser>['ClaimCertificate'] = {
    amount: new BN(3000000),
    proofOfIdentity: {
      discord: { username: 'username', verificationInstructionIndex: 0 }
    },
    proofOfInclusion: []
  }

  const tokenDispenserInstruction = await tokenDispenser.methods
    .claim(claimCert)
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
    privateKey: Keypair.generate().secretKey.slice(0, 32),
    message: Buffer.from('hello')
  })
}

const createEd25519ProgramInstruction = () => {
  return Ed25519Program.createInstructionWithPrivateKey({
    privateKey: new Keypair().secretKey,
    message: Buffer.from('hello')
  })
}
