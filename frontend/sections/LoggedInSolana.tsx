import { Box } from '@components/Box'
import { BackButton, ProceedButton } from '@components/buttons'
import { WalletConnectedButton } from '@components/wallets/WalletButton'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMemo } from 'react'
import { truncateAddress } from 'utils/truncateAddress'
import { StepProps } from './common'
import { BoxTitle } from '@components/BoxTitle'

export const LoggedInSolana = ({ onBack, onProceed }: StepProps) => {
  const { publicKey, wallet, disconnect } = useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  return (
    <Box>
      <BoxTitle>
        <div className="flex items-center justify-between">
          <span>Connect to Solana</span>
          <BackButton onBack={onBack} />
        </div>
      </BoxTitle>
      <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
        <p className="mb-6">
          W is native to Solana. To receive your W, a Solana wallet
          is required. The W you claim will be sent to the Solana wallet you
          link during this process.
        </p>
        <p className="">
          To change the connected wallet please go to the previous step.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <WalletConnectedButton
            onClick={disconnect}
            address={truncateAddress(base58) ?? ''}
            icon={wallet?.adapter.icon}
            disabled={true}
          />
          <ProceedButton onProceed={onProceed} />
        </div>
      </div>
    </Box>
  )
}
