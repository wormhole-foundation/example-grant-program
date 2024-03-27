import BN from 'bn.js'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import { HASH_SIZE } from '../claim_sdk/merkleTree'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import { SignedMessage } from '../claim_sdk/ecosystems/signatures'
import { ECOSYSTEM_IDS } from './constants'

const MERKLE_PROOFS = process.env.NEXT_PUBLIC_MERKLE_PROOFS
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API

function parseProof(proof: string) {
  // TODO remove it, we should not have empty proofs and will fail if tahat happens
  if (!proof || proof === '') return []
  const buffer = Buffer.from(proof, 'hex')
  const chunks = []

  if (buffer.length % HASH_SIZE !== 0) {
    throw new Error('Proof of inclusion must be a multiple of 32 bytes')
  }

  for (let i = 0; i < buffer.length; i += HASH_SIZE) {
    const chunk = Uint8Array.prototype.slice.call(buffer, i, i + HASH_SIZE)
    chunks.push(chunk)
  }
  return chunks
}

const getAmountAndProofRoute = (
  ecosystem: Ecosystem,
  identity: string
): string[] => {
  if (ecosystem === 'evm') {
    return [
      `${MERKLE_PROOFS}/${identity.toLowerCase()}_${
        ECOSYSTEM_IDS[ecosystem]
      }.json`,
      `${MERKLE_PROOFS}/${identity.toUpperCase()}_${
        ECOSYSTEM_IDS[ecosystem]
      }.json`,
      `${MERKLE_PROOFS}/${identity}_${ECOSYSTEM_IDS[ecosystem]}.json`,
    ]
  } else {
    return [`${MERKLE_PROOFS}/${identity}_${ECOSYSTEM_IDS[ecosystem]}.json`]
  }
}

export function handleAmountAndProofResponse(
  ecosystem: Ecosystem,
  identity: string,
  status: number,
  { address, amount, hashes }: any = {}
): { claimInfo: ClaimInfo; proofOfInclusion: Uint8Array[] } | undefined {
  if (status == 404) return undefined
  if (status == 200) {
    if (identity === address) {
      return {
        claimInfo: new ClaimInfo(ecosystem, identity, new BN(amount)),
        proofOfInclusion: parseProof(hashes),
      }
    }
  }
}

// If the given identity is not eligible the value will be undefined
// Else the value contains the eligibility information
export type Eligibility = {
  claimInfo: ClaimInfo
  proofOfInclusion: Uint8Array[]
}

export async function fetchAmountAndProof(
  ecosystem: Ecosystem,
  identity: string
): Promise<Eligibility | undefined> {
  const files = getAmountAndProofRoute(ecosystem, identity)
  // Iterate over each posible file name and return the first valid response
  // The best case will be to have only one file per identity
  for (const file of files) {
    const response = await fetch(file)
    if (response.headers.get('content-type') === 'application/json') {
      const data = await response.json()
      if (
        response.status === 200 &&
        data.address.toLocaleLowerCase() === identity.toLocaleLowerCase()
      ) {
        return {
          claimInfo: new ClaimInfo(ecosystem, identity, new BN(data.amount)),
          proofOfInclusion: parseProof(data.hashes),
        }
      }
    }
  }
}

export function getDiscordSignedMessageRoute(claimant: PublicKey) {
  return `${BACKEND_API}/api/grant/v1/discord_signed_message?publicKey=${claimant.toBase58()}`
}

export function handleDiscordSignedMessageResponse(
  status: number,
  data: any
): SignedMessage | undefined {
  if (status == 200) {
    return {
      signature: Buffer.from(data.signature, 'hex'),
      publicKey: Buffer.from(data.publicKey, 'hex'),
      fullMessage: Buffer.from(data.fullMessage, 'hex'),
      recoveryId: undefined,
    }
  }
}

export async function fetchDiscordSignedMessage(
  claimant: PublicKey,
  accessToken: string
): Promise<SignedMessage | undefined> {
  const response = await fetch(getDiscordSignedMessageRoute(claimant), {
    headers: {
      'authorization': accessToken
    }
  })
  return handleDiscordSignedMessageResponse(
    response.status,
    await response.json()
  )
}

export function getFundTransactionRoute(): string {
  return `${BACKEND_API}/api/grant/v1/fund_transaction`
}

export function handleFundTransaction(
  status: number,
  data: any
): VersionedTransaction[] {
  if (status == 200) {
    return data.map((serializedTx: any) => {
      return VersionedTransaction.deserialize(Buffer.from(serializedTx))
    })
  } else {
    throw new Error(data.error)
  }
}

export async function fetchFundTransaction(
  transactions: VersionedTransaction[]
): Promise<VersionedTransaction[]> {
  const response = await fetch(getFundTransactionRoute(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transactions.map((tx) => Buffer.from(tx.serialize()))),
  })

  return handleFundTransaction(response.status, await response.json())
}
