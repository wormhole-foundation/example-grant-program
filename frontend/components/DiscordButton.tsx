import { useMemo } from 'react'

import Discord from '@images/discord.inline.svg'

import Image from 'next/image'

type DiscordButtonProps = {
  disableOnAuth?: boolean
}

// NextAuth doesn't have the feature to authenticate in a new window.
// We are opening a popup ourselves with specific pages. These pages
// do the signIn and signOut action on load.
// Please see the page - /discord-login and /discord-logout for more.
const newTab = (url: string, title: string) => {
  const newWindow = window.open(url, title)
  newWindow?.focus()
}

export function DiscordButton({ disableOnAuth }: DiscordButtonProps) {
  // TODO update logic to get discord data from lambda function execution
  const { data = {}, status = '' } = {} as any

  const { logo, text } = useMemo(() => {
    if (status === 'authenticated')
      return {
        logo: data.user?.image ? (
          <Image
            src={data.user?.image}
            alt="user image"
            width={20}
            height={20}
          />
        ) : (
          <Discord />
        ),
        text: data.user?.name ?? 'Signed In',
      }

    return {
      logo: <Discord />,
      text: 'sign in',
    }
  }, [status, data?.user])

  return (
    <button
      className={'wbtn wbtn-secondary'}
      onClick={() => {
        if (status === 'unauthenticated')
          newTab('/discord-login', 'Pyth | Discord')
        if (status === 'authenticated')
          newTab('/discord-logout', 'Pyth | Discord')
      }}
      disabled={disableOnAuth}
    >
      <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
        {logo}
        <span>{text}</span>
      </span>
    </button>
  )
}
