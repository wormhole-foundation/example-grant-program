export default {
  discord: {
    baseUrl: () => process.env.DISCORD_URL ?? "https://discord.com",
  },
  aws: {
    region: process.env.AWS_REGION ?? "us-east-2",
  },
};
