import { signOut, useSession } from 'next-auth/react'
import { useEffect } from 'react'

const DiscordLogin = () => {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (!(status === 'loading') && session) void signOut()
    if (session === null) window.close()
  }, [session, status])

  return <></>
}

export default DiscordLogin