import { ClaimInfo } from './claim'

import { PublicKey } from '@solana/web3.js'

export const treasuries = [
  new PublicKey('Wat7JfmPaAEUKKHmmpZ9AG32NnzKjeh6iADjas9pgL5'),
  new PublicKey('wATCzGrGTbxLT9CsCJnwoX5E8bxc65U53MG52aWxCuA'),
  new PublicKey('wAtGyahKtCYpCmZMV3qkeE84bSo2Z5TUbhEDFYYFG94'),
  new PublicKey('WaTjft1mVYP9YWFmos4dLjjHw5D5s1hCyCNHfjKnDzE'),
  new PublicKey('waTooQBPp1JqZhcF2g6i3pN2cAopXak85tyJEyyLeBy'),
  new PublicKey('watP4vXL51PazbVbJQpxKgR3L1jCCmimVC6ze2ggkKn'),
]

export const funders = [
  new PublicKey('wAf15NnY6VVVQXDSdhp79LndkHXSD9BmcUhh4bqSSGp'),
  new PublicKey('WafepN7ToYGS4WjaqtMV8g2q3YV1GgcoUZ4nvK4LhD8'),
  new PublicKey('wAfmKAiAgtfywPhfRdLQ7uMeS2RW3kN57kodaRabX6V'),
  new PublicKey('WAfN8P3NdYeTnnvFPKYUiveyqZSZtBboxUyrMSAzQc1'),
  new PublicKey('wafydZpGcTLk3FYEQ5Q4wwSKJXMy3EMTngxeVEXG45e'),
  new PublicKey('WafzGQMEqwABhMdNHH86yDRqzZQvK5rELK5Nrto97Va'),
]

export function getClaimPayers(claimInfo: ClaimInfo): [PublicKey, PublicKey] {
  const buffer = claimInfo.toBuffer()
  const toHex = buffer.toString('hex')
  const toNumber = parseInt(toHex, 16)
  const funderIndex = toNumber % funders.length

  const treasuryIndex = toNumber % treasuries.length

  return [funders[funderIndex], treasuries[treasuryIndex]]
}
