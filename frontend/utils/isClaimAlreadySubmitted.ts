import { web3 } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair } from '@solana/web3.js'
import { ClaimInfo } from 'claim_sdk/claim'
import { TokenDispenserProvider } from 'claim_sdk/solana'
import { tokenDispenserProgramId } from './constants'
import config from './config'

// Tokendispenser with randomly generated keypair. Since we don't need a
// specific one to check if claims were already submitted
const tokenDispenser = new TokenDispenserProvider(
  config.ENDPOINTS,
  new NodeWallet(new Keypair()),
  new web3.PublicKey(tokenDispenserProgramId)
)

// isClaimAlreadySubmitted help us check if a claim has already been submitted or not.
export function isClaimAlreadySubmitted(claimInfo: ClaimInfo) {
  return tokenDispenser.isClaimAlreadySubmitted(claimInfo)
}
