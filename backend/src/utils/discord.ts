import { Keypair, PublicKey } from '@solana/web3.js'
import { SignedMessage } from '../types'
import nacl from 'tweetnacl'
import IDL from '../token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'

const DISCORD_AUTH_ME_URL = 'https://discord.com/api/users/@me';

export async function isAuthTokenValid (discordId: string, token: string): Promise<boolean> {
    try {
        const response = await fetch(DISCORD_AUTH_ME_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
    
        const userData = await response.json();
        return userData.id === discordId;
    } catch (err) {
        console.error('Error validating discord access token', err);
        throw err;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coder = new anchor.BorshCoder(IDL as any)

function hardDriveSignMessage(
  fullMessage: Uint8Array,
  keypair: Keypair
): SignedMessage {
  return {
    publicKey: keypair.publicKey.toBytes(),
    signature: nacl.sign.detached(fullMessage, keypair.secretKey),
    recoveryId: undefined,
    fullMessage,
  }
}

export function signDiscordMessage(
  username: string,
  claimant: PublicKey,
  dispenserGuard: Keypair
): SignedMessage {
  return hardDriveSignMessage(
    coder.types.encode('DiscordMessage', {
      username,
      claimant,
    }),
    dispenserGuard
  )
}
