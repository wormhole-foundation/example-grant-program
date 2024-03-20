import { Keypair, PublicKey } from '@solana/web3.js'
import { getSecret } from '../utils'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { isAccessTokenValid, signDiscordDigest } from '../utils/discord'

interface DiscordSignedDigestRequest {
  publicKey: string
  discordId: string
}

export const signDiscordMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body!) as DiscordSignedDigestRequest
    const { publicKey, discordId } = requestBody

    const accessToken = event.headers['x-auth-token']

    validatePublicKey(publicKey)
    validateAccessTokenAndDiscordId(accessToken, discordId)

    await isAccessTokenValid(discordId, accessToken!)

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
  } catch (err) {
    console.error('Error generating signed discord digest', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

async function loadDispenserGuard() {
  // TODO: Update secret name based on the secret you created in the AWS Secrets Manager
  const secretData = await getSecret(
    process.env.DISPENSER_KEY_SECRET_NAME ?? 'xl-dispenser-guard-key'
  )
  const dispenserGuardKey = secretData.key

  const dispenserGuard = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(dispenserGuardKey))
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

function validateAccessTokenAndDiscordId(
  AccessToken?: string,
  discordId?: string
) {
  if (!AccessToken) {
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
}
