export type SignedMessage = {
    publicKey: Uint8Array
    signature: Uint8Array
    // recoveryId is undefined for ed25519
    recoveryId: number | undefined
    fullMessage: Uint8Array
  }