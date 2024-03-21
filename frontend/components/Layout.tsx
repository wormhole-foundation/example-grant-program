import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

import { useRouter } from 'next/router'
import { WELCOME_METADATA } from 'pages'
import { NEXT_STEPS } from 'pages/next-steps'
import { REVIEW_ELIGIBILITY_METADATA } from 'pages/review-eligibility'
import { VERIFY_ELIGIBILITY_METADATA } from 'pages/verify-eligibility'
import { LOGIN_SOLANA_METADATA } from 'pages/login-solana'
import { CLAIM_TOKENS_METADATA } from 'pages/claim-tokens'
import { classNames } from 'utils/classNames'
import SocialIcons from '@components/SocialIcons'

import Link from 'next/link'

type LayoutProps = {
  children: ReactNode
  setDisclaimerWasRead: Function
}
export const Layout = ({ children, setDisclaimerWasRead }: LayoutProps) => {
  const pathname = usePathname()
  const router = useRouter()

  const disableSideNav = process.env.NODE_ENV === 'production'

  // Layout works with few pages link given in below map.
  // A map of url, title, and image
  const urlMap = [
    WELCOME_METADATA,
    REVIEW_ELIGIBILITY_METADATA,
    VERIFY_ELIGIBILITY_METADATA,
    LOGIN_SOLANA_METADATA,
    CLAIM_TOKENS_METADATA,
    NEXT_STEPS,
  ]

  const today = new Date()
  const year = today.getFullYear()

  return (
    <>
      <header className="absolute left-0 top-0 z-40 w-full px-1 transition-all lg:px-10">
        <div className=" relative flex items-center justify-between  gap-2 px-4 py-3 lg:py-6 lg:px-10">
          <Link
            href="/"
            className="flex h-12 items-center justify-center border-light border-opacity-60 outline-none sm:border sm:px-4 md:px-[29px]"
          >
            <Image
              src="/wormhole-white.svg"
              alt="wormhole logo"
              width={130}
              height={24}
            />
          </Link>
          <div className="flex h-12 flex-1 items-center justify-end border-light border-opacity-60 sm:border sm:px-4 md:px-[29px] ">
            <span className="text-right">
              Please verify that the site URL is:{' '}
              <strong> https://airdrop.wormhole.com</strong>
            </span>
          </div>
        </div>
      </header>
      <div className="relative min-h-[calc(100vh-80px)] px-4 pt-20 pb-32 sm:pt-28 lg:pt-40">
        <div className="mx-auto max-w-[997px] items-start justify-between gap-2.5 lg:flex">
          <ul
            className={classNames(
              'mb-2.5 divide-y divide-light  divide-opacity-25 border border-light border-opacity-25 lg:mb-0 lg:max-w-[292px]',
              disableSideNav ? 'pointer-events-none' : ''
            )}
          >
            {urlMap.map(({ url, title }, index) => {
              let isActive = false
              if (url === '/' && pathname === '/') isActive = true
              if (url !== '/' && pathname.startsWith(url)) isActive = true
              return (
                <li
                  key={url}
                  className={`claim_li ${
                    isActive
                      ? ' bg-black bg-opacity-60'
                      : ' bg-black   bg-opacity-30'
                  }`}
                  role="button"
                  onClick={() => router.push(url)}
                >
                  <span>{index + 1}</span> {title}
                </li>
              )
            })}
          </ul>
          <div className="flex-1 overflow-auto">
            {children}

            <div className="mt-6">
              <p className="font-body text-[15px] ">
                Useful links:{' '}
                <Link
                  href="https://wormhole.com/airdrop/faq"
                  className="ml-5 inline-block underline"
                >
                  FAQ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="footer">
        <span>{year} Ⓒ Wormhole. All Rights Reserved.</span>
        <span className="mb-2 flex-1 space-x-10 border-white border-opacity-50 py-2 text-center opacity-75 lg:mb-0 lg:ml-10 lg:border-l lg:py-0 lg:pl-10 lg:text-left">
          <a
            target="_blank"
            rel="noreferrer"
            href="https://wormhole.com/terms"
            className="hover:underline hover:opacity-100"
          >
            Terms of Use
          </a>
          <button
            className="opacity-75 hover:underline hover:opacity-100"
            onClick={() => {
              setDisclaimerWasRead(false)
            }}
          >
            Supplemental Token Airdrop Terms
          </button>
        </span>
        <div className="mb-5 flex items-center gap-6 lg:mb-0">
          <Link
            href="https://twitter.com/wormholecrypto"
            target="_blank"
            rel="noreferrer"
          >
            <SocialIcons icon="twitter" width={21} height={22} />
          </Link>
          <Link
            href="https://t.me/wormholecrypto"
            target="_blank"
            rel="noreferrer"
          >
            <SocialIcons icon="telegram" width={20} height={18} />
          </Link>
          <Link
            href="https://github.com/wormhole-foundation"
            target="_blank"
            rel="noreferrer"
          >
            <SocialIcons icon="github" width={21} height={21} />
          </Link>
          <Link
            href="https://docs.wormhole.com"
            target="_blank"
            rel="noreferrer"
          >
            <SocialIcons icon="book" width={25} height={19} />
          </Link>
          <Link
            href="https://www.youtube.com/@wormholecrypto"
            target="_blank"
            rel="noreferrer"
          >
            <SocialIcons icon="youtube" width={21} height={15} />
          </Link>
        </div>
      </footer>
    </>
  )
}
