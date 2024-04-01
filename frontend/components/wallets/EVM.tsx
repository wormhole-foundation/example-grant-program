import { ReactElement, ReactNode, useCallback, useEffect } from 'react'
import {
  Connector,
  WagmiConfig,
  createConfig,
  useAccount,
  useConnect,
  useDisconnect,
  configureChains,
  mainnet,
} from 'wagmi'
import { WalletButton, WalletConnectedButton } from './WalletButton'

import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { InjectedConnector } from 'wagmi/connectors/injected'

import coinbase from '@images/coinbase.svg'
import walletConnect from '@images/wallet-connect.svg'
import metamask from '@images/metamask.svg'
import okx from '@images/okx.svg'

import { getInjectiveAddress } from '../../utils/getInjectiveAddress'

// Configure chains & providers with the Alchemy provider.
// Two popular providers are Alchemy (alchemy.com) and Infura (infura.io)
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY! }),
    publicProvider(),
  ]
)

// Set up wagmi config
const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'wagmi',
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
        showQrModal: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})

type WalletIds = 'metaMask' | 'coinbaseWallet' | 'walletConnect' | 'injected'

type EVMWalletProviderProps = {
  children: ReactNode
}

export function EVMWalletProvider({
  children,
}: EVMWalletProviderProps): ReactElement {
  return <WagmiConfig config={config}> {children}</WagmiConfig>
}

type EvmWalletButtonProps = {
  isInjective?: boolean
  disableOnConnect?: boolean
}
export function EVMWalletButton({
  disableOnConnect,
  isInjective,
}: EvmWalletButtonProps) {
  const { disconnect } = useDisconnect()
  const { address, status, isConnected, connector } = useAccount()
  const { connect, connectors } = useConnect()
  const hasOKXWallet = typeof (window as any).okxwallet !== 'undefined'

  // If the wallet is connected or loadable, try to connect to it.
  // Else, redirect user to the wallet webpage.
  const onSelect = useCallback(
    (connector: Connector) => {
      if (connector.name === 'MetaMask') {
        if (window.ethereum.isMetaMask === true) connect({ connector })
        else window.open('https://metamask.io/download/', '_blank')
      } else if (connector.name === 'OKX Wallet') {
        if (hasOKXWallet) connect({ connector })
        else window.open('https://www.okx.com/web3', '_blank')
      } else {
        // Wallet flow is handled pretty well by coinbase and walletconnect.
        // We don't need to customize
        connect({ connector })
      }
    },
    [connect, hasOKXWallet]
  )

  const wallets = () => {
    const allConnectors = connectors.map((connector) => {
      return {
        name: connector.name,
        onSelect: () => onSelect(connector),
        icon: getIcon(connector.id as WalletIds),
      }
    })

    const OKX_connector = new InjectedConnector({
      chains,
      options: {
        name: 'OKX Wallet',
        getProvider: () =>
          typeof window !== undefined ? (window as any).okxwallet : undefined,
      },
    })

    allConnectors.push({
      name: 'OKX Wallet',
      icon: getIcon(OKX_connector.id as WalletIds),
      onSelect: () => onSelect(OKX_connector),
    })

    return allConnectors
  }

  return (
    <WalletButton
      address={address}
      connected={isConnected}
      isLoading={status === 'connecting' || status === 'reconnecting'}
      wallets={wallets()}
      isEVM={true}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={isInjective ? getInjectiveAddress(address) : address}
          disabled={disableOnConnect}
          icon={getIcon(connector?.id as WalletIds)}
        />
      )}
    />
  )
}

function getIcon(id: WalletIds | undefined) {
  if (id === undefined) return undefined
  if (id === 'metaMask') return metamask
  if (id === 'coinbaseWallet') return coinbase
  if (id === 'injected') return okx
  return walletConnect
}
