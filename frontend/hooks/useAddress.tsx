import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { ChainName } from '@components/wallets/Cosmos'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useAccount } from 'wagmi'
import { useWallet as useAlgorandWallet } from '@components/Ecosystem/AlgorandProvider'

const PREFIX_0X = '0x'

export function useAptosAddress(): string | undefined {
  const { account } = useAptosWallet()
  if (account && account.address) {
    return `${PREFIX_0X}${account.address
      .replace(PREFIX_0X, '')
      .padStart(32, '0')}`
  }
}

export function useCosmosAddress(
  chainName: ChainName,
  walletName = 'keplr-extension'
): string | undefined {
  const { address } = useChainWallet(chainName, walletName)
  return address
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
