import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const DISCORD_OAUTH = {
  url: '/auth/discord',
  title: 'Discord',
}

// sample response from discord
// http://localhost:3000/discord#token_type=Bearer&access_token=<access-token>&expires_in=604800&scope=identify
// https://discord.com/oauth2/authorize?client_id=<client-id>&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fdiscord&scope=identify
type DiscordResponse = {
  token: string
  error: string
  expires: string
}

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
    token: searchParams.get('access_token') || '',
    error: searchParams.get('error_description') || 'N/A',
    expires: searchParams.get('expires_in') || '0',
  }
}

function expiresAsDate(expires: string): string {
  try {
    const expiresInSeconds = parseInt(expires)
    const now = new Date()
    now.setSeconds(now.getSeconds() + expiresInSeconds)
    return now.toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

export default function Discord() {
  const router = useRouter()
  useEffect(() => {
    const { token = '', error = 'N/A', expires = '0' } = getCodeFromUrl()
    localStorage.setItem('discord.token', token)
    localStorage.setItem('discord.error', error)
    localStorage.setItem('discord.expires', expiresAsDate(expires))
    window.close()
  }, [router])
  return <button onClick={() => window.close()}>Close Window</button>
}
