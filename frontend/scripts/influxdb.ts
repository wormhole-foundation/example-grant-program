/**
 * Post an event returns "OK" response
 *
 * To Run:
 * copy .env.sample .env
 * Then update the parameters in .env accordingly
 * source .env ts-node ./scripts/influxdb.ts
 */

import {
  formatTxnEventInfo,
  TokenDispenserEventSubscriber,
  FormattedTxnEventInfo,
  TxnInfo,
} from '../claim_sdk/eventSubscriber'
import * as anchor from '@coral-xyz/anchor'
import { envOrErr } from '../claim_sdk'
import { BN } from '@coral-xyz/anchor'
import { inspect } from 'util'
import { InfluxDB, Point } from '@influxdata/influxdb-client'

const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')
const CLUSTER = envOrErr('CLUSTER')
const INFLUX_URL = envOrErr('INFLUX_URL')
const INFLUX_TOKEN = envOrErr('INFLUX_TOKEN')
const INFLUX_ORG = envOrErr('INFLUX_ORG')
const INFLUX_BUCKET = envOrErr('INFLUX_BUCKET')
const TIME_WINDOW_SECS = Number.parseInt(envOrErr('TIME_WINDOW_SECS'), 10)
const CHUNK_SIZE = Number.parseInt(envOrErr('CHUNK_SIZE'), 10)
const LOW_BALANCE_THRESHOLD = envOrErr('LOW_BALANCE_THRESHOLD')
// based off airdrop allocation commit 16d0c19f3951427f04cc015d38805f356fcb88b1
const MAX_AMOUNT_PER_ECOSYSTEM = new Map<string, BN>([
  ['discord', new BN('87000000000')],
  ['solana', new BN('19175000000')],
  ['evm', new BN('18371000000')],
  ['sui', new BN('4049000000')],
  ['aptos', new BN('4049000000')],
  ['cosmwasm', new BN('4049000000')],
  ['injective', new BN('4049000000')],
])

async function main() {
  console.log('Program Id', PROGRAM_ID)
  console.log('Node:', ENDPOINT)
  console.log('Time Window Secs:', TIME_WINDOW_SECS)
  console.log('Chunk Size:', CHUNK_SIZE)

  const tokenDispenserEventSubscriber = new TokenDispenserEventSubscriber(
    ENDPOINT,
    new anchor.web3.PublicKey(PROGRAM_ID),
    TIME_WINDOW_SECS,
    CHUNK_SIZE,
    {
      commitment: 'confirmed',
    }
  )

  const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN })
  const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET)

  const { txnEvents, failedTxnInfos } =
    await tokenDispenserEventSubscriber.parseTransactionLogs()

  console.log('Events', txnEvents)
  console.log('Failed Txn Infos', failedTxnInfos)

  const formattedTxnEvents = txnEvents
    .filter((txnEvent) => txnEvent.event)
    .map((txnEvent) => formatTxnEventInfo(txnEvent))

  console.log('Formatted Events', formattedTxnEvents)
  const doubleClaimEventPoints = createDoubleClaimPoint(formattedTxnEvents)

  console.log(
    `Double Claim Event Requests: ${inspect(
      doubleClaimEventPoints,
      false,
      10,
      undefined
    )}`
  )
  if (doubleClaimEventPoints.length > 0) {
    doubleClaimEventPoints.forEach((doubleClaimEventPoint) => {
      writeApi.writePoint(doubleClaimEventPoint)
    })
  }

  const lowBalanceEventPoint = createLowBalanceEventPoint(formattedTxnEvents)

  console.log(
    `Low Balance Event Request: ${inspect(
      lowBalanceEventPoint,
      false,
      10,
      undefined
    )}`
  )
  if (lowBalanceEventPoint) {
    writeApi.writePoint(lowBalanceEventPoint)
  }

  const txnEventPoints = createTxnEventPoints(formattedTxnEvents)

  console.log(
    `Txn Event Requests: ${inspect(txnEventPoints, false, 10, undefined)}`
  )
  txnEventPoints.forEach((txnEventPoint) => {
    writeApi.writePoint(txnEventPoint)
  })

  const failedTxnEventPoints = createFailedTxnEventPoints(failedTxnInfos)

  console.log(
    `Failed Txn Event Requests: ${inspect(
      failedTxnEventPoints,
      false,
      10,
      undefined
    )}`
  )

  failedTxnEventPoints.forEach((failedTxnEventPoint) => {
    writeApi.writePoint(failedTxnEventPoint)
  })

  writeApi
    .close()
    .then(() => {
      console.log('Finished writing points')
    })
    .catch((e) => {
      console.error(e)
      console.log('\nFinished with error')
    })
}

function createTxnEventPoints(formattedTxnEvents: FormattedTxnEventInfo[]) {
  return formattedTxnEvents.map((formattedEvent) => {
    const { signature, claimant } = formattedEvent
    const { ecosystem, address, amount } = formattedEvent.claimInfo!
    let eventCategory = 'normal'
    let amountValue = parseInt(amount, 10)

    if (MAX_AMOUNT_PER_ECOSYSTEM.get(ecosystem)!.lt(new BN(amount))) {
      eventCategory = 'max_transfer_exceeded'
    }

    const point = new Point('txn_event')
      .tag('claimant', claimant!)
      .tag('ecosystem', ecosystem)
      .tag('address', address)
      .tag('network', CLUSTER)
      .tag('eventCategory', eventCategory)
      .stringField('signature', signature)
      .intField('amount', amountValue)
      .stringField('eventDetails', JSON.stringify(formattedEvent))
      .timestamp(new Date(formattedEvent.blockTime * 1000).toISOString())

    return point
  })
}

/**
 * Check for double claims and create error events for any detected
 * @param formattedTxnEvents
 */
function createDoubleClaimPoint(formattedTxnEvents: FormattedTxnEventInfo[]) {
  const claimInfoMap = new Map<string, Set<FormattedTxnEventInfo>>()
  formattedTxnEvents.forEach((formattedTxnEvent) => {
    const claimInfoKey = `${formattedTxnEvent.claimInfo!.ecosystem}-${
      formattedTxnEvent.claimInfo!.address
    }`
    if (!claimInfoMap.get(claimInfoKey)) {
      claimInfoMap.set(claimInfoKey, new Set<FormattedTxnEventInfo>())
    }
    claimInfoMap.get(claimInfoKey)!.add(formattedTxnEvent)
  })

  const entryGen = claimInfoMap.entries()
  let entry = entryGen.next()
  const doubleClaimPoints = []
  while (!entry.done) {
    if (entry.value[1].size > 1) {
      const [claimInfoKey, txnEventInfosSet] = entry.value
      const [ecosystem, address] = claimInfoKey.split('-')
      const txnEventInfos = Array.from(txnEventInfosSet)
      let blockTime = 0
      for (const txnEventInfo of txnEventInfos) {
        if (txnEventInfo.blockTime > blockTime) {
          blockTime = txnEventInfo.blockTime
        }
      }

      const point = new Point('double_claim_event')
        .tag('ecosystem', ecosystem)
        .tag('address', address)
        .tag('network', CLUSTER)
        .tag('service', 'token-dispenser-event-subscriber')
        .stringField('details', JSON.stringify(txnEventInfos))
        .timestamp(new Date(blockTime * 1000).toISOString())
      doubleClaimPoints.push(point)
    }
    entry = entryGen.next()
  }

  return doubleClaimPoints
}

function createFailedTxnEventPoints(failedTxns: TxnInfo[]) {
  return failedTxns.map((errorLog) => {
    const point = new Point('failed_txn_event')
      .tag('signature', errorLog.signature)
      .tag('network', CLUSTER)
      .tag('service', 'token-dispenser-event-subscriber')
      .stringField('errorDetails', JSON.stringify(errorLog))
      .timestamp(new Date(errorLog.blockTime * 1000).toISOString())
    return point
  })
}

function createLowBalanceEventPoint(
  formattedTxnEvents: FormattedTxnEventInfo[]
) {
  if (formattedTxnEvents.length === 0) {
    return undefined
  }

  const mostRecentEvent = formattedTxnEvents.sort((a, b) => b.slot - a.slot)[0]

  if (
    mostRecentEvent.remainingBalance &&
    new BN(mostRecentEvent.remainingBalance).lt(new BN(LOW_BALANCE_THRESHOLD))
  ) {
    const point = new Point('low_balance_event')
      .tag('signature', mostRecentEvent.signature)
      .tag('network', CLUSTER)
      .tag('service', 'token-dispenser-event-subscriber')
      .intField(
        'remainingBalance',
        parseInt(mostRecentEvent.remainingBalance, 10)
      )
      .stringField('eventDetails', JSON.stringify(mostRecentEvent))
      .timestamp(new Date(mostRecentEvent.blockTime * 1000).toISOString())
    return point
  }

  return undefined
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(`error from influxdb.ts: ${e}`)
    process.exit(1)
  }
})()
