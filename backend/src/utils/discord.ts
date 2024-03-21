import { Keypair, PublicKey } from '@solana/web3.js'
import { SignedMessage } from '../types'
import nacl from 'tweetnacl'
import IDL from '../token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'
import config from '../config'

export async function getDiscordUser(
  token: string
): Promise<{ id: string; username: string }> {
  try {
    const url = config.discord.baseUrl + '/api/users/@me'
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Discord access token is invalid')
    }

    const userData = await response.json()
    return { id: userData.id, username: userData.username }
  } catch (err) {
    console.error('Error validating discord access token', err)
    throw err
  }
}

// TODO: Update IDL with wormhole token dispenser program IDL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coder = new anchor.BorshCoder(IDL as any)

function hardDriveSignDigest(
  fullMessage: Uint8Array,
  keypair: Keypair
): SignedMessage {
  return {
    publicKey: keypair.publicKey.toBytes(),
    signature: nacl.sign.detached(fullMessage, keypair.secretKey),
    recoveryId: undefined,
    fullMessage
  }
}

export function signDiscordDigest(
  username: string,
  claimant: PublicKey,
  dispenserGuard: Keypair
): SignedMessage {
  return hardDriveSignDigest(
    coder.types.encode('DiscordMessage', {
      username,
      claimant
    }),
    dispenserGuard
  )
}
