import { Box } from '@components/Box'
import { Title } from '@components/Title'
import { ProceedButton } from '@components/buttons'

export const Welcome = ({ onProceed }: { onProceed: () => void }) => {
  return (
    <>
      <Box>
        <Title> Welcome to the Pyth Airdrop</Title>
        <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
          <p className="mb-6">
            As part of the Pyth Network’s recent governance initiative, PYTH
            tokens have been allocated to the community.
          </p>
          <p className="mb-6">
            You may be eligible for the Pyth Airdrop if you:
          </p>
          <ul className="claim-ul mb-6">
            <li>
              Interacted with apps that use Pyth data on any supported
              blockchain, including Solana, Aptos, Sui, Cosmos, and the EVM
              ecosystem.
            </li>
            <li>
              Received and held Pyth NFTs from official Pyth community
              activities.
            </li>
            <li>
              Received special community roles in the official Pyth Discord
              server.
            </li>
          </ul>
          <p className="font-weight:bold mb-6">
            {' '}
            <strong>
              {' '}
              Note: The eligibility window for the airdrop has closed. No
              further participants can become eligible.
            </strong>
          </p>
          <p>
            This website will check your wallet activity and Discord account to
            calculate how many PYTH tokens you are eligible to claim. Your
            progress is automatically saved. You will not lose your progress if
            you leave.
          </p>
          <div className="mt-12 flex justify-end">
            <ProceedButton onProceed={onProceed} />
          </div>
        </div>
      </Box>
    </>
  )
}
