import { APIGatewayProxyResult } from 'aws-lambda'

export const asJsonResponse = (
  statusCode: number,
  body: unknown
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }
}
