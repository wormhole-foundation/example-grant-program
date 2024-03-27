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
            The Wormhole platform is on a road of further decentralization. This
            airdrop is constructed to support that vision and meaningfully
            decentralize stakeholders from the start.
          </p>
          <p className="mb-6">
            Eligibility for this W airdrop may apply to you if you've interacted
            with ecosystem chains, applications, or the community within the
            Wormhole ecosystem in the past. The snapshot for this airdrop has
            already been taken as of February 6, 2024, 23:59 UTC.
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
