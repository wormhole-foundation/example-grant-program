import 'dotenv/config' // Load environment variables from .env file
import * as anchor from '@coral-xyz/anchor'
import {
  TestEvmWallet,
  TestSolanaWallet,
  TestWallet,
} from '../claim_sdk/testWallets'
import { ClaimInfo, Ecosystem, Ecosystems } from '../claim_sdk/claim'
import { getMaxAmount } from '../claim_sdk/claim'
import { MerkleTree } from '../claim_sdk/merkleTree'

const CHUNK_SIZE = 1000
const SOLANA_ECOSYSTEM_INDEX = 2
const EVM_ECOSYSTEM_INDEX = 3
export const EVM_CHAINS = [
  'optimism-mainnet',
  'arbitrum-mainnet',
  'cronos-mainnet',
  'zksync-mainnet',
  'bsc-mainnet',
  'base-mainnet',
  'evmos-mainnet',
  'mantle-mainnet',
  'linea-mainnet',
  'polygon-zkevm-mainnet',
  'avalanche-mainnet',
  'matic-mainnet',
  'aurora-mainnet',
  'eth-mainnet',
  'confluxespace-mainnet',
  'celo-mainnet',
  'meter-mainnet',
  'gnosis-mainnet',
  'kcc-mainnet',
  'wemix-mainnet',
] as const

export type SOLANA_SOURCES = 'nft' | 'defi'

export type EvmChains = typeof EVM_CHAINS[number]

export type EvmBreakdownRow = {
  chain: string
  identity: string
  amount: anchor.BN
}

export type SolanaBreakdownRow = {
  source: SOLANA_SOURCES
  identity: string
  amount: anchor.BN
}

const DB = new Map<any, any>()

/** Get in memory db. */
export function getInMemoryDb(): Map<any, any> {
  return DB
}

export function clearInMemoryDb() {
  DB.clear()
}

export function addClaimInfosToInMemoryDb(claimInfos: ClaimInfo[]): Buffer {
  console.log('ADDING :', claimInfos.length, ' CLAIM INFOS')
  console.time('built merkle tree time')
  const merkleTree = new MerkleTree(
    claimInfos.map((claimInfo) => {
      return claimInfo.toBuffer()
    })
  )
  console.timeEnd('built merkle tree time')
  let claimInfoChunks = []
  const chunkCounts = [...Array(Math.ceil(claimInfos.length / CHUNK_SIZE))]
  console.time('claiminfoChunks time')
  claimInfoChunks = chunkCounts.map((_, i) => {
    if (i % 100 === 0) {
      console.log(`\n\n making claimInfo chunk ${i}/${chunkCounts.length}\n\n`)
    }
    let chunk = claimInfos.splice(0, CHUNK_SIZE)
    return chunk.map((claimInfo) => {
      return {
        ecosystem: claimInfo.ecosystem,
        identity: claimInfo.identity,
        amount: claimInfo.amount.toString(),
        proof_of_inclusion: merkleTree.prove(claimInfo.toBuffer()),
      }
    })
  })
  console.timeEnd('claiminfoChunks time')
  console.time('claimsInsert time')
  for (const claimInfoChunk of claimInfoChunks) {
    for (const claimInfo of claimInfoChunk) {
      if (!DB.has(claimInfo.ecosystem)) {
        DB.set(claimInfo.ecosystem, new Map<any, any>())
      }
      DB.get(claimInfo.ecosystem).set(claimInfo.identity, claimInfo)
    }
  }
  const claimsInsertEnd = Date.now()
  console.timeEnd('claimsInsert time')
  return merkleTree.root
}

export function addTestWalletsToDatabase(
  testWallets: Record<Ecosystem, TestWallet[]>
): [Buffer, anchor.BN] {
  const claimInfos: ClaimInfo[] = Ecosystems.map(
    (ecosystem, ecosystemIndex) => {
      return testWallets[ecosystem].map((testWallet, index) => {
        return new ClaimInfo(
          ecosystem,
          testWallet.address(),
          new anchor.BN(1000000 * (ecosystemIndex + 1) + 100000 * index) // The amount of tokens is deterministic based on the order of the test wallets
        )
      })
    }
  ).flat(1)

  const maxAmount = getMaxAmount(claimInfos)

  return [addClaimInfosToInMemoryDb(claimInfos), maxAmount]
}
