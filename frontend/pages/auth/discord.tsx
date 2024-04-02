import { useEffect } from 'react'
import useLocalStorage from 'hooks/useLocalStorage'
import { DiscordResponse } from 'hooks/useDiscordAuth'

export const DISCORD_OAUTH = {
  url: '/auth/discord',
  title: 'Discord',
}

// sample response from discord
// http://localhost:3000/discord#token_type=Bearer&access_token=<access-token>&expires_in=604800&scope=identify
// https://discord.com/oauth2/authorize?client_id=<client-id>&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fdiscord&scope=identify

const DISCORD_CALLBACK_URL = process.env.NEXT_PUBLIC_DISCORD_CALLBACK_URL

function getCodeFromUrl(): DiscordResponse {
  const href = window.location.href
  const urlString = href.replace(
    `${DISCORD_CALLBACK_URL}#`,
    `${DISCORD_CALLBACK_URL}?`
  )
  const url = new URL(urlString)
  const searchParams = url.searchParams
  return {
    token: searchParams.get('access_token'),
    error: searchParams.get('error_description'),
    expires: searchParams.get('expires_in'),
  }
}

function expiresAsDate(expires: string | null): string {
  try {
    const expiresInSeconds = parseInt(expires!)
    const now = new Date()
    now.setSeconds(now.getSeconds() + expiresInSeconds)
    return now.toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

export default function Discord() {
  const [_, setDiscord] = useLocalStorage<DiscordResponse | null>('discord', null);
  useEffect(() => {
    const { token, error, expires: strExpires } = getCodeFromUrl()
    setDiscord({ token, error, expires: expiresAsDate(strExpires) })
    // Close window on next tick
    setTimeout(() => window.close())
  }, [setDiscord])
  return <button onClick={() => window.close()}>Close Window</button>
}
