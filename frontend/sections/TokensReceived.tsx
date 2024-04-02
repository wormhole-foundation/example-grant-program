import W from '@images/wtoken.inline.svg'

import { Box } from '@components/Box'
import { Button } from '@components/buttons/Button'
import { resetLocalState } from 'utils/store'
import { BoxTitle } from '@components/BoxTitle'
import Subscribe from '@components/Subscribe'

export type TokensReceivedProps = {
  totalCoinsClaimed: string | null
}
export const TokensReceived = ({ totalCoinsClaimed }: TokensReceivedProps) => {
  return (
    <>
      <Box>
        <BoxTitle>
          <div className="flex items-center justify-between">
            <h4 className="sm:text-[28px] ">Congratulations!</h4>
            <Button
              onClick={() => {
                resetLocalState()
                location.replace('/')
              }}
              type={'secondary'}
            >
              Claim Again
            </Button>
          </div>
        </BoxTitle>
        <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
          <h3 className="mb-8 flex items-center gap-2 font-header text-[36px] font-light">
            You Received{' '}
            <span className="flex items-center gap-2 font-bold">
              {totalCoinsClaimed === null ? (
                'N/A'
              ) : (
                <>
                  {totalCoinsClaimed} <W />
                </>
              )}
            </span>
          </h3>
          <p className="mb-6">
            Thank you for participating in this Wormhole airdrop.
          </p>
          <p>Stay up to date with Wormhole by subscribing to the newsletter.</p>

          <div className="mt-6 border border-light-25 bg-black bg-opacity-30 px-8 pb-1 pt-8">
            <Subscribe />
          </div>
        </div>
      </Box>
    </>
  )
}
