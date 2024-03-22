import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getFundingKey } from '../utils/secrets'
import {
  checkTransactions,
  deserializeTransactions
} from '../utils/fund-transactions'
import { Keypair } from '@solana/web3.js'
import { HandlerError } from '../utils/errors'

export type FundTransactionRequest = Uint8Array[]

export const fundTransactions = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body!)
    validateFundTransactions(requestBody)
    const transactions = deserializeTransactions(requestBody)
    const isTransactionsValid = await checkTransactions(transactions)

    if (!isTransactionsValid) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Unauthorized transactions' })
      }
    }

    const wallet = await loadFunderWallet()

    const signedTransactions = await wallet.signAllTransactions(transactions)
    return {
      statusCode: 200,
      body: JSON.stringify(
        signedTransactions.map((tx) => Buffer.from(tx.serialize()))
      )
    }
  } catch (err: HandlerError | unknown) {
    console.error('Error signing transactions', err)

    if (err instanceof HandlerError) {
      return {
        statusCode: err.statusCode,
        body: JSON.stringify(err.body)
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
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
  const secretData = await getFundingKey()
  const funderWalletKey = secretData.key

  const keypair = Keypair.fromSecretKey(new Uint8Array(funderWalletKey))

  return new NodeWallet(keypair)
}
