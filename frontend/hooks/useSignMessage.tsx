import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useCallback } from 'react'
import { useAccount, useSignMessage as useWagmiSignMessage } from 'wagmi'
import {
  SignedMessage,
  evmBuildSignedMessage,
  cosmwasmBuildSignedMessage,
  aptosBuildSignedMessage,
  suiBuildSignedMessage,
  algorandBuildSignedMessage,
  injectiveBuildSignedMessage,
} from 'claim_sdk/ecosystems/signatures'
import { Ecosystem } from '@components/Ecosystem'
import { fetchDiscordSignedMessage } from 'utils/api'
import { useTokenDispenserProvider } from './useTokenDispenserProvider'
import { ChainName } from '@components/wallets/Cosmos'
import { useWallet as useAlgorandWallet } from '@components/Ecosystem/AlgorandProvider'
import useDiscordAuth from './useDiscordAuth'
import { publicKey } from '@coral-xyz/anchor/dist/cjs/utils'
import { getUncompressedPubkey } from 'claim_sdk/ecosystems/cosmos'
import { uncompressedToEvmPubkey } from 'claim_sdk/ecosystems/evm'

// SignMessageFn signs the message and returns it.
// It will return undefined:
// 1. If wallet is not connected.
// 2. If the user denies the sign request.
// 3. If there is some error. This is an edge case which happens rarely.
// We don't know of any special case we should handle right now.
export type SignMessageFn = (
  payload: string
) => Promise<SignedMessage | undefined>

// This hook returns a function to sign message for the Aptos wallet.
export function useAptosSignMessage(nonce = 'nonce'): SignMessageFn {
  const { signMessage, connected, account } = useAptosWallet()

  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (connected === false || !account) return

        const { signature, fullMessage } =
          (await signMessage({
            message: payload,
            nonce,
          })) ?? {}

        // Discard multisigs
        if (
          typeof signature != 'string' ||
          typeof account.publicKey != 'string' ||
          !fullMessage
        )
          return

        return aptosBuildSignedMessage(account.publicKey, signature, payload)
      } catch (e) {
        console.error(e)
      }
    },
    [connected, account, signMessage, nonce]
  )
  return signMessageCb
}

export function useInjectiveSignMessage(): SignMessageFn {
  const { address, isWalletConnected, getAccount } = useChainWallet(
    'injective',
    'keplr-extension'
  )
  const signMessageCb = useCallback(
    async (payload: string) => {
      if (address === undefined || isWalletConnected === false) return
      const account = await getAccount()
      const uncompressedPublicKey = getUncompressedPubkey(account.pubkey)
      const evmPubkey = uncompressedToEvmPubkey(uncompressedPublicKey)
      const signature = await (window as any).keplr.signEthereum(
        'injective-1',
        address,
        payload,
        'message'
      )
      return injectiveBuildSignedMessage(
        Buffer.from(evmPubkey),
        signature,
        payload
      )
    },
    [address, getAccount, isWalletConnected]
  )
  return signMessageCb
}

// This hook returns a function to sign message for the Cosmos wallet.
export function useCosmosSignMessage(
  chainName: ChainName,
  walletName: string = 'keplr-extension'
): SignMessageFn {
  const { signArbitrary, address, isWalletConnected } = useChainWallet(
    chainName,
    walletName
  )

  const signMessageCb = useCallback(
    async (payload: string) => {
      // Wallets have some weird edge cases. There may be a case where the
      // wallet is connected but the address is undefined.
      // Using both in this condition to handle those.
      try {
        if (address === undefined || isWalletConnected === false) return

        const { pub_key, signature: signatureBase64 } = await signArbitrary(
          address,
          payload
        )
        return cosmwasmBuildSignedMessage(
          pub_key,
          address,
          payload,
          signatureBase64
        )
      } catch (e) {
        console.error(e)
      }
    },
    [address, isWalletConnected, signArbitrary]
  )
  return signMessageCb
}

// This hook returns a function to sign message for the EVM wallet.
export function useEVMSignMessage(): SignMessageFn {
  const { signMessageAsync } = useWagmiSignMessage()
  const { isConnected: isWalletConnected, address } = useAccount()
  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (
          signMessageAsync === undefined ||
          isWalletConnected === false ||
          !address
        )
          return
        const response = await signMessageAsync({ message: payload })
        return evmBuildSignedMessage(response, address, payload)
      } catch (e) {
        console.error(e)
      }
    },
    [signMessageAsync, isWalletConnected, address]
  )

  return signMessageCb
}

// This hook returns a function to sign message for the Solana wallet.
export function useSolanaSignMessage(): SignMessageFn {
  const { connected, signMessage, publicKey } = useSolanaWallet()
  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (signMessage === undefined || connected === false || !publicKey)
          return
        const signature = await signMessage(Buffer.from(payload))
        return {
          publicKey: publicKey.toBytes(),
          signature: signature,
          recoveryId: undefined,
          fullMessage: Buffer.from(payload, 'utf-8'),
        }
      } catch (e) {
        console.error(e)
      }
    },
    [signMessage, connected, publicKey]
  )

  return signMessageCb
}

// This hook returns a function to sign message for the Sui wallet.
export function useSuiSignMessage(): SignMessageFn {
  const { signMessage, isConnected, currentAccount } = useWalletKit()

  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        // Here is one edge case. Even if the wallet is connected the currentAccount
        // can be null and hence we can't sign a message. Calling signMessage when
        // currentAccount is null throws an error.
        if (isConnected === false || currentAccount === null) return
        const response = (
          await signMessage({
            message: Buffer.from(payload),
          })
        ).signature
        return suiBuildSignedMessage(response, payload)
      } catch (e) {
        console.error(e)
      }
    },
    [isConnected, signMessage, currentAccount]
  )

  return signMessageCb
}

export function useDiscordSignMessage(): SignMessageFn {
  const tokenDispenser = useTokenDispenserProvider()
  const { token } = useDiscordAuth()
  return useCallback(async () => {
    if (tokenDispenser?.claimant === undefined || token === null) return
    return await fetchDiscordSignedMessage(tokenDispenser.claimant, token)
  }, [tokenDispenser?.claimant, token])
}

// This hook returns a function to sign message for the Algorand wallet.
export function useAlgorandSignMessage(): SignMessageFn {
  const { signMessage, connected, account } = useAlgorandWallet()

  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (connected === false || !account) return

        const signature = await signMessage(payload)

        return algorandBuildSignedMessage(account, signature, payload)
      } catch (e) {
        console.error(e)
      }
    },
    [connected, account, signMessage]
  )
  return signMessageCb
}

// A wrapper around all the sign message hooks
export function useSignMessage(ecosystem: Ecosystem): SignMessageFn {
  const aptosSignMessageFn = useAptosSignMessage()
  const evmSignMessageFn = useEVMSignMessage()
  const injectiveSignMessageFn = useInjectiveSignMessage()
  const osmosisSignMessageFn = useCosmosSignMessage('osmosis')
  const terraSignMessageFn = useCosmosSignMessage('terra')
  const suiSignMessageFn = useSuiSignMessage()
  const solanaSignMessageFn = useSolanaSignMessage()
  const discordSignMessageFn = useDiscordSignMessage()
  const algorandSignMessageFn = useAlgorandSignMessage()

  switch (ecosystem) {
    case Ecosystem.APTOS:
      return aptosSignMessageFn
    case Ecosystem.EVM:
      return evmSignMessageFn
    case Ecosystem.INJECTIVE:
      return injectiveSignMessageFn
    case Ecosystem.TERRA:
      return terraSignMessageFn
    case Ecosystem.OSMOSIS:
      return osmosisSignMessageFn
    case Ecosystem.SOLANA:
      return solanaSignMessageFn
    case Ecosystem.SUI:
      return suiSignMessageFn
    case Ecosystem.DISCORD:
      return discordSignMessageFn
    case Ecosystem.ALGORAND:
      return algorandSignMessageFn
  }
}
