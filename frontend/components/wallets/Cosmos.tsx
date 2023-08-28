import { ReactElement, ReactNode, useCallback, useEffect } from 'react'
import { ChainProvider, useChainWallet } from '@cosmos-kit/react-lite'
import { assets, chains } from 'chain-registry'
import { wallets } from '@cosmos-kit/keplr-extension'
import { MainWalletBase } from '@cosmos-kit/core'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { fetchAmountAndProof } from 'utils/api'
import { ECOSYSTEM, useEcosystem } from '@components/EcosystemProvider'

const walletName = 'keplr-extension'

type CosmosWalletProviderProps = {
  children: ReactNode
}

export function CosmosWalletProvider({
  children,
}: CosmosWalletProviderProps): ReactElement {
  return (
    <ChainProvider
      chains={chains}
      assetLists={assets}
      wallets={[...wallets] as unknown as MainWalletBase[]}
    >
      {children}
    </ChainProvider>
  )
}

type CosmosWalletButtonProps = {
  chainName: 'injective' | 'osmosis' | 'neutron'
}
export function CosmosWalletButton({ chainName }: CosmosWalletButtonProps) {
  const chainWalletContext = useChainWallet(chainName, walletName)
  const {
    address,
    isWalletConnecting,
    isWalletConnected,
    connect,
    logoUrl,
    isWalletNotExist,
    disconnect,
  } = chainWalletContext

  // The initial value of `isWalletNotExist` is false.
  // When the user clicks on connect, the value of `isWalletNotExist` is first set to false,
  // doesn't matter what the previous value was. and if it the wallet doesn't exist the
  // value `isWalletNotExist` will change to true. Once, the value of `isWalletNotExist`
  // changes to true, this useEffect will redirect the user to the keplr webpage.
  useEffect(() => {
    if (isWalletNotExist) window.open('https://www.keplr.app/download')
  }, [isWalletNotExist])

  const { setEligibility } = useEcosystem()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (isWalletConnected === true && address !== undefined) {
        const eligibility = await fetchAmountAndProof(
          chainName === 'injective' ? 'injective' : 'cosmwasm',
          address
        )
        setEligibility(chainNametoECOSYSTEM(chainName), eligibility)
      } else {
        setEligibility(chainNametoECOSYSTEM(chainName), undefined)
      }
    })()
  }, [isWalletConnected, address, setEligibility, chainName])

  return (
    <WalletButton
      address={address}
      connected={isWalletConnected}
      isLoading={isWalletConnecting}
      wallets={[{ name: 'keplr', icon: logoUrl, onSelect: connect }]}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton onClick={disconnect} address={address} />
      )}
    />
  )
}

function chainNametoECOSYSTEM(
  chainName: 'injective' | 'osmosis' | 'neutron'
): ECOSYSTEM {
  if (chainName === 'injective') return ECOSYSTEM.INJECTIVE
  else if (chainName === 'osmosis') return ECOSYSTEM.OSMOSIS
  else return ECOSYSTEM.NEUTRON
}
