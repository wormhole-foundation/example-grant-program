import { getSecret } from "../utils";

exports.handler = async () => {
  const secretData = await getSecret("xli-test-secret-s01");
  const target = secretData.target;

  console.log(`Hello ${target}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello ${target}` }),
  };
};
