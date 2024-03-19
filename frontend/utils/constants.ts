// TODO remove it
export type SOLANA_SOURCES = 'nft' | 'defi'

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

export type EvmChains = (typeof EVM_CHAINS)[number]
