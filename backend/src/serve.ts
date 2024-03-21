import bodyParser from 'body-parser'
import express from 'express'
import { signDiscordMessageHandler, fundTransactionHandler } from './index'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

const app = express()
app.use(bodyParser.json())

app.get(
  '/api/grant/v1/discord_signed_message',
  lambdaProxyWrapper(signDiscordMessageHandler)
)
app.post(
  '/api/grant/v1/fund_transaction',
  lambdaProxyWrapper(fundTransactionHandler)
)

app.listen(8200, () => console.info('Server running on port 8200...'))

function lambdaProxyWrapper(
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) {
  return async (req: express.Request, res: express.Response) => {
    const event = {
      httpMethod: req.method,
      queryStringParameters: req.query,
      pathParameters: {
        proxy: req.params[0]
      },
      headers: req.headers,
      body: JSON.stringify(req.body)
    }

    const response = await handler(event as any as APIGatewayProxyEvent)

    res.status(response.statusCode)
    res.set(response.headers)

    return res.json(JSON.parse(response.body))
  }
}
