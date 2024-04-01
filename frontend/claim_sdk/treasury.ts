import { ClaimInfo } from './claim'

import { PublicKey } from '@solana/web3.js'

export const treasuries = [
  new PublicKey('WAT5qnYC6k6UUyRx5nH1sFpSHA7k9jjJ2QNKytwpprG'),
  new PublicKey('WAt8sFNiekVbH1ssH2dqoCEaXUU1ZD2vs1F8V4y1nVh'),
  new PublicKey('WaTaaPXBpshpGyAcctT4JatEicmavMqv8JR93gRtYeQ'),
  new PublicKey('WaTUZowJtRjyiUnxLy2nwNij9G9EuGpfiQGrNM8st1B'),
  new PublicKey('WaTyrB78jtyZun9JcAF2psWUFhurzxotckJr9J96ksS'),
  new PublicKey('wAtZcn6ZeL3pxtDJJ19LJ5qRb5YewtUdr6CTYRjLfZL'),
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
