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
} from './claim_sdk/eventSubscriber'
import * as anchor from '@coral-xyz/anchor'
import { envOrErr } from './claim_sdk'
import { BN } from '@coral-xyz/anchor'
import { inspect } from 'util'
import { InfluxDB, Point, QueryApi } from '@influxdata/influxdb-client'

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
  console.log(`Connecting to program id <${PROGRAM_ID}> on ${CLUSTER}`)

  const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN })
  const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET)
  const readApi = influxDB.getQueryApi(INFLUX_ORG)

  let latestTxBlockTime = 0
  let latestSignature = await getLatestTxSignature(
    INFLUX_BUCKET,
    CLUSTER,
    readApi
  )

  console.log(
    `Start from last signature: ${
      latestSignature === undefined ? 'none' : latestSignature
    }`
  )
  const tokenDispenserEventSubscriber = new TokenDispenserEventSubscriber(
    ENDPOINT,
    new anchor.web3.PublicKey(PROGRAM_ID),
    TIME_WINDOW_SECS,
    latestSignature,
    CHUNK_SIZE,
    {
      commitment: 'confirmed',
    }
  )

  const { txnEvents, failedTxnInfos } =
    await tokenDispenserEventSubscriber.parseTransactionLogs()

  for (const txnEvent of txnEvents) {
    if (txnEvent.blockTime > latestTxBlockTime) {
      latestTxBlockTime = txnEvent.blockTime
      latestSignature = txnEvent.signature
    }
  }
  for (const failedTxnInfo of failedTxnInfos) {
    if (failedTxnInfo.blockTime > latestTxBlockTime) {
      latestTxBlockTime = failedTxnInfo.blockTime
      latestSignature = failedTxnInfo.signature
    }
  }

  console.log(
    `Found ${txnEvents.length} event${txnEvents.length > 1 ? 's' : ''}`
  )
  console.log(
    `Found ${failedTxnInfos.length} failed txn${
      failedTxnInfos.length > 1 ? 's' : ''
    }`
  )

  const formattedTxnEvents = txnEvents
    .filter((txnEvent) => txnEvent.event)
    .map((txnEvent) => formatTxnEventInfo(txnEvent))
  console.log(
    `Formatted ${formattedTxnEvents.length} event${
      formattedTxnEvents.length > 1 ? 's' : ''
    }`
  )

  const doubleClaimEventPoints = createDoubleClaimPoint(formattedTxnEvents)

  if (doubleClaimEventPoints.length > 0) {
    console.log(
      `Detected ${doubleClaimEventPoints.length} double claim${
        doubleClaimEventPoints.length > 1 ? 's' : ''
      }`
    )
    doubleClaimEventPoints.forEach((doubleClaimEventPoint) => {
      writeApi.writePoint(doubleClaimEventPoint)
    })
  } else {
    console.log('No double claims detected')
  }

  const lowBalanceEventPoint = createLowBalanceEventPoint(formattedTxnEvents)

  if (lowBalanceEventPoint) {
    console.log('Detected low balance event')
    writeApi.writePoint(lowBalanceEventPoint)
  } else {
    console.log('No low balance detected')
  }

  const txnEventPoints = createTxnEventPoints(formattedTxnEvents)
  txnEventPoints.forEach((txnEventPoint) => {
    writeApi.writePoint(txnEventPoint)
  })
  console.log(
    `Wrote ${txnEventPoints.length} txn event${
      txnEventPoints.length > 1 ? 's' : ''
    } to InfluxDB`
  )

  const failedTxnEventPoints = createFailedTxnEventPoints(failedTxnInfos)
  failedTxnEventPoints.forEach((failedTxnEventPoint) => {
    writeApi.writePoint(failedTxnEventPoint)
  })
  console.log(
    `Wrote ${failedTxnEventPoints.length} failed txn event${
      failedTxnEventPoints.length > 1 ? 's' : ''
    } to InfluxDB`
  )

  console.log('Last signature processed:', latestSignature)
  const latestTxPoint = new Point('latest_txn_seen')
    .tag('network', CLUSTER)
    .stringField('signature', latestSignature)

  writeApi.writePoint(latestTxPoint)

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

async function getLatestTxSignature(
  bucket: string,
  network: string,
  readApi: QueryApi
): Promise<string | undefined> {
  const query = `from(bucket: "${bucket}")
    |> range(start: -1d)
    |> filter(fn: (r) => r._measurement == "latest_txn_seen")
    |> filter(fn: (r) => r.network == "${network}")
    |> sort(columns: ["_time"], desc: true)
    |> first()
    |> limit(n:1)`

  let signature = undefined
  for await (const { values, tableMeta } of readApi.iterateRows(query)) {
    const o = tableMeta.toObject(values)
    signature = o._value.length > 0 ? o._value : undefined
  }

  return signature
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
      .timestamp(new Date(formattedEvent.blockTime * 1000))

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
        .timestamp(new Date(blockTime * 1000))
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
      .timestamp(new Date(errorLog.blockTime * 1000))
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
