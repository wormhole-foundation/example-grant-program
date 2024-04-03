import bodyParser from 'body-parser'
import express from 'express'
import {
  signDiscordMessageHandler,
  fundTransactionHandler,
  authorizerHandler
} from './index'
import { APIGatewayProxyEvent } from 'aws-lambda'

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
app.get('/checker', lambdaProxyWrapper(authorizerHandler))

app.listen(8200, () => console.info('Server running on port 8200...'))

function lambdaProxyWrapper(handler: (event: any) => Promise<any>) {
  return async (req: express.Request, res: express.Response) => {
    const event = {
      httpMethod: req.method,
      queryStringParameters: req.query,
      pathParameters: {
        proxy: req.params[0]
      },
      headers: req.headers,
      body: JSON.stringify(req.body),
      requestContext: {
        http: {
          sourceIp: req.query.ip ?? ''
        }
      }
    }

    const response = await handler(event as unknown as APIGatewayProxyEvent)

    res.status(response.statusCode ?? 200)
    res.set(response.headers ?? {})

    if (response.body) {
      return res.json(JSON.parse(response.body))
    }

    return res.json(response)
  }
}
