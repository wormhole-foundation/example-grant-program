import { Connection, Keypair, Commitment } from "@solana/web3.js";
import { SolanaLedgerSigner } from "@xlabs-xyz/ledger-signer-solana";

if (!process.env.LEDGER_DERIVATION_PATH) {
  throw new Error("LEDGER_DERIVATION_PATH is not set");
}

const derivationPath = process.env.LEDGER_DERIVATION_PATH! as string;

let signer;
export async function getSigner(): Promise<SolanaLedgerSigner> {
  if (!signer) {
    signer = await SolanaLedgerSigner.create(derivationPath);
  }

  return signer;
}

export function getEnv(key: string): string {
  if (!process.env[key]) {
    throw new Error(`${key} not found on environment`);
  }

  return process.env[key]!;
}

export const rpcUrl =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const connectionCommitmentLevel = (process.env.SOLANA_COMMITMENT ||
  "confirmed") as Commitment;

export const connection = new Connection(rpcUrl, connectionCommitmentLevel);
