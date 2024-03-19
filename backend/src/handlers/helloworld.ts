import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-2" }); // Ensure this matches the region of your secret

async function getSecret(secretName: string) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    } else {
      // For binary secrets, use Buffer to decode
      const buff = Buffer.from(response.SecretBinary, "base64");
      return JSON.parse(buff.toString("ascii"));
    }
  } catch (err) {
    console.error("Error getting secret:", err);
    throw err;
  }
}

exports.handler = async () => {
  const secretData = await getSecret("xli-test-secret-s01");
  const target = secretData.target;

  console.log(`Hello ${target}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello ${target}` }),
  };
};
