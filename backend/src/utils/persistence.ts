import { InfluxDB, Point } from '@influxdata/influxdb-client'
import base32 from 'hi-base32'
import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";
import { Secp256k1 } from "@cosmjs/crypto";
import { toBech32 } from "@cosmjs/encoding";
import config from '../config'
import { ClaimSignature } from '../types'
import { PublicKey } from '@solana/web3.js'

const OSMOSIS_ADDRESS_PREFIX = "osmo";
const EVM_WALLET_ADDRESS_PREFIX = "0x";
const TERRA_ADDRESS_PREFIX = "terra";
const INJECTIVE_ADDRESS_PREFIX = "inj";

export async function saveSignedTransactions(
  claimSignatures: ClaimSignature[]
) {
  try {
    const influxWriter = new InfluxDB({
      url: config.influx.url,
      token: config.influx.token,
      timeout: config.influx.timeout,
      writeOptions: {}
    }).getWriteApi(config.influx.org, config.influx.bucket)

    const points = claimSignatures.map((claimSignature) => {
      const { ecosystem, subEcosystem, identity } = mapIdentity(claimSignature)
      const point = new Point('ad_signatures')
        .stringField('type', 'transaction_signed')
        .stringField('sig', claimSignature.sig)
        .stringField('ecosystem', ecosystem)
        .stringField('subecosystem', subEcosystem)
        .stringField('identity', identity)
        .floatField('amount', claimSignature.instruction?.amount?.toNumber())

      return point
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
      EVM_WALLET_ADDRESS_PREFIX +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.evm?.pubkey ?? []
        ).toString('hex')
      break
    }
    case 'osmosis': {
      const pubkey = claimSignature.instruction?.proofOfIdentity?.cosmwasm?.pubkey as unknown as Uint8Array
      const compressed = Secp256k1.compressPubkey(pubkey);

      identity = toBech32(OSMOSIS_ADDRESS_PREFIX, rawSecp256k1PubkeyToRawAddress(compressed));

      subEcosystem = 'osmosis'
      break
    }
    case 'terra': {
      // DONE but still need to verify
      identity =
      TERRA_ADDRESS_PREFIX +
        Buffer.from(
          claimSignature.instruction?.proofOfIdentity?.cosmwasm?.pubkey ?? []
        ).toString('hex')
      subEcosystem = 'terra'
      break
    }
    case 'injective': {
      // TODO: DONE but still need to verify
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
