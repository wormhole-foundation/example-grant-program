import SocialIcons from '@components/SocialIcons'
import W from '@images/w.inline.svg'
import Wormhole from '@images/wormhole.inline.svg'
import Link from 'next/link'

type LayoutProps = {
  setDisclaimerWasRead: Function
}

export const AirdropEnd = ({ setDisclaimerWasRead }: LayoutProps) => {
  const today = new Date()
  const year = today.getFullYear()

  return (
    <>
      <header className="absolute left-0 top-0 z-40 w-full py-3 transition-all  lg:py-6 xl:px-10">
        <div className=" relative flex items-center justify-between  gap-2 px-4  lg:px-10 ">
          <Link
            href="/"
            className="flex items-center justify-center  border-light border-opacity-60 outline-none sm:h-12 sm:border sm:px-4 md:px-[29px]"
          >
            <W className="block sm:hidden" />
            <Wormhole className="hidden  sm:block" />
          </Link>
          <div className="flex h-12 flex-1 items-center justify-end border-light border-opacity-60 sm:border sm:px-4 md:px-[29px] ">
            <span className="text-right">
              Please verify that the site URL is:{' '}
              <strong> https://airdrop.wormhole.com</strong>
            </span>
          </div>
        </div>
      </header>
      <div className="relative min-h-[calc(100vh-80px)] content-center px-4 pb-32 pt-40">
        <div className="text-center">
          <h2 className="font-heading font-bold" style={{ fontSize: '1.5em'}}>
            The airdrop claim period has ended
          </h2>
          <p>
            To stay in touch with future Wormhole community initiatives head
            over to our{' '}
            <a className="font-bold hover:underline hover:opacity-100" href="https://discord.gg/invite/wormholecrypto">Discord</a>{' '}
          </p>
        </div>
      </div>
      <footer className="footer">
        <span>{year} Ⓒ Wormhole. All Rights Reserved.</span>
        <span className="mb-2 flex-1 space-y-2 border-white border-opacity-50 py-2 text-center opacity-75 md:space-x-10 md:space-y-0 lg:mb-0 lg:ml-10 lg:border-l lg:py-0 lg:pl-10 lg:text-left">
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
            href="https://twitter.com/wormhole"
            target="_blank"
            rel="noreferrer"
          >
            <SocialIcons icon="twitter" width={21} height={22} />
          </Link>
          <Link
            href="https://discord.gg/wormholecrypto"
            target="_blank"
            rel="noreferrer"
          >
            <SocialIcons icon="discord" width={28} height={21} />
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
