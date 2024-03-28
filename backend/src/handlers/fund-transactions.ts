import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getFundingKey } from '../utils/secrets'
import {
  checkTransactions,
  deserializeTransactions,
  extractCallData
} from '../utils/fund-transactions'
import { Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { HandlerError } from '../utils/errors'
import { asJsonResponse } from '../utils/response'

export type FundTransactionRequest = Uint8Array[]

let funderWallet: NodeWallet

export const fundTransactions = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body!)
    validateFundTransactions(requestBody)
    const transactions = deserializeTransactions(requestBody)
    const isTransactionsValid = await checkTransactions(transactions)

    if (!isTransactionsValid) {
      return asJsonResponse(403, { error: 'Unauthorized transactions' })
    }

    const wallet = await loadFunderWallet()

    const signedTransactions = await wallet.signAllTransactions(transactions)
    logSignatures(signedTransactions)
    return asJsonResponse(
      200,
      signedTransactions.map((tx) => Buffer.from(tx.serialize()))
    )
  } catch (err: HandlerError | unknown) {
    console.error('Error signing transactions', err)

    if (err instanceof HandlerError) {
      return asJsonResponse(err.statusCode, err.body)
    }

    return asJsonResponse(500, { error: 'Internal server error' })
  }
}

function validateFundTransactions(transactions: unknown) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new HandlerError(400, { error: 'Must provide transactions' })
  }

  if (transactions.length >= 10) {
    throw new HandlerError(400, { error: 'Too many transactions' })
  }
}

async function loadFunderWallet(): Promise<NodeWallet> {
  if (funderWallet) {
    return funderWallet
  }

  const secretData = await getFundingKey()
  const funderWalletKey = secretData.key

  const keypair = Keypair.fromSecretKey(Uint8Array.from(funderWalletKey))

  funderWallet = new NodeWallet(keypair)
  console.log('Loaded funder wallet')
  return funderWallet
}

function getSignature(tx: VersionedTransaction): string {
  if (tx.signatures.length > 0) {
    return bs58.encode(tx.signatures[0])
  }

  return 'unkown signature'
}

function logSignatures(signedTransactions: VersionedTransaction[]) {
  const sigs: {
    sig: string
    instruction?: ReturnType<typeof extractCallData>
  }[] = []
  signedTransactions.forEach((tx) => {
    sigs.push({ sig: getSignature(tx), instruction: extractCallData(tx) })
  })
  console.log(`Signed transactions: ${JSON.stringify(sigs)}`)
}
