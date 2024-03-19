import { Keypair, PublicKey } from "@solana/web3.js";
import { getSecret } from "../utils";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { isAuthTokenValid, signDiscordMessage } from "../utils/discord";

interface DiscordSignedMessageRequest {
  publicKey: string;
  discordId: string;
}

exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body!) as DiscordSignedMessageRequest;
    const { publicKey, discordId } = requestBody;

    const authToken = event.headers["x-auth-token"];

    validatePublicKey(publicKey);
    validateAuthTokenAndDiscordId(authToken, discordId);

    await isAuthTokenValid(discordId, authToken!);

    const claimant = new PublicKey(publicKey!);
    const dispenserGuard = await loadDispenserGuard();

    const signedMessage = signDiscordMessage(discordId, claimant, dispenserGuard);

    return {
      statusCode: 200,
      body: JSON.stringify({
        signature: Buffer.from(signedMessage.signature).toString("hex"),
        publicKey: Buffer.from(signedMessage.publicKey).toString("hex"), // The dispenser guard's public key
        fullMessage: Buffer.from(signedMessage.fullMessage).toString("hex"),
      }),
    };
  } catch (err) {
    console.error("Error validating discord access token", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error validating discord access token" }),
    };
  }
};

async function loadDispenserGuard() {
  const secretData = await getSecret("xli-test-secret-dispenser-guard");
  const dispenserGuardKey = secretData.target;

  const dispenserGuard = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(dispenserGuardKey)));

  return dispenserGuard;
}

function validatePublicKey(publicKey?: string) {
  if (!publicKey) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Must provide the 'publicKey' query parameter" }),
    };
  }

  if (typeof publicKey !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid 'publicKey' query parameter" }),
    };
  }

  try {
    new PublicKey(publicKey);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid 'publicKey' query parameter" }),
    };
  }
}

function validateAuthTokenAndDiscordId(authToken?: string, discordId?: string) {
  if (!authToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Must provide discord auth token" }),
    };
  }

  if (!discordId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Must provide discord id" }),
    };
  }
}
