import {
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  Ed25519Program,
  Secp256k1Program,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

const SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT = 2
const SET_COMPUTE_UNIT_PRICE_DISCRIMINANT = 3
const MAX_COMPUTE_UNIT_PRICE = BigInt(1_000_000)

export function checkAllProgramsWhitelisted(
  transaction: VersionedTransaction,
  whitelist: PublicKey[]
): boolean {
  for (const ix of transaction.message.compiledInstructions) {
    if (
      !whitelist.some((program) =>
        transaction.message.staticAccountKeys[ix.programIdIndex].equals(program)
      )
    ) {
      return false
    }
  }
  return true
}

export function checkV0(transaction: VersionedTransaction) {
  const isVersion0Transaction = transaction.version === 0
  if (!isVersion0Transaction) {
    console.error(
      'Transaction sent is a legacy transaction, expected a V0 transaction.'
    )
  }
  return isVersion0Transaction
}

export function checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
  transaction: VersionedTransaction
) {
  for (const ix of transaction.message.compiledInstructions) {
    if (
      transaction.message.staticAccountKeys[ix.programIdIndex].equals(
        ComputeBudgetProgram.programId
      )
    ) {
      // Note: We continue processing tx data because setComputeUnitPrice is mandatory to be set
      if (ix.data[0] === SET_COMPUTE_UNIT_PRICE_DISCRIMINANT) continue

      if (ix.data[0] !== SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT) {
        return false
      }
    }
  }
  return true
}

export function checkSetComputeBudgetInstructionsAreSetComputeUnitPrice(
  transaction: VersionedTransaction
) {
  let priorityFeeInstructionFound = false
  for (const ix of transaction.message.compiledInstructions) {
    if (
      transaction.message.staticAccountKeys[ix.programIdIndex].equals(
        ComputeBudgetProgram.programId
      )
    ) {
      /*
        Below is a hack that was added to extract the priority fee from the transaction
        ComputeBudgetInstruction.decodeInstructionType requires legacTransactionInstruction not
        MessageCompiledInstruction
      */
      const programId = ComputeBudgetProgram.programId
      const legacTransactionInstruction = new TransactionInstruction({
        keys: [],
        programId,
        data: Buffer.from(ix.data),
      })

      const instructonType = ComputeBudgetInstruction.decodeInstructionType(
        legacTransactionInstruction
      )
      if (instructonType === 'SetComputeUnitPrice') {
        priorityFeeInstructionFound = true
        const priorityFee = ComputeBudgetInstruction.decodeSetComputeUnitPrice(
          legacTransactionInstruction
        )
        if (priorityFee.microLamports > MAX_COMPUTE_UNIT_PRICE) {
          return false
        }
      }
    }
  }
  return priorityFeeInstructionFound
}

export function checkProgramAppears(
  transaction: VersionedTransaction,
  program: PublicKey
): boolean {
  for (const ix of transaction.message.compiledInstructions) {
    if (
      transaction.message.staticAccountKeys[ix.programIdIndex].equals(program)
    ) {
      return true
    }
  }
  return false
}

export function countTotalSignatures(
  transaction: VersionedTransaction
): number {
  return (
    transaction.signatures.length +
    countPrecompiledSignatures(transaction, Secp256k1Program.programId) +
    countPrecompiledSignatures(transaction, Ed25519Program.programId)
  )
}

export function countPrecompiledSignatures(
  transaction: VersionedTransaction,
  program: PublicKey
): number {
  return transaction.message.compiledInstructions
    .filter((ix) => {
      return transaction.message.staticAccountKeys[ix.programIdIndex].equals(
        program
      )
    })
    .reduce((acc, ix) => acc + ix.data[0], 0)
}

export function checkNumberOfSignatures(
  transaction: VersionedTransaction
): boolean {
  return countTotalSignatures(transaction) <= 3
}

export function checkTransaction(
  transaction: VersionedTransaction,
  tokenDispenser: PublicKey,
  whitelist: PublicKey[]
): boolean {
  return (
    checkProgramAppears(transaction, tokenDispenser) && // Make sure at least one instruction is for the token dispenser
    checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transaction) && // Make sure all compute budget instructions are set compute unit limit
    checkAllProgramsWhitelisted(transaction, whitelist) && // Make sure all programs are either signature precompiles, token dispenser, or compute budget
    checkV0(transaction) && // Check the transaction is V0
    checkNumberOfSignatures(transaction) && // Check the transaction has at most 3 signatures, since each signature costs 0.000005 SOL
    checkSetComputeBudgetInstructionsAreSetComputeUnitPrice(transaction) // Check the transaction has set priority fee
  )
}

export function checkTransactions(
  transactions: VersionedTransaction[],
  tokenDispenser: PublicKey,
  whitelist: PublicKey[]
): boolean {
  return transactions.every((tx) =>
    checkTransaction(tx, tokenDispenser, whitelist)
  )
}
