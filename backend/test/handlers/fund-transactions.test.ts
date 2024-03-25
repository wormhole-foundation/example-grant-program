import { afterEach, beforeAll, describe, expect, test } from '@jest/globals'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { fundTransactions } from '../../src/handlers/fund-transactions'
import {
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'

const PROGRAM_ID = new Keypair().publicKey
const FUNDER_KEY = new Keypair()
let server = setupServer()
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

  test('should return signed message', async () => {
    givenDownstreamServicesWork()
    givenRequest()

    await whenFundTransactionsCalled()

    thenResponseIsSuccessful()
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

const givenRequest = () => {
  input = [
    new VersionedTransaction(
      new TransactionMessage({
        instructions: [
          new TransactionInstruction({ programId: PROGRAM_ID, keys: [] })
        ],
        payerKey: FUNDER_KEY.publicKey,
        recentBlockhash: 'HXq5QPm883r7834LWwDpcmEM8G8uQ9Hqm1xakCHGxprV'
      }).compileToV0Message()
    )
  ]
}

const whenFundTransactionsCalled = async () => {
  response = await fundTransactions({
    body: JSON.stringify(input.map((tx) => Buffer.from(tx.serialize())))
  } as any as APIGatewayProxyEvent)
}

const thenResponseIsSuccessful = () => {
  expect(response.statusCode).toBe(200)
  const signedTxs = JSON.parse(response.body!)
  expect(signedTxs).toHaveLength(1)
  const tx = VersionedTransaction.deserialize(Buffer.from(signedTxs[0]))
  expect(tx.message.recentBlockhash).toBe(input[0].message.recentBlockhash)
}
