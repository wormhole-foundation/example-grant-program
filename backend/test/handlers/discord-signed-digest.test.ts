import { afterEach, beforeAll, describe, expect, test } from '@jest/globals'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import config from '../../src/config'
import {
  DiscordSignedDigestRequest,
  signDiscordMessage
} from '../../src/handlers/discord-signed-digest'
import { Keypair } from '@solana/web3.js'

let server = setupServer()
let input: DiscordSignedDigestRequest
let response: APIGatewayProxyResult

describe('DiscordSignedDigest', () => {
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
        SecretString: JSON.stringify({ key: [...new Keypair().secretKey] })
      })
    })
  )
  server.listen()
}

const givenRequest = () => {
  input = {
    publicKey: new Keypair().publicKey.toString()
  }
}

const whenSignDiscordMessageCalled = async (
  body: DiscordSignedDigestRequest
) => {
  response = await signDiscordMessage({
    body: JSON.stringify(body),
    headers: { 'x-auth-token': 'token' }
  } as any as APIGatewayProxyEvent)
}

const thenResponseIsSuccessful = () => {
  expect(response.statusCode).toBe(200)
  expect(response.body).toBeDefined()
  expect(JSON.parse(response.body!)).toHaveProperty('signature')
  expect(JSON.parse(response.body!)).toHaveProperty('publicKey')
  expect(JSON.parse(response.body!)).toHaveProperty('fullMessage')
}
