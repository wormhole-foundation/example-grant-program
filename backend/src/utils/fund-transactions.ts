import {
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  Ed25519Program,
  PublicKey,
  Secp256k1Program,
  TransactionInstruction,
  VersionedTransaction
} from '@solana/web3.js'

import config from '../config'

const SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT = 2
const MAX_COMPUTE_UNIT_PRICE = BigInt(1_000_000) // 1 SOL;

export function deserializeTransactions(
  transactions: unknown
): VersionedTransaction[] {
  try {
    return (transactions as Uint8Array[]).map((serializedTx) =>
      VersionedTransaction.deserialize(Buffer.from(serializedTx))
    )
  } catch (err) {
    console.error('Failed to deserialize transactions', err)
    throw err
  }
}

async function loadWhitelistedProgramIds(): Promise<PublicKey[]> {
  const programId = config.tokenDispenserProgramId()
  if (!programId) {
    throw new Error('Token dispenser program ID not set')
  }

  const PROGRAM_ID = new PublicKey(programId)
  return [
    PROGRAM_ID,
    Secp256k1Program.programId,
    Ed25519Program.programId,
    ComputeBudgetProgram.programId
  ]
}

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
  return transaction.version === 0
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
      /*
        Below is a hack that was added to extract the priority fee from the transaction
        ComputeBudgetInstruction.decodeInstructionType requires legacTransactionInstruction not
        MessageCompiledInstruction
      */
      const programId = ComputeBudgetProgram.programId
      const legacTransactionInstruction = new TransactionInstruction({
        keys: [],
        programId,
        data: Buffer.from(ix.data)
      })

      const instructonType = ComputeBudgetInstruction.decodeInstructionType(
        legacTransactionInstruction
      )

      if (
        instructonType === 'SetComputeUnitLimit' &&
        ix.data[0] !== SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT
      ) {
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
        data: Buffer.from(ix.data)
      })

      const instructonType = ComputeBudgetInstruction.decodeInstructionType(
        legacTransactionInstruction
      )
      if (instructonType === 'SetComputeUnitPrice') {
        priorityFeeInstructionFound = true
        const priorityFee = ComputeBudgetInstruction.decodeSetComputeUnitPrice(
          legacTransactionInstruction
        )
        if (priorityFee.microLamports >= MAX_COMPUTE_UNIT_PRICE) {
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

// TODO: Verify if this is the expected behavior
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

export async function checkTransactions(
  transactions: VersionedTransaction[]
): Promise<boolean> {
  try {
    const whitelist = await loadWhitelistedProgramIds()

    return transactions.every((tx) =>
      checkTransaction(tx, whitelist[0], whitelist)
    )
  } catch (err) {
    console.error('Error occured while checking transactions', err)
    return false
  }
}
