// Note: layers code that is shared across lambda functions
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager'
import config from '../config'

const client = new SecretsManagerClient({ region: config.aws.region })

export async function getSecret(secretName: string) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)
    if (response.SecretString) {
      return JSON.parse(response.SecretString)
    } else if (response.SecretBinary) {
      // For binary secrets, use Buffer to decode
      const buff = Buffer.from(response.SecretBinary.toString(), 'base64')
      return JSON.parse(buff.toString('ascii'))
    }
  } catch (err) {
    console.error(`Error getting secret: ${secretName}`, err)
    throw err
  }
}
