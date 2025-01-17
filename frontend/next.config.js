require('dotenv').config()

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  images: {
    domains: [
      'cdn.martianwallet.xyz',
      'cdn.discordapp.com',
      'raw.githubusercontent.com',
    ],
    unoptimized: true,
  },
  swcMinify: false,
  env: {
    ENDPOINTS: process.env.ENDPOINTS,
    CLUSTER: process.env.CLUSTER,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      }
    }
    config.experiments = { asyncWebAssembly: true, layers: true }

    const fileLoaderRule = config.module.rules.find((rule) => {
      if (rule && Array.isArray(rule.test)) {
        return rule.test.find((test) => test.test('.svg'))
      } else if (rule && rule.test instanceof RegExp) {
        return rule.test.test('.svg')
      }
    })
    fileLoaderRule.exclude = /\.inline\.svg$/
    config.module.rules.push({
      test: /\.inline\.svg$/,
      loader: require.resolve('@svgr/webpack'),
    })

    return config
  },
})
