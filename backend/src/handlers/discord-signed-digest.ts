import { Keypair, PublicKey } from '@solana/web3.js'
import { getDispenserKey } from '../utils/secrets'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getDiscordUser, signDiscordDigest } from '../utils/discord'
import { HandlerError } from '../utils/errors'

export interface DiscordSignedDigestParams {
  publicKey: string
}

let guardKeyPair: Keypair

export const signDiscordMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const publicKey = (event.queryStringParameters ?? {})['publicKey']
    validatePublicKey(publicKey)

    const accessToken = event.headers['Authorization']
    const discordId = await getDiscordId(accessToken)

    const claimant = new PublicKey(publicKey!)
    const dispenserGuard = await loadDispenserGuard()

    const signedDigest = signDiscordDigest(discordId, claimant, dispenserGuard)

    return {
      statusCode: 200,
      body: JSON.stringify({
        signature: Buffer.from(signedDigest.signature).toString('hex'),
        publicKey: Buffer.from(signedDigest.publicKey).toString('hex'), // The dispenser guard's public key
        fullMessage: Buffer.from(signedDigest.fullMessage).toString('hex')
      })
    }
  } catch (err: HandlerError | unknown) {
    console.error('Error generating signed discord digest', err)
    if (err instanceof HandlerError) {
      return {
        statusCode: err.statusCode,
        body: JSON.stringify(err.body)
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

async function loadDispenserGuard() {
  if (guardKeyPair) {
    return guardKeyPair
  }

  const secretData = await getDispenserKey()
  const dispenserGuardKey = secretData.key

  const dispenserGuard = Keypair.fromSecretKey(
    Uint8Array.from(dispenserGuardKey)
  )

  guardKeyPair = dispenserGuard
  console.log('Loaded dispenser guard key')
  return guardKeyPair
}

function validatePublicKey(publicKey?: string) {
  if (!publicKey) {
    throw new HandlerError(400, {
      error: "Must provide the 'publicKey' query parameter"
    })
  }

  if (typeof publicKey !== 'string') {
    throw new HandlerError(400, {
      error: "Invalid 'publicKey' query parameter"
    })
  }

  try {
    new PublicKey(publicKey)
  } catch {
    throw new HandlerError(400, {
      error: "Invalid 'publicKey' query parameter"
    })
  }
}

async function getDiscordId(tokenHeaderValue?: string) {
  if (!tokenHeaderValue) {
    throw new HandlerError(403, { error: 'Must provide discord auth token' })
  }

  const tokenParts = tokenHeaderValue.split(' ')
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    throw new HandlerError(403, { error: 'Invalid authorization header' })
  }

  try {
    const user = await getDiscordUser(tokenParts[1])
    return user.id
  } catch (err) {
    throw new HandlerError(403, { error: 'Invalid discord access token' })
  }
}
