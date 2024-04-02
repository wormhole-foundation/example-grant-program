import { Ecosystem } from '@components/Ecosystem'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { set } from '@coral-xyz/anchor/dist/cjs/utils/features'
import { useCallback, useEffect, useMemo, useState } from 'react'

const DISCORD_CALLBACK_URL = process.env.NEXT_PUBLIC_DISCORD_CALLBACK_URL
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
const DISCORD_OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_CALLBACK_URL}&response_type=token&scope=identify`
const DISCORD_USER_INFO_URL = 'https://discord.com/api/v10/users/@me'

export const DISCORD_EXPIRES_KEY = 'discord.expires'
export const DISCORD_TOKEN_KEY = 'discord.token'
export const DISCORD_ERROR_KEY = 'discord.error'

function getAvatarUrl(
  id: string,
  avatar: string | null,
  discriminator: string
) {
  if (avatar === null) {
    const defaultAvatarNumber = parseInt(discriminator) % 5
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
  } else {
    const format = avatar.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${format}`
  }
}

export type DiscordProfile = {
  id: string
  name: string
  image: string
}

function watchStorageForChange(
  setToken: (token: string) => void,
  setIsConnecting: (isConnecting: boolean) => void
) {
  function onStorageChange(event: StorageEvent) {
    if (event.key === DISCORD_TOKEN_KEY && event.newValue) {
      setToken(event.newValue)
      window.removeEventListener('storage', onStorageChange)
    }
    setIsConnecting(false)
  }
  window.addEventListener('storage', onStorageChange)
  return () => {
    window.removeEventListener('storage', onStorageChange)
  }
}

function verifyIfTokenIsExpired(
  isActivitySelected: boolean,
  setToken: (token: string) => void,
  clear: () => void
) {
  const expires = localStorage.getItem(DISCORD_EXPIRES_KEY)
  const token = localStorage.getItem(DISCORD_TOKEN_KEY)
  const expiresDate = expires ? new Date(expires) : new Date()
  if (expiresDate < new Date() || !isActivitySelected) {
    clear()
  } else if (token) {
    setToken(token)
  }
}

async function getDiscordUserInfoAndSetProfile(
  signal: AbortSignal,
  token: string,
  setProfile: (profile: DiscordProfile) => void,
  setIsConnecting: (isConnecting: boolean) => void
) {
  try {
    const response = await fetch(DISCORD_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    })
    if (response.ok) {
      const data = await response.json()
      setProfile({
        id: data.id,
        name: data.username,
        image: getAvatarUrl(data.id, data.avatar, data.discriminator),
      })
    }
  } finally {
    setIsConnecting(false)
  }
}

export default function useDiscordAuth2() {
  const { activity } = useActivity()
  const [token, setToken] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [profile, setProfile] = useState<DiscordProfile | null>(null)
  const authenticate = useCallback(() => {
    window.open(DISCORD_OAUTH_URL, '_blank')
    setIsConnecting(true)
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(DISCORD_TOKEN_KEY)
    localStorage.removeItem(DISCORD_ERROR_KEY)
    localStorage.removeItem(DISCORD_EXPIRES_KEY)
    setToken(null)
    setProfile(null)
  }, [])

  //Verify if token is expired
  const isActivitySelected = useMemo(
    () => !!activity[Ecosystem.DISCORD],
    [activity]
  )
  useEffect(
    () => verifyIfTokenIsExpired(isActivitySelected, setToken, clear),
    [isActivitySelected, clear]
  )

  // We assume if we have a token we are authenticated
  const isAuthenticated = useMemo(() => token !== null, [token])

  //Watch local storage changes and fire setToken on first change
  useEffect(() => watchStorageForChange(setToken, setIsConnecting), [])

  //Fetch user info from Discord
  const getDiscordUserInfo = useCallback(() => {
    const controller = new AbortController()
    if (token && isAuthenticated) {
      getDiscordUserInfoAndSetProfile(
        controller.signal,
        token,
        setProfile,
        setIsConnecting
      )
    }
    return () => {
      controller.abort()
    }
  }, [token, isAuthenticated])
  // Fetch user info on getDiscordUserInfo change, that should mutate on token or isAuthenticated change
  useEffect(() => getDiscordUserInfo(), [getDiscordUserInfo])

  return { authenticate, clear, isConnecting, isAuthenticated, profile, token }
}
