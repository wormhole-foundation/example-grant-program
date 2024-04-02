import useLocalStorage from "./useLocalStorage"
import { useState } from "react"

const DISCORD_CALLBACK_URL = process.env.NEXT_PUBLIC_DISCORD_CALLBACK_URL
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
const DISCORD_OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_CALLBACK_URL}&response_type=token&scope=identify`

export type DiscordResponse = {
    token: string | null
    error: string | null
    expires: string | null
  }

export default function useDiscordAuth() {
    const [discord, setDiscord] = useLocalStorage<DiscordResponse| null>('discord', null);
    const [isConnecting, setIsConnecting] = useState(false)
    const authenticate = () => {
        const discord = window.open(DISCORD_OAUTH_URL, '_blank')
        if (discord) {
            discord.onclose = () => setIsConnecting(false)
        }
    }

    const disconnect = () => {
        setDiscord(null)
    }

    const token = discord?.token;
    return { authenticate, disconnect, isConnecting }
}