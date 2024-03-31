import { InfluxDB, Point } from '@influxdata/influxdb-client'
import base32 from 'hi-base32'
import config from '../config'
import { ClaimSignature } from '../types'
import { PublicKey } from '@solana/web3.js'

export async function saveSignedTransactions(
  claimSignatures: ClaimSignature[]
) {
  try {
    const influxWriter = new InfluxDB({
      url: config.influx.url(),
      token: config.influx.token(),
      timeout: config.influx.timeout()
    }).getWriteApi(config.influx.org(), config.influx.bucket())

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
    await influxWriter.close()
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
        '0x' +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.evm?.pubkey ?? []
        ).toString('hex')
      break
    }
    // TODO: validate correct parsing
    case 'osmosis': {
      identity =
        '0x' +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.cosmwasm?.pubkey ?? []
        ).toString('hex')
      subEcosystem = 'osmosis'
      break
    }
    case 'terra': {
      identity =
        '0x' +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.cosmwasm?.pubkey ?? []
        ).toString('hex')
      subEcosystem = 'terra'
      break
    }
    case 'injective': {
      identity =
        '0x' +
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
