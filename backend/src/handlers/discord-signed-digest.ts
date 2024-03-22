import { Keypair, PublicKey } from '@solana/web3.js'
import { getDispenserKey } from '../utils/secrets'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getDiscordUser, signDiscordDigest } from '../utils/discord'
import { HandlerError } from '../utils/errors'

export interface DiscordSignedDigestParams {
  publicKey: string
}

export const signDiscordMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const publicKey = (event.queryStringParameters ?? {})['publicKey']
    validatePublicKey(publicKey)

    const accessToken = event.headers['x-auth-token']
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
  const secretData = await getDispenserKey()
  const dispenserGuardKey = secretData.key

  const dispenserGuard = Keypair.fromSecretKey(
    Uint8Array.from(dispenserGuardKey)
  )

  return dispenserGuard
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

async function getDiscordId(accessToken?: string) {
  if (!accessToken) {
    throw new HandlerError(400, { error: 'Must provide discord auth token' })
  }

  try {
    const user = await getDiscordUser(accessToken)
    return user.id
  } catch (err) {
    throw new HandlerError(403, { error: 'Invalid discord access token' })
  }
}
