import {
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSolanaAddress,
  useSuiAddress,
  useAlgorandAddress,
} from './useAddress'

import { Ecosystem } from '@components/Ecosystem'
import { useCallback } from 'react'
import { getInjectiveAddress } from '../utils/getInjectiveAddress'
import useDiscordAuth from './useDiscordAuth'

// It will return a function that can be used to get the identity of a given ecosystem
// The function will return the identity if the ecosystem is connected
// Else it will return undefined
export function useGetEcosystemIdentity() {
  const aptosAddress = useAptosAddress()
  const evmAddress = useEVMAddress()
  const osmosisAddress = useCosmosAddress('osmosis')
  const terraAddress = useCosmosAddress('terra')
  const solanaAddress = useSolanaAddress()
  const suiAddress = useSuiAddress()
  const algorandAddress = useAlgorandAddress()
  // TODO update logic to get discord data from lambda function execution
  // const { data } = useSession()
  const data = {} as any
  const { profile } = useDiscordAuth();

  return useCallback(
    (ecosystem: Ecosystem) => {
      switch (ecosystem) {
        case Ecosystem.APTOS:
          return aptosAddress

        case Ecosystem.EVM:
          return evmAddress

        case Ecosystem.INJECTIVE:
          return evmAddress ? getInjectiveAddress(evmAddress) : undefined

        case Ecosystem.OSMOSIS:
          return osmosisAddress

        case Ecosystem.TERRA:
          return terraAddress

        case Ecosystem.SOLANA:
          return solanaAddress

        case Ecosystem.SUI:
          return suiAddress

        case Ecosystem.DISCORD:
          return profile?.id

        case Ecosystem.ALGORAND:
          return algorandAddress
      }
    },
    [
      aptosAddress,
      profile,
      evmAddress,
      osmosisAddress,
      terraAddress,
      solanaAddress,
      suiAddress,
      algorandAddress,
    ]
  )
}
