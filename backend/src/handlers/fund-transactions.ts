import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getSecret } from '../utils/secrets'
import {
  checkTransactions,
  deserializeTransactions
} from '../utils/fundTransactions'
import { Keypair } from '@solana/web3.js'

interface FundTransactionRequest {
  transactions: unknown
}

export const fundTransaction = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body!) as FundTransactionRequest
    validateFundTransactions(requestBody.transactions)
    const transactions = deserializeTransactions(requestBody.transactions)
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
      body: JSON.stringify({
        signedTransactions: signedTransactions.map((tx) => tx.serialize())
      })
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
  const secretData = await getSecret(
    process.env.FUNDER_WALLET_KEY_SECRET_NAME ?? 'xli-test-secret-funder-wallet'
  )
  const funderWalletKey = secretData.key

  const keypair = Keypair.fromSecretKey(new Uint8Array(funderWalletKey))

  return new NodeWallet(keypair)
}
