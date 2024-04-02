# Backend

This module contains two functions meant to be executed as AWS Lambda functions.

## Run locally

Set some env vars:

```bash
export DISPENSER_WALLET_KEY = [your, solana, private, key]
export FUNDING_WALLET_KEY = [your, solana, private, key]
```

Then run:

```bash
yarn serve
```

Will expose two endpoints on localhost:8002:

`GET /api/grant/v1/discord_signed_message` => signDiscordMessageHandler
`POST /api/grant/v1/fund_transaction` => fundTransactionHandler

## Deployment environment variables

Following env vars are required:

- `DISPENSER_KEY_SECRET_NAME`: private key of the wallet that will be used to sign the discord message
- `FUNDER_WALLET_KEY_SECRET_NAME`: private key of the wallet that will be used to fund the transactions
