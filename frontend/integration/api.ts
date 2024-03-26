import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import {
  ComputeBudgetProgram,
  Ed25519Program,
  Keypair,
  PublicKey,
  Secp256k1Program,
  VersionedTransaction,
} from '@solana/web3.js'
import { NextApiRequest, NextApiResponse } from 'next'
import {
  getFundTransactionRoute,
  handleAmountAndProofResponse,
  handleFundTransaction,
} from '../utils/api'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import { loadFunderWallet } from '../claim_sdk/testWallets'
import { checkTransactions } from '../utils/verifyTransaction'
import fs from 'fs'
import path from 'path'
import { getInMemoryDb } from './utils'

//import handlerAmountAndProof from '../pages/api/grant/v1/amount_and_proof'
//import handlerFundTransaction from '../pages/api/grant/v1/fund_transaction'

const wallet = process.env.FUNDER_KEYPAIR
  ? new NodeWallet(
      Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.FUNDER_KEYPAIR))
      )
    )
  : loadFunderWallet()

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!)

const WHITELISTED_PROGRAMS: PublicKey[] = [
  PROGRAM_ID,
  Secp256k1Program.programId,
  Ed25519Program.programId,
  ComputeBudgetProgram.programId,
]

function getAmountAndProofRoute(..._: any[]): string {
  return ''
}

export async function handlerAmountAndProof(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ecosystem, identity } = req.query
  if (
    ecosystem === undefined ||
    identity === undefined ||
    identity instanceof Array ||
    ecosystem instanceof Array
  ) {
    res.status(400).json({
      error: "Must provide the 'ecosystem' and 'identity' query parameters",
    })
    return
  }

  try {
    // TODO: read flat file?
    const db = getInMemoryDb()
    const result = db.get(ecosystem)!.get(identity)
    if (!result) {
      res.status(404).json({
        error: `No result found for ${ecosystem} identity ${identity}`,
      })
    } else {
      res.status(200).json({
        amount: result.amount,
        hashes: result.proof_of_inclusion,
        address: identity,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: `An unexpected error occurred`,
    })
  }
}

export default async function handlerFundTransaction(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const data = req.body
  let transactions: VersionedTransaction[] = []
  let signedTransactions: VersionedTransaction[] = []

  if (data.length >= 10) {
    return res.status(400).json({
      error: 'Too many transactions',
    })
  }

  try {
    transactions = data.map((serializedTx: any) => {
      return VersionedTransaction.deserialize(Buffer.from(serializedTx))
    })
  } catch {
    return res.status(400).json({
      error: 'Failed to deserialize transactions',
    })
  }

  if (checkTransactions(transactions, PROGRAM_ID, WHITELISTED_PROGRAMS)) {
    try {
      signedTransactions = await wallet.signAllTransactions(transactions)
    } catch {
      return res.status(400).json({
        error:
          'Failed to sign transactions, make sure the transactions have the right funder',
      })
    }

    return res.status(200).json(
      signedTransactions.map((tx) => {
        return Buffer.from(tx.serialize())
      })
    )
  } else {
    return res.status(403).json({ error: 'Unauthorized transaction' })
  }
}

export class NextApiResponseMock {
  public jsonBody: any
  public statusCode: number = 0

  json(jsonBody: any) {
    this.jsonBody = jsonBody
  }

  status(statusCode: number): NextApiResponseMock {
    this.statusCode = statusCode
    return this
  }
}
export async function mockfetchFundTransaction(
  transactions: VersionedTransaction[]
): Promise<VersionedTransaction[]> {
  const req: NextApiRequest = {
    url: getFundTransactionRoute(),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: transactions.map((tx) => Buffer.from(tx.serialize())),
  } as unknown as NextApiRequest
  const res = new NextApiResponseMock()
  await handlerFundTransaction(req, res as unknown as NextApiResponse)
  return handleFundTransaction(res.statusCode, res.jsonBody)
}

/** fetchAmountAndProof but for tests */
export async function mockFetchAmountAndProof(
  ecosystem: Ecosystem,
  identity: string
): Promise<
  { claimInfo: ClaimInfo; proofOfInclusion: Uint8Array[] } | undefined
> {
  const req: NextApiRequest = {
    url: getAmountAndProofRoute(ecosystem, identity),
    query: { ecosystem, identity },
  } as unknown as NextApiRequest
  const res = new NextApiResponseMock()

  await handlerAmountAndProof(req, res as unknown as NextApiResponse)
  return handleAmountAndProofResponse(
    ecosystem,
    identity,
    res.statusCode,
    res.jsonBody
  )
}
