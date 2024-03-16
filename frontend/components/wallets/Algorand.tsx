import { PeraWalletConnect } from '@perawallet/connect'
import { ReactElement, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { WalletButton, WalletConnectedButton } from './WalletButton'

type AlgorandWalletButtonProps = {
  disableOnConnect?: boolean
}

export function AlgorandWalletButton({
  disableOnConnect
}: AlgorandWalletButtonProps) {
  // TODO: Replace with a provider
  const peraWallet = new PeraWalletConnect();
  const [accountAddress, setAccountAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isConnectedToPeraWallet = !!accountAddress;

  const wallets = [
    {
      name: 'Pera Wallet',
      icon: 'https://perawallet.s3-eu-west-3.amazonaws.com/media-kit/pera-logomark-white.svg',
      onSelect: () =>
        window.open('https://https://perawallet.app', '_blank'),
    },
  ]
  useEffect(() => {
    // Reconnect to the session when the component is mounted
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        peraWallet?.connector?.on("disconnect", handleDisconnectWalletClick);

        if (accounts.length) {
          setAccountAddress(accounts[0]);
        }
      })
      .catch((e) => console.log(e));
  }, [peraWallet]);

  function handleConnectWalletClick() {
    setIsLoading(true)
    peraWallet
      .connect()
      .then((newAccounts) => {
        peraWallet?.connector?.on("disconnect", handleDisconnectWalletClick);
        setAccountAddress(newAccounts[0]);
        setIsLoading(false)
      })
      .catch((error) => {
        if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
          console.log(error);
        }
        setIsLoading(false)
      });
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();
    setAccountAddress("");
  }

  return (
    <WalletButton
      address={accountAddress}
      connected={isConnectedToPeraWallet}
      isLoading={isLoading}
      wallets={wallets.map((wallet) => ({
        icon: wallet.icon,
        name: wallet.name,
        onSelect: () => handleConnectWalletClick(),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={handleDisconnectWalletClick}
          address={address}
          icon={wallets[0].icon}
          disabled={disableOnConnect}
        />
      )}
    />
  )
}
