/**
 *
 * To Run:
 * copy .env.sample .env
 * Then update the parameters in .env accordingly
 * source .env
 * ts-node ./scripts/influxdb.fixer.ts
 */
import { envOrErr } from './claim_sdk'
import { InfluxDB, QueryApi } from '@influxdata/influxdb-client'

const INFLUX_URL = envOrErr('INFLUX_URL')
const INFLUX_TOKEN = envOrErr('INFLUX_TOKEN')
const INFLUX_ORG = envOrErr('INFLUX_ORG')
const INFLUX_BUCKET = envOrErr('INFLUX_BUCKET')

const MEASUREMENT = process.env.MEASUREMENT ?? 'txn_event'
const NEW_MEASUREMENT_VERSION = process.env.NEW_MEASUREMENT_VERSION ?? 'v1'

const START_HOURS_AGO = process.env.START_HOURS_AGO ?? '72' // 3 days
const END_HOURS_AGO = process.env.END_HOURS_AGO ?? '0' // now
const HOUR_WINDOW = process.env.HOUR_WINDOW ?? '1'

const TAGS_TO_CONVERT = process.env.TAGS_TO_CONVERT ?? 'address'

async function main() {
  console.log(
    `Connecting to influx <${INFLUX_URL}/${INFLUX_ORG}/${INFLUX_BUCKET}>`
  )

  console.log(
    `Migrating ${MEASUREMENT} to ${MEASUREMENT}_${NEW_MEASUREMENT_VERSION}`
  )

  const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN })
  const readApi = influxDB.getQueryApi(INFLUX_ORG)
  const tagsToConvert = TAGS_TO_CONVERT.split(',')

  let startHoursAgo = Number.parseInt(START_HOURS_AGO)
  const endHoursAgo = Number.parseInt(END_HOURS_AGO)
  let currentEndHoursago = ''

  try {
    while (startHoursAgo > endHoursAgo) {
      const currentStartHoursAgo = `-${startHoursAgo}h`
      currentEndHoursago = `-${startHoursAgo - Number.parseInt(HOUR_WINDOW)}h`

      await mapAndWrite(
        INFLUX_BUCKET,
        MEASUREMENT,
        NEW_MEASUREMENT_VERSION,
        tagsToConvert,
        currentStartHoursAgo,
        currentEndHoursago,
        readApi
      )
      startHoursAgo -= Number.parseInt(HOUR_WINDOW)
    }
  } catch (error) {
    console.error(`Error: ${error}`)
  }

  console.log(
    `Done -> StartHoursAgo: ${startHoursAgo} - EndHoursAgo: ${currentEndHoursago}`
  )
}

async function mapAndWrite(
  bucket: string,
  measurement: string,
  newMeasurementVersion: string,
  tagsToConvert: string[],
  start: string,
  end: string,
  readApi: QueryApi
): Promise<void> {
  const stream = `from(bucket: "${bucket}")
  |> range(start: ${start}, stop: ${end})
  |> filter(fn: (r) => r._measurement == "${measurement}")`

  const mapper = `${stream}
  |> map(fn: (r) => ({ r with _measurement: "${measurement}_${newMeasurementVersion}", ${tagsToConvert
    .map((tag) => `${tag}: r.${tag}`)
    .join(', ')} }))
  |> drop(columns: [${tagsToConvert.map((tag) => `"${tag}"`).join(',')}])
  |> to(bucket: "${bucket}")
  `
  console.log(` Executing the following query: ${mapper}`)
  const response = await readApi.queryRaw(mapper)
  console.log(response)
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(`error from influxdb.ts: ${e}`)
    process.exit(1)
  }
})()
