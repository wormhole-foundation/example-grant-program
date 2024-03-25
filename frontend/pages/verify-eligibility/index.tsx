import { Box } from '@components/Box'
import { BackButton, ProceedButton } from '@components/buttons'
import { useRouter } from 'next/navigation'
import { REVIEW_ELIGIBILITY_METADATA } from '../review-eligibility'
import { BoxTitle } from '@components/BoxTitle'

export const VERIFY_ELIGIBILITY_METADATA = {
  url: '/verify-eligibility',
  title: 'Verify Eligibility',
}

export default function VerifyEligibilityPage() {
  const router = useRouter()

  return (
    <Box>
      <BoxTitle> Verify Eligibility</BoxTitle>
      <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
        <p className="mb-6">
          Please connect all wallets based on the networks you chose in the previous step. Feel free to go back and adjust any selections if necessary.
        </p>
        <p>
          Note that you won't be able to move on to the next step and claim your W unless all your wallets or Discord account are successfully connected.
        </p>

        <div className="mt-12 flex justify-end gap-4">
          <BackButton
            onBack={() => {
              router.push(REVIEW_ELIGIBILITY_METADATA.url)
            }}
          />
          <ProceedButton
            onProceed={() =>
              router.push('/verify-eligibility/check-eligibility')
            }
          />
        </div>
      </div>
    </Box>
  )
}
