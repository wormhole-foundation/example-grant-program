import { Box } from '@components/Box'
import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import Modal from '@components/Modal'
import { BackButton, ProceedButton } from '@components/buttons'
import { SolanaWalletCopyButton } from '@components/buttons/SolanaWalletCopyButton'
import { BN } from '@coral-xyz/anchor'
import { ClaimInfo } from 'claim_sdk/claim'
import { SignedMessage } from 'claim_sdk/ecosystems/signatures'
import {
  ERROR_CRAFTING_TX,
  ERROR_FUNDING_TX,
  ERROR_RPC_CONNECTION,
  ERROR_SIGNING_TX,
} from 'claim_sdk/solana'
import { useGetClaim } from 'hooks/useGetClaim'
import { useTokenDispenserProvider } from 'hooks/useTokenDispenserProvider'
import { useCallback, useState } from 'react'
import { toStringWithDecimals } from 'utils/toStringWithDecimals'
import { ClaimStatus } from './ClaimStatus'
import { SignForEligibleWallets } from './SignForEligibleWallets'
import { StepProps } from './common'
import { PathnameStore } from 'utils/store'
import { BoxTitle } from '@components/BoxTitle'
import { TransactionError } from '@solana/web3.js'

// Following the convention,
// If error is:
// - undefined, the transaction hasn't landed yet
// - null, the transaction has been successful
// - defined, the transaction has failed
export type EcosystemClaimState = {
  error: Error | undefined | null
}

type SignAndClaimProps = {
  onBack: () => void
  onProceed: (totalTokensClaimed: string) => void
}

export const SignAndClaim = ({ onBack, onProceed }: SignAndClaimProps) => {
  const [modal, openModal] = useState(false)
  const [screen, setScreen] = useState(1)
  const tokenDispenser = useTokenDispenserProvider()
  const [ecosystemsClaimState, setEcosystemsClaimState] =
    useState<{ [key in Ecosystem]?: EcosystemClaimState }>()
  const getClaim = useGetClaim()
  const { getEligibility } = useEligibility()

  const totalCoinsClaimed = useCallback(() => {
    if (ecosystemsClaimState !== undefined) {
      let totalCoinsClaimed = new BN(0)
      Object.keys(ecosystemsClaimState).forEach((ecosystem) => {
        if (ecosystemsClaimState[ecosystem as Ecosystem]?.error === null) {
          const eligibility = getEligibility(ecosystem as Ecosystem)
          if (eligibility?.claimInfo.amount !== undefined)
            totalCoinsClaimed = totalCoinsClaimed.add(
              eligibility?.claimInfo.amount
            )
        }
      })
      return toStringWithDecimals(totalCoinsClaimed)
    } else return 'N/A'
  }, [ecosystemsClaimState, getEligibility])

  // Calculating total tokens that has been claimed
  // using the ecosystemsClaimState
  const onProceedWrapper = useCallback(() => {
    onProceed(totalCoinsClaimed())
  }, [onProceed, totalCoinsClaimed])

  const getSuccessfulProviderSubmit = useCallback(async (ecosystemPromises: Promise<TransactionError | null>[]): Promise<TransactionError | null> => {
    const resolvedProviderPromises = await Promise.all(ecosystemPromises);

    // find the first rpc provider submit that is successful (i.e. null error)
    // or grab the first one if all failed
    return resolvedProviderPromises.find(error => error === null) || resolvedProviderPromises[0];
  }, [])

  const submitTxs = useCallback(async () => {
    window.onbeforeunload = (e) => {
      e.preventDefault()
      return ''
    }
    // This checks that the solana wallet is connected
    if (tokenDispenser === undefined) return
    const ecosystems: Ecosystem[] = []
    const claims: {
      signedMessage: SignedMessage | undefined
      claimInfo: ClaimInfo
      proofOfInclusion: Uint8Array[]
    }[] = []

    // Since we are fetching claim for only those ecosystem which are connected
    // and as we have checked that a solana wallet is connected in above step
    // `getClaim` call should not return undefined
    Object.values(Ecosystem).forEach((ecosystem) => {
      const claim = getClaim(ecosystem)
      if (claim !== undefined) {
        claims.push(claim)
        ecosystems.push(ecosystem)
      }
    })

    const stateObj: { [key in Ecosystem]?: EcosystemClaimState } = {}
    ecosystems.forEach((ecosystem) => {
      stateObj[ecosystem] = {
        error: undefined,
      }
    })
    setEcosystemsClaimState(stateObj)

    let totalCoinsClaimed = new BN(0)
    let broadcastPromises: Promise<TransactionError | null>[][]
    try {
      broadcastPromises = await tokenDispenser?.submitClaims(
        claims.map((claim) => ({
          ...claim,
        }))
      )
    } catch (e) {
      const err = e as Error
      let message: string
      if (
        err.message === ERROR_SIGNING_TX ||
        err.message === ERROR_FUNDING_TX
      ) {
        message = `There was an error while signing the transaction. Please refresh this page and try again. Note: You will not lose your progress when you refresh.`
      } else if (err.message === ERROR_CRAFTING_TX) {
        message =
          'There was a problem while crafting the transaction. Please wait a few minutes before trying again. Note: You will not lose your progress if you refresh this page.'
      } else {
        message = `Try claiming your tokens again by refreshing your browser. If the problem persists, contact our support team on Discord.`
      }

      const stateObj: { [key in Ecosystem]?: EcosystemClaimState } = {}
      ecosystems.forEach((ecosystem) => {
        stateObj[ecosystem] = {
          error: new Error(message),
        }
      })
      setEcosystemsClaimState(stateObj)
      return
    }

    // NOTE: there is an implicit order restriction
    // Transaction Order should be same as Ecosystems array order
    // Additionally, for each Ecosystem the transaction is submitted
    // to multiple rpc providers, so we need to fetch the first successful
    // of the broadcast attempt
    const allPromises = broadcastPromises.map(
      async (broadcastPromise, index) => {
        await Promise.race([
          getSuccessfulProviderSubmit(broadcastPromise),
          new Promise((_, reject) => {
            setTimeout(() => reject(), 10000)
          }),
        ])
          .then((transactionError) => {
            // calculate the total coins claimed
            if (transactionError === null) {
              const eligibility = getEligibility(ecosystems[index])
              if (eligibility?.claimInfo.amount !== undefined)
                totalCoinsClaimed = totalCoinsClaimed.add(
                  eligibility?.claimInfo.amount
                )
            }

            // NOTE: there is an implicit order restriction
            // Transaction Order should be same as Ecosystems array order
            setEcosystemsClaimState((ecosystemState) => ({
              ...ecosystemState,
              [ecosystems[index]]: {
                error: transactionError
                  ? new Error(
                      `There was an error with your transaction. Please refresh this page and try again. Note: You will not lose your progress when you refresh.`
                    )
                  : null,
              },
            }))
          })
          .catch((e) => {
            // If the timeout triggers error.
            let message = `We are unable to confirm your transaction claim because the connection timed out. Note: You will not lose your progress if you refresh.`
            // If the error was with the connection edit the message to.
            if (((e as Error).message = ERROR_RPC_CONNECTION)) {
              message = `There was a problem with the RPC connection. Please wait a few minutes before trying again. Note: You will not lose your progress if you refresh this page.`
            }

            setEcosystemsClaimState((ecosystemState) => ({
              ...ecosystemState,
              [ecosystems[index]]: {
                error: new Error(message),
              },
            }))
          })
      }
    )

    // wait for all the promises before removing event handler
    await Promise.allSettled(allPromises)
    window.onbeforeunload = null
    // once the transaction has been submitted set the local storage with the path
    PathnameStore.set(
      `/next-steps?totalTokensClaimed=${toStringWithDecimals(
        totalCoinsClaimed
      )}`
    )
  }, [getClaim, tokenDispenser, getEligibility])

  return (
    <>
      {screen == 1 ? (
        <Box>
          <BoxTitle>
            <span className="flex items-center justify-between ">
              <span>Sign and Claim</span>
              <BackButton onBack={onBack} />
            </span>
          </BoxTitle>
          <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
            <p className="mb-6">
              {`Please proceed to sign your connected wallets. Press the “Sign” button next to each wallet and confirm in the pop-up window.`}
            </p>
            <p className="mb-6">
              Signing with your Solana wallet will be done at a later step.
              Discord requires no further action.
            </p>
            <p>Your W will be claimed to the following Solana wallet:</p>
            <div className="mt-8 flex items-center justify-between gap-4">
              <SolanaWalletCopyButton />
              <ProceedButton onProceed={() => setScreen(2)} />
            </div>
          </div>
        </Box>
      ) : screen === 2 ? (
        <SignForEligibleWallets
          onBack={() => setScreen(1)}
          onProceed={() => openModal(true)}
        />
      ) : (
        <ClaimStatus
          onProceed={onProceedWrapper}
          ecosystemsClaimState={ecosystemsClaimState}
        />
      )}
      {modal && (
        <ClaimAirdropModal
          openModal={() => openModal(false)}
          onBack={() => openModal(false)}
          onProceed={async () => {
            openModal(false)
            setScreen(3)
            await submitTxs()
          }}
        />
      )}
    </>
  )
}

function ClaimAirdropModal({
  openModal,
  onBack,
  onProceed,
}: StepProps & { openModal: () => void }) {
  return (
    <Modal openModal={openModal}>
      <h3 className="mb-8  font-header text-[30px] font-light sm:text-[36px]">
        Claim W
      </h3>
      <p className="mx-auto max-w-[454px] font-body text-base16">
        Please make sure you’ve connected all required wallets and Discord
        accounts. You have the option to go through the claim process again
        using different wallets.
      </p>
      <div className="mt-12 flex justify-center gap-4">
        <BackButton onBack={onBack} />
        <ProceedButton onProceed={onProceed} />
      </div>
    </Modal>
  )
}
