import {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult
} from 'aws-lambda'
import geoIP from 'fast-geoip'

export const authorizer = async (
  authorizerEvent: APIGatewayRequestAuthorizerEventV2
): Promise<
  APIGatewaySimpleAuthorizerWithContextResult<Record<string, string>>
> => {
  let authorized = true
  let country

  try {
    const ip = authorizerEvent.requestContext.http.sourceIp
    const geo = await geoIP.lookup(ip)
    country = geo?.country ?? 'unknown'
    if (
      country in ['CU', 'IR', 'IQ', 'KP', 'RU', 'SY', 'GB', 'US', 'UA', 'AR']
    ) {
      authorized = false
    }
  } catch (err) {
    console.error('Error looking up country', err)
  }

  return {
    isAuthorized: authorized,
    context: {
      country: country ?? ''
    }
  }
}
