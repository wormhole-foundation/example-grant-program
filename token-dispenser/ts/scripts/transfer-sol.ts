import {
  PublicKey,
  SystemProgram,
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { ledgerSignAndSend } from "./helpers";
import { connection, getSigner, getEnv } from "./env";
type Config = {
  to: PublicKey;
  amount: bigint; // lamports
};

(async () => {
  const config: Config = {
    to: new PublicKey(getEnv("TO")),
    amount: BigInt(getEnv("AMOUNT")),
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const transferIx = SystemProgram.transfer({
    fromPubkey: signerPk,
    toPubkey: config.to,
    lamports: config.amount,
  });

  const setComputePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1_200_000,
  });

  console.log(`Transferring ${config.amount} lamports to ${config.to.toBase58()}`);
  const result = await ledgerSignAndSend([setComputePriceIx, transferIx], []);
  console.log("Tx Sent: ", result);
  const txIncluded = await connection.confirmTransaction(result);
  console.log("Tx Included");
})();
