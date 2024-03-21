import { Keypair, PublicKey } from '@solana/web3.js'
import { getDispenserKey } from '../utils/secrets'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { isAccessTokenValid, signDiscordDigest } from '../utils/discord'

export interface DiscordSignedDigestRequest {
  publicKey: string
  discordId?: string
}

export const signDiscordMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // TODO: no need to receive disordId really, as we should can just get it using the auth token.
    // TODO: publicKey was expected as query param in pyth version
    const { publicKey, discordId } = JSON.parse(
      event.body ?? '{}'
    ) as DiscordSignedDigestRequest
    validatePublicKey(publicKey)

    const accessToken = event.headers['x-auth-token']

    await validateAccessTokenAndDiscordId(accessToken, discordId!)

    const claimant = new PublicKey(publicKey!)
    const dispenserGuard = await loadDispenserGuard()

    const signedDigest = signDiscordDigest(discordId!, claimant, dispenserGuard)

    return {
      statusCode: 200,
      body: JSON.stringify({
        signature: Buffer.from(signedDigest.signature).toString('hex'),
        publicKey: Buffer.from(signedDigest.publicKey).toString('hex'), // The dispenser guard's public key
        fullMessage: Buffer.from(signedDigest.fullMessage).toString('hex')
      })
    }
  } catch (err) {
    console.error('Error generating signed discord digest', err)
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
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Must provide the 'publicKey' query parameter"
      })
    }
  }

  if (typeof publicKey !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid 'publicKey' query parameter" })
    }
  }

  try {
    new PublicKey(publicKey)
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid 'publicKey' query parameter" })
    }
  }
}

async function validateAccessTokenAndDiscordId(
  accessToken?: string,
  discordId?: string
) {
  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Must provide discord auth token' })
    }
  }

  if (!discordId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Must provide discord id' })
    }
  }

  try {
    await isAccessTokenValid(discordId, accessToken!)
  } catch (err) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Invalid discord access token' })
    }
  }
}
