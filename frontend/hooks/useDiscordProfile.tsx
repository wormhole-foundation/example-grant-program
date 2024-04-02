import { useState, useEffect, useMemo, useCallback } from 'react'
import useDiscordAuth, { DiscordResponse } from './useDiscordAuth'
import useLocalStorage from './useLocalStorage'

const DISCORD_USER_INFO_URL = 'https://discord.com/api/v10/users/@me'

export type DiscordProfile = {
  id: string
  name: string
  image: string
}

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

async function getDiscordUserInfoAndSetProfile(
  signal: AbortSignal,
  token: string,
  setProfile: (profile: DiscordProfile | null) => void
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
  } catch (err) {
    setProfile(null)
  }
}

function isAuthenticated(discord: DiscordResponse | null) {
  return discord?.token && discord?.expires && new Date(discord?.expires) > new Date()
}

export default function useDiscordProfile() {
  const [profile, setProfile] = useState<DiscordProfile | null>(null)
  const [discord, setDiscord] = useLocalStorage<DiscordResponse| null>('discord', null)

  useEffect(() => {
    if (isAuthenticated(discord) && discord?.token && window.location.href !== process.env.NEXT_PUBLIC_DISCORD_CALLBACK_URL) {
      const controller = new AbortController()
      getDiscordUserInfoAndSetProfile(controller.signal, discord.token, setProfile)
      return () => controller.abort()
    }
  }, [discord, setProfile])

  const disconnect = useCallback(() => {
      setProfile(null)
      setDiscord(null)
  }, [setDiscord, setProfile])

  useEffect(() => {
    if (!isAuthenticated(discord)) {
      disconnect()
    }
  }, [discord, disconnect])
  return { profile, disconnect, isAuthenticated: discord !== null }
}
