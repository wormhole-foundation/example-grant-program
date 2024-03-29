import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getFundingKeys } from '../utils/secrets'
import {
  checkTransactions,
  deserializeTransactions
} from '../utils/fund-transactions'
import { Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { HandlerError } from '../utils/errors'
import { asJsonResponse } from '../utils/response'

export type FundTransactionRequest = Uint8Array[]

let funderWallets: Record<string, NodeWallet> = {};

export const fundTransactions = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body!)
    validateFundTransactions(requestBody)
    const transactions = deserializeTransactions(requestBody)
    const isTransactionsValid = await checkTransactions(transactions.map((txWithFunder) => txWithFunder.transaction));

    if (!isTransactionsValid) {
      return asJsonResponse(403, { error: 'Unauthorized transactions' })
    }

    const wallets = await loadFunderWallets();

    const signedTransactions: VersionedTransaction[] = [];

    for(const txWithFunder of transactions){
      const funderWallet = wallets[txWithFunder.funder];
      if(!funderWallet){
        return asJsonResponse(403, { error: 'Unauthorized funder' })
      }

      signedTransactions.push(await funderWallet.signTransaction(txWithFunder.transaction));
    }

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

async function loadFunderWallets(): Promise<Record<string, NodeWallet>> {
  if (Object.keys(funderWallets).length > 0){
    return funderWallets;
  }

  const secretData = await getFundingKeys()
  const funderWalletKeys = Object.values(secretData);

  const keypairs = funderWalletKeys.map((key) => {
    const parsedKey = key.toString().replace("[","").replace("]","").split(",").map((l) => parseInt(l));
    return Keypair.fromSecretKey(Uint8Array.from(parsedKey));
  });

  keypairs.forEach((keypair) => {
    funderWallets[keypair.publicKey.toBase58()] = new NodeWallet(keypair)
  })

  return funderWallets;
}

function getSignature(tx: VersionedTransaction): string {
  if (tx.signatures.length > 0) {
    return bs58.encode(tx.signatures[0])
  }

  return 'unkown signature'
}

function logSignatures(signedTransactions: VersionedTransaction[]) {
  const sigs: string[] = []
  signedTransactions.forEach((tx) => {
    sigs.push(getSignature(tx))
  })
  console.log(`Signed transactions: ${sigs}`)
}
