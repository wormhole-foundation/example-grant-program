import React, { useEffect, useMemo, useState } from 'react'
import Coin from '@images/coin.inline.svg'

import { Ecosystem } from '@components/Ecosystem'
import { EcosystemClaimState } from './SignAndClaim'

import Loader from '@images/loader.inline.svg'
import Failed from '@images/unsuccessful.inline.svg'
import Success from '@images/successful.inline.svg'
import { useTotalGrantedCoins } from 'hooks/useTotalGrantedCoins'
import { ProceedButton } from '@components/buttons'
import { SignAndClaimRowLayout } from '@components/table/SignAndClaimRowLayout'
import { Box } from '@components/Box'
import Tooltip from '@components/Tooltip'
import { TotalAllocationRow } from '@components/table/TotalAllocationRow'
import { BoxTitle } from '@components/BoxTitle'
import { ErrorModal } from '@components/modal/ErrorModal'

export const ClaimStatus = ({
  onProceed,
  ecosystemsClaimState,
}: {
  onProceed: () => void
  // This will be defined if the claims were submitted
  ecosystemsClaimState: { [key in Ecosystem]?: EcosystemClaimState } | undefined
}) => {
  const totalGrantedCoins = useTotalGrantedCoins()
  const [isProceedDisabled, setIsProceedDisabled] = useState(true)
  const [proceedTooltipContent, setProceedTooltipContent] = useState<string>()
  const [modal, showModal] = useState(false)

  // disable proceed
  useEffect(() => {
    if (ecosystemsClaimState !== undefined) {
      let isAnyProccessing = false
      let hasErrors = false
      // if a claim submission is still proceesing
      Object.values(ecosystemsClaimState).forEach((ecosystemClaimState) => {
        if (ecosystemClaimState.error === undefined) isAnyProccessing = true
        else if (ecosystemClaimState.error) hasErrors = true
      })

      if (isAnyProccessing) {
        setIsProceedDisabled(true)
        setProceedTooltipContent('processing')
      } else {
        setIsProceedDisabled(false)
        setProceedTooltipContent(undefined)
      }

      if (hasErrors) {
        showModal(true)
      }
    }
  }, [ecosystemsClaimState])

  return (
    <>
      <Box>
        <BoxTitle>
          <div className="flex items-center justify-between ">
            <h4 className=" text-[20px] sm:text-[28px]">Sign and Claim</h4>
            <div className="flex gap-4">
              <ProceedButton
                onProceed={onProceed}
                disabled={isProceedDisabled}
                tooltipContent={proceedTooltipContent}
              />
            </div>
          </div>
        </BoxTitle>
        <table className="">
          <tbody>
            {Object.values(Ecosystem).map((ecosystem) => (
              <SignAndClaimRowLayout ecosystem={ecosystem} key={ecosystem}>
                {ecosystemsClaimState?.[ecosystem] !== undefined && (
                  <ClaimState
                    ecosystemClaimState={ecosystemsClaimState?.[ecosystem]!}
                  />
                )}
              </SignAndClaimRowLayout>
            ))}
            <TotalAllocationRow totalGrantedCoins={totalGrantedCoins} />
          </tbody>
        </table>
      </Box>
      {modal && <ErrorModal showModal={showModal} />}
    </>
  )
}

function ClaimState({
  ecosystemClaimState,
}: {
  ecosystemClaimState: EcosystemClaimState
}) {
  const { error } = ecosystemClaimState

  const text = useMemo(() => {
    if (error === undefined) return 'Claiming...'
    if (error === null) return 'Claimed'
    if (error) return 'Unsuccessful'
  }, [error])

  const icon = useMemo(() => {
    if (error === undefined) return <Loader />
    if (error === null) return <Success />
    if (error) return <Failed />
  }, [error])

  const tooltipContent = useMemo(() => {
    if (error === undefined) return undefined
    if (error === null) return 'Successfully claimed'
    if (error)
      return (
        // error.message ??
        // 'There was some error while claiming. Please refresh the page and try again.'
        'Solana is currently experiencing congestion and was unable to include your transaction. Please try again in a few minutes.'
      )
  }, [error])

  const lowOpacity = error === undefined ? 'opacity-50' : ''

  return (
    <Tooltip content={tooltipContent}>
      <span
        className={`flex items-center justify-between gap-1 text-base ${lowOpacity}`}
      >
        {text} {icon}
      </span>
    </Tooltip>
  )
}
