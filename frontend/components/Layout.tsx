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

import Link from 'next/link'

type LayoutProps = {
  children: ReactNode
}
export const Layout = ({ children }: LayoutProps) => {
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

  return (
    <>
      <header className="absolute left-0 top-0 z-40 w-full px-1 transition-all lg:px-10">
        <div className=" relative flex items-center justify-between  gap-2 px-4 py-3 lg:py-6 lg:px-10">
          <Link
            href="/"
            className="border-white flex h-12 items-center justify-center border-opacity-60 outline-none sm:border sm:px-4 md:px-[29px]"
          >
            <Image
              src="/wormhole-white.svg"
              alt="wormhole logo"
              layout="intrinsic"
              width={130}
              height={24}
            />
          </Link>
          <div className="border-white flex h-12 flex-1 items-center justify-end border-opacity-60 sm:border sm:px-4 md:px-[29px] ">
            <span className="text-right">
              Please verify that the site URL is:{' '}
              <strong> https://airdrop.wormhole.com</strong>
            </span>
          </div>
        </div>
      </header>
      <div className="relative px-4 pt-20 pb-32 sm:pt-28 lg:pt-40">
        <div className="mx-auto max-w-[997px] justify-between gap-2.5 lg:flex">
          <ul
            className={classNames(
              'mb-2.5 lg:mb-0 lg:max-w-[292px]',
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
                      ? 'bg-darkGray5 text-light'
                      : 'bg-dark text-light-50'
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
    </>
  )
}
