
if [[ -z $SOLANA_RPC_URL || \
      -z $LEDGER_PUB_KEY || \
      -z $LEDGER_CLI_DERIVATION_PATH || \
      -z $MINT || \
      -z $MINT_AMOUNT || \
      -z $CONFIG_PDA ]]; then
  echo "Error: One or more required environment variables are not set."
  echo "SOLANA_RPC_URL: $SOLANA_RPC_URL"
  echo "LEDGER_CLI_DERIVATION_PATH: $LEDGER_CLI_DERIVATION_PATH"
  echo "MINT: $MINT"
  echo "MINT_AMOUNT: $MINT_AMOUNT"
  exit 1
fi

while IFS= read -r TREASURY; do
  spl-token -u $SOLANA_RPC_URL mint $MINT $MINT_AMOUNT $TREASURY \
    --fee-payer usb://ledger?key=$LEDGER_CLI_DERIVATION_PATH \
    --mint-authority usb://ledger?key=$LEDGER_CLI_DERIVATION_PATH
done < "$(dirname "$0")/treasuries"
