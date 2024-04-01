import { IdlTypes } from '@coral-xyz/anchor'
import { TokenDispenser } from './token-dispenser'

export type SignedMessage = {
  publicKey: Uint8Array
  signature: Uint8Array
  // recoveryId is undefined for ed25519
  recoveryId: number | undefined
  fullMessage: Uint8Array
}

export type ClaimCertificate = IdlTypes<TokenDispenser>['ClaimCertificate']

export type ClaimSignature = {
  sig: string
  instruction: ClaimCertificate | null
}
