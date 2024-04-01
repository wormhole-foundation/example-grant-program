import { ClaimInfo } from './claim'

import { PublicKey } from '@solana/web3.js'

export const treasuries = [
  new PublicKey('waTh9vNmRz8hHxQv1zW81ExKQ7fwaa1TR6tQT5fTkjg'),
  new PublicKey('waTirsbdRyyxm8DFxH9Z9P5Pyrj74jJ7E74zqhmGX1k'),
  new PublicKey('wAtMcoqwHb7obEL2USNXPqxg1CmJDSjjjsNcEm9bzCZ'),
  new PublicKey('Wats1sM7W4UvxUuQPevGxexgcaFiaXMXxActKUmcvHx'),
  new PublicKey('waTtgLt1WVRgoWYNZh97AYAUqoU4nN98jVThPdYQVwj'),
  new PublicKey('WaTxa5w4TjYHRdHwG2zaN9ynA1c9z4J9TswsBCmzy4N'),
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
