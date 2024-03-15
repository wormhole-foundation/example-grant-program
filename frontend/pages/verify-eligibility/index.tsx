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
          Please connect your wallets and Discord account according to the boxes
          you checked in <strong>Step 2</strong>. You can go back and change any
          of your selections.
        </p>
        <p>
          You will not be able to proceed to <strong>Step 4</strong> to claim
          your PYTH tokens if you do not successfully connect all of your
          wallets or Discord account.
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
