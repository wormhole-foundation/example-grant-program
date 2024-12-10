
if [[ -z $SOLANA_RPC_URL || \
      -z $AUTHORITY ]; then
  echo "Error: One or more required environment variables are not set."
  echo "SOLANA_RPC_URL: $SOLANA_RPC_URL"
  echo "LEDGER_PUB_KEY: $AUTHORITY"
  exit 1
fi

while IFS= read -r TREASURY; do
  TREASURY=$TREASURY NEW_AUTHORITY=$AUTHORITY npx ts-node ./ts/scripts/transfer-treasury.ts
done < "$(dirname "$0")/treasuries"
