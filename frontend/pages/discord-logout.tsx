import { Box } from '@components/Box'
//import { signOut, useSession } from 'next-auth/react'
import Loader from '@images/loader.inline.svg'
import { useEffect } from 'react'

function signOut() {
  console.log('dummy sign-out')
}

const DiscordLogout = () => {
  // TODO update logic to get discord data from lambda function execution
  // const { data: session, status } = useSession()
  const { session, status } = {} as any
  useEffect(() => {
    if (!(status === 'loading') && session) void signOut()
    if (session === null) window.close()
  }, [session, status])

  return (
    <Box>
      <div className="flex h-128 items-center justify-center">
        <Loader />
      </div>
    </Box>
  )
}

export default DiscordLogout
