import BN from 'bn.js'

const TRAILING_ZEROS = new RegExp(/\.?0+$/)
const W_DECIMALS = 9

export function toStringWithDecimals(amount: BN) {
  const padded = amount.toString().padStart(W_DECIMALS + 1, '0')
  return (
    padded.slice(0, padded.length - W_DECIMALS) +
    ('.' + padded.slice(padded.length - W_DECIMALS)).replace(TRAILING_ZEROS, '')
  )
}
