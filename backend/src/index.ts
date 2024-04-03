import { signDiscordMessage } from './handlers/discord-signed-digest'
import { fundTransactions } from './handlers/fund-transactions'
import { authorizer } from './handlers/authorizer'

export const signDiscordMessageHandler = signDiscordMessage
export const authorizerHandler = authorizer
export const fundTransactionHandler = fundTransactions
