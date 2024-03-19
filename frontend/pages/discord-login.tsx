import { Box } from '@components/Box'
//import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import Loader from '@images/loader.inline.svg'

function signIn(provider: string) {
  console.log('dummmy sign-in', provider)
}

const DiscordLogin = () => {
  // TODO update logic to get discord data from lambda function execution
  // const { data: session, status } = useSession()
  const { session, status } = {} as any

  useEffect(() => {
    if (!(status === 'loading') && !session) void signIn('discord')
    if (session) window.close()
  }, [session, status])

  return (
    <Box>
      <div className="flex h-128 items-center justify-center">
        <Loader />
      </div>
    </Box>
  )
}

export default DiscordLogin
