import { signDiscordMessage } from './handlers/discord-signed-digest'
import { fundTransaction } from './handlers/fund-transactions'
import { handler as helloworld } from './handlers/helloworld'

export const signDiscordMessageHandler = signDiscordMessage
export const helloworldHandler = helloworld
export const fundTransactionHandler = fundTransaction
