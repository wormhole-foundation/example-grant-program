import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { ChainName } from '@components/wallets/Cosmos'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useAccount } from 'wagmi'
import { useWallet as useAlgorandWallet } from '@components/Ecosystem/AlgorandProvider'
import { useChainWallet } from './useChainWallet'

const PREFIX_0X = '0x'

export function useAptosAddress(): string | undefined {
  const { account } = useAptosWallet()
  if (account && account.address) {
    return `${PREFIX_0X}${account.address
      .replace(PREFIX_0X, '')
      .padStart(64, '0')}`
  }
}

export function useCosmosAddress(
  chainName: ChainName
): string | undefined {
  return useChainWallet(chainName).address
}

export function useEVMAddress(): string | undefined {
  const { address } = useAccount()
  return address
}

export function useSolanaAddress(): string | undefined {
  const { publicKey } = useSolanaWallet()
  return publicKey?.toBase58()
}

export function useSuiAddress(): string | undefined {
  const { currentAccount } = useWalletKit()
  return currentAccount?.address
}

export function useAlgorandAddress(): string | undefined {
  const { account } = useAlgorandWallet()
  return account || undefined
}
