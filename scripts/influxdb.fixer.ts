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
const TAGS_TO_KEEP =
  process.env.TAGS_TO_KEEP ?? 'ecosystem,network,eventCategory'
const FIELDS =
  process.env.FIELDS ?? 'signature,amount,eventDetails,address,claimant'

const START_HOURS_AGO = process.env.START_HOURS_AGO ?? '72' // 3 days
const END_HOURS_AGO = process.env.END_HOURS_AGO ?? '0' // now
const HOUR_WINDOW = process.env.HOUR_WINDOW ?? '1'

async function main() {
  console.log(
    `Connecting to influx <${INFLUX_URL}/${INFLUX_ORG}/${INFLUX_BUCKET}>`
  )

  console.log(
    `Migrating ${MEASUREMENT} to ${MEASUREMENT}_${NEW_MEASUREMENT_VERSION}`
  )

  const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN })
  const readApi = influxDB.getQueryApi(INFLUX_ORG)
  const tagsToKeep = TAGS_TO_KEEP.split(',')
  const fields = FIELDS.split(',')

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
        tagsToKeep,
        fields,
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
  tagsToKeep: string[],
  fields: string[],
  start: string,
  end: string,
  readApi: QueryApi
): Promise<void> {
  const stream = `from(bucket: "${bucket}")
  |> range(start: ${start}, stop: ${end})
  |> filter(fn: (r) => r._measurement == "${measurement}")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")`

  const mapper = `${stream}
  |> set(key: "_measurement", value: "${measurement}_${newMeasurementVersion}")
  |> to(
      bucket: "${bucket}",
      timeColumn: "_time",
      tagColumns: [${tagsToKeep.map((tag) => `"${tag}"`).join(',')}],
      fieldFn: (r) => ({ ${fields
        .map((field) => `${field}: r.${field}`)
        .join(',')} })
    )`

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
