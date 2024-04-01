export default {
  discord: {
    baseUrl: process.env.DISCORD_URL ?? 'https://discord.com'
  },
  aws: {
    region: process.env.AWS_REGION ?? 'us-east-2'
  },
  tokenDispenserProgramId: () => 'wAPFpaiQj5BHweaBF2VDrGjq1CZWXWx1zLSJZUrxbtC',
  secrets: {
    dispenserGuard: {
      /** optional. mostly for local testing */
      key: process.env.DISPENSER_WALLET_KEY,
      /** required. with a default value and used when when key not set */
      secretName:
        process.env.DISPENSER_KEY_SECRET_NAME ?? 'xl-dispenser-guard-key'
    },
    funding: {
      /** optional. mostly for local testing */
      key: () => process.env.FUNDING_WALLET_KEY,
      /** required. with a default value and used when when key not set */
      secretName:
        process.env.FUNDER_WALLET_KEY_SECRET_NAME ??
        'xli-test-secret-funder-wallet'
    },
    influx: {
      key: () => process.env.INFLUXDB_TOKEN,
      /** required. with a default value */
      secretName: process.env.IDB_SECRET_NAME ?? 'xl-ad-idb'
    }
  },
  influx: {
    url: () => process.env.INFLUXDB_URL ?? 'http://localhost:8086',
    org: () => process.env.INFLUXDB_ORG ?? 'xl',
    bucket: () => process.env.INFLUXDB_BUCKET ?? 'ad',
    token: () => process.env.INFLUXDB_TOKEN,
    timeout: () => parseInt(process.env.INFLUXDB_TIMEOUT_MS ?? '20500'),
    isFlushEnabled: () => process.env.INFLUXDB_FLUSH_ENABLED === 'true' ?? false
  }
}
