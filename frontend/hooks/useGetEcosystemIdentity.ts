import {
  useAlgorandAddress,
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSolanaAddress,
  useSuiAddress,
} from './useAddress'
import { useSession } from 'next-auth/react'
import { Ecosystem } from '@components/Ecosystem'
import { useCallback } from 'react'
import { getInjectiveAddress } from '../utils/getInjectiveAddress'

// It will return a function that can be used to get the identity of a given ecosystem
// The function will return the identity if the ecosystem is connected
// Else it will return undefined
export function useGetEcosystemIdentity() {
  const algorandAddress = useAlgorandAddress()
  const aptosAddress = useAptosAddress()
  const evmAddress = useEVMAddress()
  const osmosisAddress = useCosmosAddress('osmosis')
  const terraAddress = useCosmosAddress('terra')
  const solanaAddress = useSolanaAddress()
  const suiAddress = useSuiAddress()
  const { data } = useSession()

  return useCallback(
    (ecosystem: Ecosystem) => {
      switch (ecosystem) {
        case Ecosystem.ALGORAND:
          return algorandAddress

        case Ecosystem.APTOS:
          return aptosAddress

        case Ecosystem.EVM:
          return evmAddress

        case Ecosystem.INJECTIVE:
          return evmAddress ? getInjectiveAddress(evmAddress) : undefined

        case Ecosystem.TERRA:
          return terraAddress

        case Ecosystem.OSMOSIS:
          return osmosisAddress

        case Ecosystem.SOLANA:
          return solanaAddress

        case Ecosystem.SUI:
          return suiAddress

        case Ecosystem.DISCORD:
          return data?.user?.hashedUserId
      }
    },
    [
      algorandAddress,
      aptosAddress,
      data?.user?.hashedUserId,
      evmAddress,
      terraAddress,
      osmosisAddress,
      solanaAddress,
      suiAddress,
    ]
  )
}
