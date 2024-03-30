
if [[ -z $SOLANA_RPC_URL || \
      -z $LEDGER_PUB_KEY || \
      -z $LEDGER_CLI_DERIVATION_PATH || \
      -z $MINT || \
      -z $APPROVE_AMOUNT || \
      -z $CONFIG_PDA ]]; then
  echo "Error: One or more required environment variables are not set."
  echo "SOLANA_RPC_URL: $SOLANA_RPC_URL"
  echo "LEDGER_PUB_KEY: $LEDGER_PUB_KEY"
  echo "LEDGER_CLI_DERIVATION_PATH: $LEDGER_CLI_DERIVATION_PATH"
  echo "MINT: $MINT"
  echo "APPROVE_AMOUNT: $APPROVE_AMOUNT"
  echo "CONFIG_PDA: $CONFIG_PDA"
  exit 1
fi

while IFS= read -r TREASURY; do
  spl-token -u $SOLANA_RPC_URL create-account \
  --owner $LEDGER_PUB_KEY \
  --fee-payer usb://ledger?key=$LEDGER_CLI_DERIVATION_PATH \
  $MINT \
  $TREASURY.json

  spl-token \
    --url $SOLANA_RPC_URL \
    approve \
    $TREASURY $APPROVE_AMOUNT $CONFIG_PDA \
    --fee-payer usb://ledger?key=$LEDGER_CLI_DERIVATION_PATH \
    --owner usb://ledger?key=$LEDGER_CLI_DERIVATION_PATH
done < "$(dirname "$0")/treasuries"


