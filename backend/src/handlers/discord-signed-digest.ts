import { Keypair, PublicKey } from "@solana/web3.js";
import { getSecret } from "../utils/secrets";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { isAccessTokenValid, signDiscordDigest } from "../utils/discord";

export interface DiscordSignedDigestRequest {
  publicKey: string;
  discordId: string;
}

export const signDiscordMessage = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // TODO: no need to receive disordId really, as we should can just get it using the auth token.
    // TODO: publicKey was expected as query param in pyth version
    const { publicKey, discordId } = JSON.parse(event.body!) as DiscordSignedDigestRequest;
    const accessToken = event.headers["x-auth-token"];

    validatePublicKey(publicKey);
    validateAccessTokenAndDiscordId(accessToken, discordId);

    await isAccessTokenValid(discordId, accessToken!);

    const claimant = new PublicKey(publicKey!);
    const dispenserGuard = await loadDispenserGuard();

    const signedDigest = signDiscordDigest(discordId, claimant, dispenserGuard);

    return {
      statusCode: 200,
      body: JSON.stringify({
        signature: Buffer.from(signedDigest.signature).toString("hex"),
        publicKey: Buffer.from(signedDigest.publicKey).toString("hex"), // The dispenser guard's public key
        fullMessage: Buffer.from(signedDigest.fullMessage).toString("hex"),
      }),
    };
  } catch (err) {
    console.error("Error generating signed discord digest", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error generating signed discord digest" }),
    };
  }
};

async function loadDispenserGuard() {
  // TODO: Update secret name based on the secret you created in the AWS Secrets Manager
  const secretData = await getSecret(process.env.DISPENSER_KEY_SECRET_NAME ?? "xli-test-secret-dispenser-guard");
  const dispenserGuardKey = secretData.target;

  const dispenserGuard = Keypair.fromSecretKey(Uint8Array.from(dispenserGuardKey));

  return dispenserGuard;
}

function validatePublicKey(publicKey?: string) {
  if (!publicKey) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Must provide the 'publicKey' query parameter",
      }),
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

function validateAccessTokenAndDiscordId(AccessToken?: string, discordId?: string) {
  if (!AccessToken) {
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
