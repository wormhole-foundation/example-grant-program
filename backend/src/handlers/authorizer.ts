import {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult
} from 'aws-lambda'
import geoIP from 'fast-geoip'

const DEFAULT_DENY_LIST = ['CU', 'IR', 'IQ', 'KP', 'RU', 'SY', 'GB', 'US', 'UA']

export const authorizer = async (
  authorizerEvent: APIGatewayRequestAuthorizerEventV2
): Promise<
  APIGatewaySimpleAuthorizerWithContextResult<Record<string, string>>
> => {
  let authorized = true
  let country
  const denyList = process.env.DENY_LIST?.split(',') ?? DEFAULT_DENY_LIST
  const ip = authorizerEvent.requestContext.http.sourceIp

  try {
    const geo = await geoIP.lookup(ip)
    country = geo?.country ?? 'unknown'
    if (denyList.includes(country)) {
      authorized = false
    }
  } catch (err) {
    console.error('Error looking up country', err)
  }

  console.log(`IP:${ip} - Country:${country} - Authorized:${authorized}`)

  return {
    isAuthorized: authorized,
    context: {
      country: country ?? ''
    }
  }
}
