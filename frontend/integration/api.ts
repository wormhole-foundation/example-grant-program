import {
  ComputeBudgetProgram,
  Ed25519Program,
  PublicKey,
  Secp256k1Program,
  VersionedTransaction,
} from '@solana/web3.js'
import { NextApiRequest, NextApiResponse } from 'next'
import {
  TransactionWithPayers,
  getFundTransactionRoute,
  handleAmountAndProofResponse,
  handleFundTransaction,
} from '../utils/api'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import { loadFunderWallets } from '../claim_sdk/testWallets'
import { checkTransactions } from '../utils/verifyTransaction'
import { getInMemoryDb } from './utils'
import { tokenDispenserProgramId } from '../utils/constants'

export type TransactionWithFunder = {
  transaction: VersionedTransaction
  funder: string
}

const wallets = loadFunderWallets()

const tokenDispenserPublicKey = new PublicKey(tokenDispenserProgramId)

const WHITELISTED_PROGRAMS: PublicKey[] = [
  tokenDispenserPublicKey,
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
  let transactions: TransactionWithFunder[] = []
  let signedTransactions: VersionedTransaction[] = []

  if (data.length >= 10) {
    return res.status(400).json({
      error: 'Too many transactions',
    })
  }

  try {
    transactions = data.map((serializedTx: any) => {
      return {
        transaction: VersionedTransaction.deserialize(
          Buffer.from(serializedTx.tx)
        ),
        funder: serializedTx.funder,
      }
    })
  } catch (e) {
    console.error(e)
    return res.status(400).json({
      error: 'Failed to deserialize transactions',
    })
  }

  if (
    checkTransactions(
      transactions.map((tx) => tx.transaction),
      tokenDispenserPublicKey,
      WHITELISTED_PROGRAMS
    )
  ) {
    try {
      for (const txWithFunder of transactions) {
        const wallet = wallets[txWithFunder.funder]
        if (!wallet) {
          return res.status(403).json({ error: 'Unauthorized funder' })
        }

        signedTransactions.push(
          await wallet.signTransaction(txWithFunder.transaction)
        )
      }
    } catch (e) {
      console.error('Failed to sign transactions', e)
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
  transactions: TransactionWithPayers[]
): Promise<VersionedTransaction[]> {
  const req: NextApiRequest = {
    url: getFundTransactionRoute(),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: transactions.map((txWitPayers) => {
      return {
        tx: Buffer.from(txWitPayers.tx.serialize()),
        funder: txWitPayers.payers[0].toBase58(),
      }
    }),
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
