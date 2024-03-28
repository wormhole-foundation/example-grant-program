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
import { extractCallData } from '../../src/utils/fund-transactions'

const PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS' //new Keypair().publicKey
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

  test.only('should extract claim info', async () => {
    const x = VersionedTransaction.deserialize(serialedSignedOnceEvmClaimTx)

    const found = x.message.compiledInstructions.find(
      (i) =>
        x.message.staticAccountKeys[i.programIdIndex].toBase58() === PROGRAM_ID
    )
    const callData = extractCallData(x, PROGRAM_ID)
    console.log(callData)

    expect(callData).not.toBeNull()
    expect(callData.name).toBe('claim')
    expect(callData.data.claimCertificate.amount.toNumber()).toBe(3000000)
    expect(callData?.data.claimCertificate.proofOfInclusion).toBeDefined()
    expect(
      Buffer.from(
        callData.data.claimCertificate.proofOfIdentity.evm.pubkey
      ).toString('hex')
    ).toBe('b80eb09f118ca9df95b2df575f68e41ac7b9e2f8')

    expect(found).toBeDefined()
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

/**
 *
 * JSON.stringify(claimInfo)
 * '{"ecosystem":"evm","identity":"0xb80eb09f118ca9df95b2df575f68e41ac7b9e2f8","amount":"2dc6c0"}'
 * JSON.stringify(proofOfInclusion)
 * '[[0,85,165,191,92,119,130,34,61,26,158,210,214,153,226,137,155,183,3,99],[229,163,97,168,48,117,76,185,244,168,62,129,73,137,137,90,173,216,206,210],[140,236,51,115,81,124,212,64,246,44,113,251,122,212,33,53,42,92,222,112],[28,69,23,62,87,211,157,249,83,121,168,178,199,53,205,162,18,193,8,6]]'
 */
const serialedSignedOnceEvmClaimTx = Uint8Array.from([
  2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 34, 1, 197, 79, 108, 160, 223, 45,
  236, 34, 216, 129, 237, 101, 15, 109, 180, 204, 76, 99, 87, 142, 98, 93, 87,
  117, 101, 163, 146, 161, 43, 180, 191, 224, 251, 187, 232, 87, 46, 153, 228,
  175, 247, 125, 255, 254, 96, 136, 5, 177, 86, 33, 163, 36, 213, 149, 130, 72,
  4, 252, 63, 34, 5, 128, 2, 1, 3, 7, 30, 119, 201, 38, 51, 176, 207, 221, 193,
  222, 235, 244, 163, 250, 125, 66, 68, 196, 45, 208, 212, 201, 232, 178, 100,
  163, 24, 21, 106, 83, 66, 174, 155, 123, 158, 253, 193, 104, 240, 64, 146, 99,
  29, 11, 36, 179, 197, 27, 230, 135, 92, 254, 214, 38, 39, 148, 146, 117, 160,
  142, 58, 36, 50, 145, 136, 129, 220, 63, 156, 186, 207, 151, 103, 32, 111,
  158, 28, 225, 44, 198, 161, 39, 21, 240, 31, 100, 125, 105, 73, 48, 65, 140,
  82, 216, 96, 205, 229, 4, 138, 111, 250, 79, 206, 121, 204, 172, 251, 189,
  226, 13, 40, 248, 204, 203, 161, 244, 46, 143, 70, 195, 149, 243, 156, 179,
  22, 201, 44, 160, 4, 198, 252, 32, 240, 80, 204, 240, 85, 132, 215, 33, 28,
  159, 140, 245, 158, 193, 71, 133, 187, 22, 106, 30, 40, 48, 232, 18, 32, 0, 0,
  0, 218, 7, 92, 178, 255, 94, 198, 129, 118, 19, 222, 83, 11, 105, 42, 135, 53,
  71, 119, 105, 218, 71, 67, 12, 189, 129, 84, 51, 92, 74, 131, 39, 3, 6, 70,
  111, 229, 33, 23, 50, 255, 236, 173, 186, 114, 195, 155, 231, 188, 140, 229,
  187, 197, 247, 18, 107, 44, 67, 155, 58, 64, 0, 0, 0, 39, 230, 229, 205, 37,
  151, 231, 95, 84, 49, 60, 71, 233, 161, 128, 19, 206, 255, 26, 207, 228, 53,
  179, 118, 102, 49, 206, 99, 213, 230, 34, 141, 3, 4, 0, 151, 2, 1, 32, 0, 0,
  12, 0, 0, 97, 0, 182, 0, 0, 184, 14, 176, 159, 17, 140, 169, 223, 149, 178,
  223, 87, 95, 104, 228, 26, 199, 185, 226, 248, 156, 153, 118, 241, 244, 168,
  39, 253, 26, 71, 201, 208, 176, 76, 148, 46, 129, 155, 107, 68, 2, 232, 95, 6,
  177, 218, 161, 194, 228, 3, 131, 88, 66, 19, 183, 133, 200, 71, 240, 101, 97,
  107, 73, 0, 41, 107, 222, 192, 115, 89, 181, 52, 3, 193, 170, 59, 222, 1, 97,
  151, 205, 125, 11, 157, 0, 25, 69, 116, 104, 101, 114, 101, 117, 109, 32, 83,
  105, 103, 110, 101, 100, 32, 77, 101, 115, 115, 97, 103, 101, 58, 10, 49, 53,
  51, 87, 32, 65, 105, 114, 100, 114, 111, 112, 32, 80, 73, 68, 58, 10, 70, 103,
  54, 80, 97, 70, 112, 111, 71, 88, 107, 89, 115, 105, 100, 77, 112, 87, 84, 75,
  54, 87, 50, 66, 101, 90, 55, 70, 69, 102, 99, 89, 107, 103, 52, 55, 54, 122,
  80, 70, 115, 76, 110, 83, 10, 73, 32, 97, 117, 116, 104, 111, 114, 105, 122,
  101, 32, 83, 111, 108, 97, 110, 97, 32, 119, 97, 108, 108, 101, 116, 10, 66,
  84, 119, 88, 81, 90, 83, 51, 69, 122, 102, 120, 66, 107, 118, 50, 65, 53, 52,
  101, 115, 116, 109, 110, 57, 89, 98, 109, 99, 112, 109, 82, 87, 101, 70, 80,
  52, 102, 51, 97, 118, 76, 105, 52, 10, 116, 111, 32, 99, 108, 97, 105, 109,
  32, 109, 121, 32, 87, 32, 116, 111, 107, 101, 110, 115, 46, 10, 5, 11, 0, 1,
  2, 8, 9, 7, 10, 11, 12, 13, 3, 122, 62, 198, 214, 193, 213, 159, 108, 210,
  192, 198, 45, 0, 0, 0, 0, 0, 1, 184, 14, 176, 159, 17, 140, 169, 223, 149,
  178, 223, 87, 95, 104, 228, 26, 199, 185, 226, 248, 0, 4, 0, 0, 0, 0, 85, 165,
  191, 92, 119, 130, 34, 61, 26, 158, 210, 214, 153, 226, 137, 155, 183, 3, 99,
  229, 163, 97, 168, 48, 117, 76, 185, 244, 168, 62, 129, 73, 137, 137, 90, 173,
  216, 206, 210, 140, 236, 51, 115, 81, 124, 212, 64, 246, 44, 113, 251, 122,
  212, 33, 53, 42, 92, 222, 112, 28, 69, 23, 62, 87, 211, 157, 249, 83, 121,
  168, 178, 199, 53, 205, 162, 18, 193, 8, 6, 6, 0, 5, 2, 64, 13, 3, 0, 1, 84,
  177, 216, 124, 205, 44, 255, 179, 192, 92, 144, 74, 30, 201, 136, 65, 246,
  153, 117, 74, 63, 158, 165, 244, 18, 9, 203, 219, 255, 234, 210, 53, 1, 2, 6,
  0, 1, 3, 4, 5, 6
])
