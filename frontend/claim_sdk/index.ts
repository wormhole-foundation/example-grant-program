import base32 from "hi-base32"

export function removeLeading0x(s: string): string {
  if (s.startsWith('0x')) {
    return s.substring(2)
  }

  return s
}

export function base32decode(s: string): Buffer {
  const address = base32.decode.asBytes(s);
  if (address.length != 36) {
    throw new Error(`Invalid Algorand address length`)
  }
  return Buffer.from(address)
}

export function base32encode(s: base32.Input): string {
  return base32.encode(s)
}

export function envOrErr(env: string): string {
  const val = process.env[env]
  if (!val) {
    throw new Error(`environment variable "${env}" must be set`)
  }
  return String(process.env[env])
}
