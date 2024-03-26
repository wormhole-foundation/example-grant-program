import { useMemo, useState } from 'react'

import { Box } from '@components/Box'
import { BackButton, ProceedButton } from '@components/buttons'
import {
  BACKPACK_WALLET_ADAPTER,
  PHANTOM_WALLET_ADAPTER,
  SOLFLARE_WALLET_ADAPTER,
  useSelectWallet,
  useWallets,
} from '@components/wallets/Solana'
import {
  WalletConnectedButton,
  WalletModal,
} from '@components/wallets/WalletButton'
import Backpack from '@images/backpack.inline.svg'
import Phantom from '@images/phantom.inline.svg'
import Solflare from '@images/solflare.inline.svg'
import { useWallet } from '@solana/wallet-adapter-react'
import { truncateAddress } from 'utils/truncateAddress'
import { StepProps } from './common'
import { BoxTitle } from '@components/BoxTitle'

export const LogInWithSolana = ({ onBack, onProceed }: StepProps) => {
  const { publicKey, wallet, disconnect, connecting, connected, connect } =
    useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  const buttonText = useMemo(() => {
    if (base58) return truncateAddress(base58)
    if (connecting) return 'Connecting ...'
    if (connected) return 'Connected'
    if (wallet) return 'Install'
  }, [base58, connecting, connected, wallet])

  return (
    <Box>
      <BoxTitle>
        <div className="flex items-center justify-between  ">
          <span>Connect to Solana</span>
          <BackButton onBack={onBack} />
        </div>
      </BoxTitle>
      <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
        <p className="mb-6">
          W is native to the Solana network. To receive your W, a Solana wallet is required. The W you claim will be sent to the Solana wallet you link during this process.
        </p>
        <p className="">
          Below, you'll find a list of popular Solana wallets.
        </p>
        {wallet === null ? (
          <SelectWallets />
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <WalletConnectedButton
              onClick={disconnect}
              address={buttonText!}
              icon={wallet?.adapter.icon}
            />
            <ProceedButton onProceed={onProceed} />
          </div>
        )}
      </div>
    </Box>
  )
}

const SelectWallets = () => {
  const wallets = useWallets()
  const [modal, openModal] = useState(false)
  const selectWallet = useSelectWallet()

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => selectWallet(PHANTOM_WALLET_ADAPTER)}
        >
          <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
            <Phantom /> Phantom
          </span>
        </button>
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => selectWallet(BACKPACK_WALLET_ADAPTER)}
        >
          <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
            <Backpack /> Backpack
          </span>
        </button>
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => selectWallet(SOLFLARE_WALLET_ADAPTER)}
        >
          <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
            <Solflare /> Solflare
          </span>
        </button>

        <button
          className="ml-4 font-body text-base16 font-normal underline"
          onClick={() => openModal(true)}
        >
          More wallets
        </button>
      </div>
      {modal && <WalletModal openModal={openModal} wallets={wallets} />}
    </>
  )
}
