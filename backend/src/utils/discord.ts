import { Keypair, PublicKey } from "@solana/web3.js";
import { SignedMessage } from "../types";
import nacl from "tweetnacl";
import IDL from "../token_dispenser.json";
import * as anchor from "@coral-xyz/anchor";

const DISCORD_AUTH_ME_URL = "https://discord.com/api/v10/users/@me";

export async function isAccessTokenValid(discordId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(DISCORD_AUTH_ME_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const userData = await response.json();
    return userData.id === discordId;
  } catch (err) {
    console.error("Error validating discord access token", err);
    throw err;
  }
}

// TODO: Update IDL with wormhole token dispenser program IDL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coder = new anchor.BorshCoder(IDL as any);

function hardDriveSignDigest(fullMessage: Uint8Array, keypair: Keypair): SignedMessage {
  return {
    publicKey: keypair.publicKey.toBytes(),
    signature: nacl.sign.detached(fullMessage, keypair.secretKey),
    recoveryId: undefined,
    fullMessage,
  };
}

export function signDiscordDigest(username: string, claimant: PublicKey, dispenserGuard: Keypair): SignedMessage {
  return hardDriveSignDigest(
    coder.types.encode("DiscordMessage", {
      username,
      claimant,
    }),
    dispenserGuard,
  );
}
