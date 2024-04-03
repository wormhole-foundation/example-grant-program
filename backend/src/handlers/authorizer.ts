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
    console.log('IP:', ip)
    const geo = await geoIP.lookup(ip)
    country = geo?.country ?? 'unknown'
    if (
      ['CU', 'IR', 'IQ', 'KP', 'RU', 'SY', 'GB', 'US', 'UA', 'AR'].includes(
        country
      )
    ) {
      authorized = false
    }
  } catch (err) {
    console.error('Error looking up country', err)
  }

  console.log('Country:', country)
  console.log('Authorized:', authorized)

  return {
    isAuthorized: authorized,
    context: {
      country: country ?? ''
    }
  }
}
