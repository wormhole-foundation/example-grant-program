// Note: layers code that is shared across lambda functions
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager'
import config from '../config'

const client = new SecretsManagerClient({ region: config.aws.region })

export async function getDispenserKey() {
  if (config.keys.dispenserGuard.key) {
    console.log('Using dispenser guard key from config')
    return { key: JSON.parse(config.keys.dispenserGuard.key) }
  }

  return getSecret(config.keys.dispenserGuard.secretName)
}

export async function getFundingKey() {
  if (config.keys.funding.key) {
    console.log('Using funding key from config')
    return { key: JSON.parse(config.keys.funding.key) }
  }

  return getSecret(config.keys.funding.secretName)
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
