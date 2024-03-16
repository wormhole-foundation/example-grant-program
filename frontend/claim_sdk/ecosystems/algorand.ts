import { PublicKey } from "@solana/web3.js";
import { base32encode } from "claim_sdk";
import { sha512_256 } from "js-sha512";

export function algorandGetFullMessage(payload: string): string {
  return 'MX'.concat(payload)
}

export function algorandAddress(pubkey: PublicKey): string {
  const pubkeyBytes = pubkey.toBuffer()
  const checksumBytes = sha512_256.array(pubkeyBytes)
  const address = Buffer.concat([pubkeyBytes, Buffer.from(checksumBytes.slice(-4))])
  return base32encode(address)
}