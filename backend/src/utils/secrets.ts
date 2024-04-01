// Note: layers code that is shared across lambda functions
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager'
import config from '../config'
import { Keypair } from '@solana/web3.js';

const client = new SecretsManagerClient({ region: config.aws.region })

interface SecretPrivateKeys {
  keys: string;
}

export async function getDispenserKey() {
  let key: string
  if (config.keys.dispenserGuard.key) {
    console.log('Using dispenser guard key from config')
    key = config.keys.dispenserGuard.key
  }

  key = await getSecretKey(config.keys.dispenserGuard.secretName, 'key')
  return { key: JSON.parse(key) }
}

export async function getFundingKeys(): Promise<Keypair[]> {
  const secret = await getSecret(config.keys.funding.secretName) as SecretPrivateKeys
  const keys = JSON.parse(secret.keys) as number[][]
  return keys.map((key => Keypair.fromSecretKey(Uint8Array.from(key))))
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
