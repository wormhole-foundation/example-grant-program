import { TokenDispenserProvider as CTokenDispenserProvider } from 'claim_sdk/solana'
import { useMemo } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { web3 } from '@coral-xyz/anchor'
import { tokenDispenserProgramId } from '../utils/constants'
import config from '../utils/config'

// It will return undefined if no Solana wallet is connected.
export function useTokenDispenserProvider() {
  const anchorWallet = useAnchorWallet()
  return useMemo(() => {
    if (anchorWallet === undefined) return undefined

    return new CTokenDispenserProvider(
      config.ENDPOINTS,
      anchorWallet,
      new web3.PublicKey(tokenDispenserProgramId)
    )
  }, [anchorWallet])
}
