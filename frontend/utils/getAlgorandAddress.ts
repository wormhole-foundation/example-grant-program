import { base32encode } from '../claim_sdk'
import { sha512_256 } from 'js-sha512'

const ALGORAND_ADDRESS_LENGTH = 58;

/**
 * Get Algorand address from 32 byte Ed25519 public key buffer
 *
 * @param pubkey Buffer
 * @returns string
 */
export const getAlgorandAddress = (pubkey: Buffer): string => {
  if (pubkey.length !== 32) {
    throw new Error('Invalid public key length')
  }
  const checksum = sha512_256.array(pubkey)
  const address = Buffer.concat([pubkey, Buffer.from(checksum.slice(-4))])
  return base32encode(address).slice(0, ALGORAND_ADDRESS_LENGTH)
}
