import { useMemo } from 'react'
import Discord from '@images/discord.inline.svg'
import Image from 'next/image'
import useDiscordAuth from 'hooks/useDiscordAuth'

type DiscordButtonProps = {
  disableOnAuth?: boolean
}

export function DiscordButton({ disableOnAuth }: DiscordButtonProps) {
  const { authenticate, clear, isConnecting, isAuthenticated, profile } = useDiscordAuth();

  const { logo, text } = useMemo(() => {
    if (isAuthenticated)
      return {
        logo: profile?.image ? (
          <Image
            src={profile?.image}
            alt="user image"
            width={20}
            height={20}
          />
        ) : (
          <Discord />
        ),
        text: profile?.name ?? 'Signed In',
      }

    return {
      logo: <Discord />,
      text: isConnecting ? 'Connecting ...' : 'sign in',
    }
  }, [isConnecting, isAuthenticated, profile])

  return (
    <button
      className={'wbtn wbtn-secondary min-w-[117px] sm:min-w-[207px]'}
      onClick={() => {
          if(isAuthenticated) {
            clear()
          } else {
            authenticate()
          }
        }
      }
      disabled={disableOnAuth}
    >
      <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
        {logo}
        <span>{text}</span>
      </span>
    </button>
  )
}
