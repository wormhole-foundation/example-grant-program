// Note: layers code that is shared across lambda functions
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager'
import config from '../config'

const client = new SecretsManagerClient({ region: config.aws.region })

export async function getDispenserKey() {
  let key: string
  if (config.secrets.dispenserGuard.key) {
    console.log('Using dispenser guard key from config')
    key = config.secrets.dispenserGuard.key
  } else {
    key = await getSecretKey(config.secrets.dispenserGuard.secretName, 'key')
  }

  return { key: JSON.parse(key) }
}

export async function getFundingKey(): Promise<{ key: Uint8Array }> {
  let key: string
  if (config.secrets.funding.key()) {
    console.log('Using funding key from config')
    key = config.secrets.funding.key()!
  } else {
    key = await getSecretKey(config.secrets.funding.secretName, 'key')
  }

  return { key: JSON.parse(key) }
}

export async function getInfluxToken(): Promise<string> {
  let key: string
  if (config.secrets.influx.key()) {
    console.log('Using influx token from config')
    key = config.secrets.influx.key()!
  } else {
    key = await getSecretKey(config.secrets.influx.secretName, 'key')
  }

  return key
}

export async function getSecretKey(secretName: string, keyName: string) {
  const secret = await getSecret(secretName)
  return secret[keyName]
}

export async function getSecret(secretName: string) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)
    if (response.SecretString) {
      console.log(
        `Retrieved secret: ${secretName}. ${response.SecretString.length} characters long`
      )
      return JSON.parse(response.SecretString)
    } else if (response.SecretBinary) {
      console.log(
        `Retrieved binary secret: ${secretName}. ${response.SecretBinary.length} characters long`
      )
      // For binary secrets, use Buffer to decode
      const buff = Buffer.from(response.SecretBinary.toString(), 'base64')
      return JSON.parse(buff.toString('ascii'))
    }
  } catch (err) {
    console.error(`Error getting secret: ${secretName}`, err)
    throw err
  }
}
