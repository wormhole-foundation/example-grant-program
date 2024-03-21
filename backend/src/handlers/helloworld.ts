import { getSecret } from "../utils/secrets";

export const handler = async () => {
  if (!process.env.SECRET_NAME) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "SECRET_NAME is not set" }),
    };
  }

  const secretData = await getSecret(process.env.SECRET_NAME!);
  const target = secretData.target;

  console.log(`Hello ${target}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello ${target}` }),
  };
};
