import { Ecosystem } from 'claim_sdk/claim'

// TODO remove it
export type SOLANA_SOURCES = 'nft' | 'defi'

export const ECOSYSTEM_IDS: Record<Ecosystem, number> = {
  solana: 1,
  evm: 2,
  terra: 3,
  algorand: 8,
  injective: 19,
  osmosis: 20,
  sui: 21,
  aptos: 22,
  discord: 14443,
} as const

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

export type EvmChains = typeof EVM_CHAINS[number]

export const tokenDispenserProgramId =
  'WapFw9mSyHh8trDDRy7AamUn1V7QiGaVvtouj5AucQA'
