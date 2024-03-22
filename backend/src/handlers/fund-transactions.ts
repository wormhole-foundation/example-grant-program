import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getFundingKey } from '../utils/secrets'
import {
  checkTransactions,
  deserializeTransactions
} from '../utils/fundTransactions'
import { Keypair } from '@solana/web3.js'

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
    console.log('Signed transactions', signedTransactions[0].signatures[0])
    return {
      statusCode: 200,
      body: JSON.stringify(
        signedTransactions.map((tx) => Buffer.from(tx.serialize()))
      )
    }
  } catch (err) {
    console.error('Error fully signing transactions', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

function validateFundTransactions(transactions: unknown) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Must provide transactions' })
    }
  }

  if (transactions.length >= 10) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Too many transactions' })
    }
  }
}

async function loadFunderWallet(): Promise<NodeWallet> {
  const secretData = await getFundingKey()
  const funderWalletKey = secretData.key

  const keypair = Keypair.fromSecretKey(new Uint8Array(funderWalletKey))

  return new NodeWallet(keypair)
}
