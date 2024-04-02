import { Box } from '@components/Box'
import { ProceedButton } from '@components/buttons'
import { BoxTitle } from '@components/BoxTitle'

export const Welcome = ({ onProceed }: { onProceed: () => void }) => {
  return (
    <>
      <Box>
        <BoxTitle> Welcome to the Wormhole Airdrop</BoxTitle>
        <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
          <p className="mb-6">
            The Wormhole platform is moving towards further decentralization.
            The purpose of this airdrop is to support that vision by
            meaningfully distributing stakeholders from the start.
          </p>
          <p className="mb-6">
            You may be eligible for this W airdrop if you&apos;ve interacted
            with Wormhole ecosystem chains, applications, or the Wormhole
            community in the past. The snapshot for this airdrop was taken on
            February 6, 2024, 23:59 UTC.
          </p>
          <p className="mb-6">
            Please proceed to check your eligibility and claim your W.
          </p>
          <div className="mt-12 flex justify-end">
            <ProceedButton onProceed={onProceed} />
          </div>
        </div>
      </Box>
    </>
  )
}
