import { Ecosystem } from "@components/Ecosystem";
import { useActivity } from "@components/Ecosystem/ActivityProvider";
import { useCallback, useEffect, useMemo, useState } from "react";

const DISCORD_CALLBACK_URL = process.env.NEXT_PUBLIC_DISCORD_CALLBACK_URL;
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const DISCORD_OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_CALLBACK_URL}&response_type=token&scope=identify`
const DISCORD_USER_INFO_URL = 'https://discord.com/api/v10/users/@me';

function getAvatarUrl(id: string, avatar: string | null, discriminator: string) {
    if (avatar === null) {
        const defaultAvatarNumber = parseInt(discriminator) % 5
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
      } else {
        const format = avatar.startsWith('a_') ? 'gif' : 'png'
        return`https://cdn.discordapp.com/avatars/${id}/${avatar}.${format}`
      }
}

export type DiscordProfile = {
    id: string;
    name: string;
    image: string;
}

export default function useDiscordAuth() {
    const { activity } = useActivity();
    const [token, setToken] = useState<string | null>(null);
    const [profile, setProfile] = useState<DiscordProfile | null>(null);
    const authenticate = useCallback(() => window.open(DISCORD_OAUTH_URL, "_blank"), []);
    const isAuthenticated = useMemo(() => token !== null, [token])

    const clear = useCallback(() => {
        localStorage.removeItem('discord.token');
        localStorage.removeItem('discord.error');
        localStorage.removeItem('discord.expires');
        setToken(null);
        setProfile(null);
    }, []);

    useEffect(() => {
        const expires = new Date(localStorage.getItem('discord.expires') || '');
        if (expires < new Date() || !!!activity[Ecosystem.DISCORD]) {
            clear();
        } else {
            setToken(localStorage.getItem('discord.token'));
        }
    }, [activity, clear]);

    useEffect(() => {
        const controller = new AbortController();
        async function getDiscordUserInfo() {
            const response = await fetch(DISCORD_USER_INFO_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
            });
            if (response.ok) {
                const data = await response.json();
                setProfile({
                    id: data.id,
                    name: data.username,
                    image: getAvatarUrl(data.id, data.avatar, data.discriminator)
                });
            }
        }
        if (isAuthenticated) {
            getDiscordUserInfo();
        }
        return () => {
            controller.abort();
        }
    }, [token, isAuthenticated]);

    useEffect(() => {
        function eventHandler(event: StorageEvent) {
            if (event.key === 'discord.token' && event.newValue) {
                setToken(event.newValue);
            }
        }
        window.addEventListener('storage', eventHandler);
        return () => {
            window.removeEventListener('storage', eventHandler);
        }
    }, []);

    return { authenticate, clear, isAuthenticated, profile };
}