import { walletContext } from '@cosmos-kit/react-lite'
import { ChainName } from '@cosmos-kit/core'
import {
  useState,
  useCallback,
  useContext,
  useMemo,
  createContext,
} from 'react'

export const WALLET_NAME = 'keplr-extension'

const WalletAddress = createContext<{
  address: { [chainName: string]: string | undefined }
  updateAddress: (address: string | undefined, chainName: string) => void
}>({
  address: {},
  updateAddress: () => {},
})

type ChainWalletProviderProps = {
  children: JSX.Element
}

export function ChainWalletProvider({ children }: ChainWalletProviderProps) {
  const [address, setAddress] = useState({})
  const updateAddress = useCallback(
    (address: string | undefined, chainName: string) => {
      setAddress((prev) => ({ ...prev, [chainName]: address }))
    },
    []
  )
  return (
    <WalletAddress.Provider value={{ address, updateAddress }}>
      {children}
    </WalletAddress.Provider>
  )
}

export function useChainWallet(chainName: ChainName, walletName = WALLET_NAME) {
  const [_, inc] = useState(0)
  const reRender = useCallback(() => inc((prev) => prev + 1), [])
  const context = useContext(walletContext)
  const { address, updateAddress } = useContext(WalletAddress)
  const manager = useMemo(() => context.walletManager, [context])
  const walletRepo = useMemo(
    () => manager.getWalletRepo(chainName),
    [manager, chainName]
  )
  const wallet = useMemo(
    () => walletRepo.getWallet(walletName),
    [walletRepo, walletName]
  )

  const isWalletConnecting = useMemo(
    () => wallet?.walletStatus === 'Connecting',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet, _]
  )

  const isWalletConnected = useMemo(
    () => wallet?.walletStatus === 'Connected',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet, _]
  )

  const isWalletDisconnected = useMemo(
    () => wallet?.walletStatus === 'Disconnected',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet, _]
  )
  const isWalletNotExist = useMemo(
    () => wallet?.walletStatus === 'NotExist',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet, _]
  )

  const connect = useCallback(async () => {
    try {
      if (!wallet?.isActive) {
        wallet?.activate()
      }
      await wallet?.connect()
      updateAddress(wallet?.address, chainName)
    } finally {
      reRender()
    }
  }, [wallet, chainName, updateAddress, reRender])
  const disconnect = useCallback(async () => {
    try {
      if (!wallet?.isActive) {
        wallet?.activate()
      }
      await wallet?.disconnect()
    } finally {
      reRender()
      updateAddress(undefined, chainName)
    }
  }, [wallet, chainName, updateAddress, reRender])
  return {
    isWalletConnecting,
    isWalletConnected,
    isWalletDisconnected,
    isWalletNotExist,
    address: address[chainName],
    connect,
    disconnect,
  }
}
