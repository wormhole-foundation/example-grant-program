import { signDiscordMessage } from "./handlers/discord-signed-digest";
import { handler as helloworld } from "./handlers/helloworld";

export const signDiscordMessageHandler = signDiscordMessage;
export const fundTransactionHandler = helloworld;
