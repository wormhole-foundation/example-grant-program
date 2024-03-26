import { afterEach, beforeAll, describe, expect, test } from '@jest/globals'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import config from '../../src/config'
import {
  DiscordSignedDigestParams,
  signDiscordMessage
} from '../../src/handlers/discord-signed-digest'
import { Keypair } from '@solana/web3.js'

const server = setupServer()
let input: DiscordSignedDigestParams
let response: APIGatewayProxyResult

describe('signDiscordMessage integration test', () => {
  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = 'key'
    process.env.AWS_SECRET_ACCESS_KEY = 'secret'
  })

  afterEach(() => {
    server.resetHandlers()
  })

  test('should return signed message', async () => {
    givenDownstreamServicesWork()
    givenRequest()

    await whenSignDiscordMessageCalled(input)

    thenResponseIsSuccessful()
  })

  test('should return 400 when pubKey is not sent', async () => {
    givenRequest('') // will endup sending no pubKey

    await whenSignDiscordMessageCalled(input)

    expect(response.statusCode).toBe(400)
  })

  test('should return 400 when pubKey is invalid', async () => {
    givenRequest('invalidPubKey')

    await whenSignDiscordMessageCalled(input)

    expect(response.statusCode).toBe(400)
  })
})

/**
 * mocks discord and aws secrets manager responses
 */
const givenDownstreamServicesWork = () => {
  server.use(
    http.get(`${config.discord.baseUrl}/api/users/@me`, () => {
      return HttpResponse.json({
        id: '80351110224678912',
        username: 'Alice',
        discriminator: '1337'
      })
    }),
    http.all('https://secretsmanager.us-east-2.amazonaws.com', () => {
      return HttpResponse.json({
        SecretString: JSON.stringify({ key: `[${new Keypair().secretKey}]` })
      })
    })
  )
  server.listen()
}

const givenRequest = (pubKey?: string) => {
  input = {
    publicKey:
      pubKey === '' ? undefined : pubKey ?? new Keypair().publicKey.toString()
  } as DiscordSignedDigestParams
}

const whenSignDiscordMessageCalled = async (
  queryParams: DiscordSignedDigestParams
) => {
  response = await signDiscordMessage({
    queryStringParameters: queryParams,
    headers: { Authorization: 'Bearer token' }
  } as unknown as APIGatewayProxyEvent)
}

const thenResponseIsSuccessful = () => {
  expect(response.statusCode).toBe(200)
  expect(response.body).toBeDefined()
  expect(JSON.parse(response.body!)).toHaveProperty('signature')
  expect(JSON.parse(response.body!)).toHaveProperty('publicKey')
  expect(JSON.parse(response.body!)).toHaveProperty('fullMessage')
}
