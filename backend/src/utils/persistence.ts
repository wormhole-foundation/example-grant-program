import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client'
import base32 from 'hi-base32'
import { rawSecp256k1PubkeyToRawAddress } from '@cosmjs/amino'
import { Secp256k1 } from '@cosmjs/crypto'
import { toBech32 } from '@cosmjs/encoding'
import config from '../config'
import { ClaimSignature } from '../types'
import { PublicKey } from '@solana/web3.js'
import { getInfluxToken } from './secrets'

const EVM_WALLET_ADDRESS_PREFIX = '0x'
const INJECTIVE_ADDRESS_PREFIX = 'inj'

let influxWriter: WriteApi

export async function saveSignedTransactions(
  claimSignatures: ClaimSignature[]
) {
  try {
    if (!influxWriter) {
      influxWriter = await initInfluxWriter()
    }
    const points = claimSignatures.map((claimSignature) => {
      const { ecosystem, subEcosystem, identity } = mapIdentity(claimSignature)
      return new Point('ad_signatures')
        .tag('type', 'transaction_signed')
        .tag('ecosystem', ecosystem)
        .tag('subecosystem', subEcosystem)
        .stringField('sig', claimSignature.sig)
        .stringField('identity', identity)
        .floatField('amount', claimSignature.instruction?.amount?.toNumber())
    })
    influxWriter.writePoints(points)
    if (config.influx.isFlushEnabled()) {
      await influxWriter.flush()
    }
  } catch (err) {
    console.error('Error saving signed transactions', err)
  }
}

function mapIdentity(claimSignature: ClaimSignature) {
  const ecosystem: string = Object.keys(
    claimSignature.instruction?.proofOfIdentity ?? { unknown: 'ecosystem' }
  )[0]
  let identity: string | undefined
  let subEcosystem = ecosystem

  switch (ecosystem) {
    case 'discord': {
      identity = claimSignature.instruction?.proofOfIdentity?.discord?.username
      break
    }
    case 'solana': {
      identity = new PublicKey(
        claimSignature.instruction?.proofOfIdentity?.solana?.pubkey ?? []
      ).toBase58()
      break
    }
    case 'evm': {
      identity =
        EVM_WALLET_ADDRESS_PREFIX +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.evm?.pubkey ?? []
        ).toString('hex')
      break
    }
    case 'cosmwasm': {
      const pubkey = claimSignature.instruction?.proofOfIdentity?.cosmwasm
        ?.pubkey as unknown as Uint8Array
      const compressed = Secp256k1.compressPubkey(pubkey)

      const chainId =
        claimSignature.instruction?.proofOfIdentity?.cosmwasm?.chainId ?? 'osmo'
      identity = toBech32(chainId, rawSecp256k1PubkeyToRawAddress(compressed))

      subEcosystem = chainId
      break
    }
    case 'injective': {
      identity =
        INJECTIVE_ADDRESS_PREFIX +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.injective?.pubkey ?? []
        ).toString('hex')
      break
    }
    case 'aptos': {
      identity =
        '0x' +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.aptos?.pubkey ?? []
        ).toString('hex')
      break
    }
    case 'sui': {
      identity =
        '0x' +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.sui?.pubkey ?? []
        ).toString('hex')
      break
    }
    case 'algorand': {
      identity = base32.encode(
        claimSignature.instruction?.proofOfIdentity?.algorand?.pubkey ?? []
      )
      break
    }
    default: {
      identity = 'unknown'
    }
  }

  return { ecosystem, subEcosystem, identity }
}

async function initInfluxWriter() {
  const token = await getInfluxToken()
  console.log('Influx URL: ' + config.influx.url())
  console.log('Influx ORG: ' + config.influx.org())
  console.log('Influx BUCKET: ' + config.influx.bucket())

  return new InfluxDB({
    url: config.influx.url(),
    token
  }).getWriteApi(config.influx.org(), config.influx.bucket())
}

process.on('SIGTERM', async () => {
  await influxWriter.close()
})
