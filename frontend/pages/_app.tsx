import { AptosWalletProvider } from '@components/wallets/Aptos'
import { SolanaWalletProvider } from '@components/wallets/Solana'
import type { AppProps } from 'next/app'
import { FC, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { WalletKitProvider as SuiWalletProvider } from '@mysten/wallet-kit'
import { DefaultSeo } from 'next-seo'
import SEO from '../next-seo.config'
import { Toaster } from 'react-hot-toast'
import { EVMWalletProvider } from '@components/wallets/EVM'
import { CosmosWalletProvider } from '@components/wallets/Cosmos'
import { SessionProvider } from 'next-auth/react'
import { EcosystemProviders } from '@components/Ecosystem'
import type { Metadata } from 'next'

import '../styles/globals.css'
import { SeiProvider } from '@components/wallets/Sei'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Layout } from '@components/Layout'
import { Disclaimer } from '@components/modal/Disclaimer'

import {
  DisclaimerCheckStore,
  PathnameStore,
  resetOnVersionMismatch,
} from 'utils/store'

function useRedirect(isVersionChecked: boolean) {
  // We are fetching it here and not in useEffect
  // As we need this before it is being reset
  const lastStep = useMemo(() => {
    return PathnameStore.get()
  }, [])

  const pathname = usePathname()
  const params = useSearchParams()

  const router = useRouter()
  // We will only redirect on the first load
  useLayoutEffect(() => {
    if (!isVersionChecked) return
    // These pathnames are being loaded when we have to oauth with Discord
    // We shouldn't be redirecting the user from these pages
    if (pathname === '/discord-login' || pathname === '/discord-logout') return

    //RULES:
    // 1. no last state -> redirect to welcome page
    // 2. there is a last state -> redirect to that page
    if (lastStep === null) router.replace('/')
    if (lastStep) router.replace(lastStep)
  }, [isVersionChecked])

  useEffect(() => {
    if (!isVersionChecked) return
    // If the pathname for the current page is the once used for discord oauth,
    // don't store it.
    if (pathname === '/discord-login' || pathname === '/discord-logout') return
    else
      PathnameStore.set(
        `${pathname}${params.toString() ? '?' + params.toString() : ''}`
      )
  }, [params, pathname, isVersionChecked])
}

export const metadata: Metadata = {
  title: 'Wormhole Airdrop',
  description:
    'Wormhole is the #1 ranked cross chain messaging platform that allows developers to build decentralized applications that span the entire blockchain ecosystem.',
  openGraph: {
    images: [
      'https://airdrop.wormhole.com/branding/wormhole-airdrop-og-image.png',
    ],
  },
}

const App: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
  const router = useRouter()
  const [disclaimerWasRead, setDisclaimerWasRead] = useState(false)

  const [isVersionChecked, setIsVersionChecked] = useState(false)

  // check if there is a version mismatch, if it is reload after reset
  // if no setIsVersionChecked to true, which will be used to render other things
  useLayoutEffect(() => {
    resetOnVersionMismatch(() => router.replace('/'))
    setIsVersionChecked(true)
  }, [router])

  useLayoutEffect(() => {
    if (isVersionChecked) {
      const wasRead = DisclaimerCheckStore.get()
      if (wasRead === 'true') setDisclaimerWasRead(true)
    }
  }, [isVersionChecked])

  useRedirect(isVersionChecked)

  return (
    <>
      {isVersionChecked ? (
        <SessionProvider>
          <SolanaWalletProvider>
            <AptosWalletProvider>
              <SuiWalletProvider>
                <EVMWalletProvider>
                  <CosmosWalletProvider>
                    <SeiProvider>
                      {/* WARN: EcosystemProviders might use wallet provider addresses and hence
                 They should be inside all those providers. */}
                      <EcosystemProviders>
                        <Layout>
                          <DefaultSeo {...SEO} />
                          <Component {...pageProps} />
                        </Layout>
                        <Toaster
                          position="bottom-left"
                          toastOptions={{
                            style: {
                              wordBreak: 'break-word',
                            },
                          }}
                          reverseOrder={false}
                        />
                        <Disclaimer
                          showModal={!disclaimerWasRead}
                          onAgree={() => {
                            DisclaimerCheckStore.set('true')
                            setDisclaimerWasRead(true)
                          }}
                        />
                      </EcosystemProviders>
                    </SeiProvider>
                  </CosmosWalletProvider>
                </EVMWalletProvider>
              </SuiWalletProvider>
            </AptosWalletProvider>
          </SolanaWalletProvider>
        </SessionProvider>
      ) : (
        <></>
      )}
    </>
  )
}

export default App
