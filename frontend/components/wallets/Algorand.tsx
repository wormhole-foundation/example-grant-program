import { useEffect } from 'react'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { useWallet as useAlgorandWallet } from '@components/Ecosystem/AlgorandProvider'

type AlgorandWalletButtonProps = {
  disableOnConnect?: boolean
}

export function AlgorandWalletButton({
  disableOnConnect,
}: AlgorandWalletButtonProps) {
  const {
    connected,
    provider,
    account,
    isLoading,
    connect,
    disconnect,
    reconnect,
  } = useAlgorandWallet()

  const wallets = [
    {
      name: 'Pera Wallet',
      icon: 'https://perawallet.s3-eu-west-3.amazonaws.com/media-kit/pera-logomark-white.svg',
      onSelect: () => window.open('https://https://perawallet.app', '_blank'),
    },
  ]
  useEffect(() => {
    // Reconnect to the session when the component is mounted
    try {
      reconnect()
    } catch (e) {
      console.log(e)
    }
  }, [provider])

  return (
    <WalletButton
      address={account || undefined}
      connected={connected}
      isLoading={isLoading}
      wallets={wallets.map((wallet) => ({
        icon: wallet.icon,
        name: wallet.name,
        onSelect: () => connect(),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          icon={wallets[0].icon}
          disabled={disableOnConnect}
        />
      )}
    />
  )
}
