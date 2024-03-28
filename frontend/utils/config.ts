import { clusterApiUrl } from '@solana/web3.js'

const parseEndpoints = () => {
  let endpoints
  try {
    endpoints = JSON.parse(process.env.ENDPOINTS!)
  } catch (e) {
    // if parse fails, assume it's a single endpoint
    endpoints = [process.env.ENDPOINTS || clusterApiUrl('devnet')]
  }

  if (!Array.isArray(endpoints)) {
    throw new Error('ENDPOINTS must be an array')
  }

  return endpoints
}

const config = {
  ENDPOINTS: parseEndpoints(),
}

export default config
