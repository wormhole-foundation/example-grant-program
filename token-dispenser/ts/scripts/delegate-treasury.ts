import {
  PublicKey,
  SystemProgram,
  AddressLookupTableProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Keypair,
  ComputeBudgetProgram,
} from "@solana/web3.js";

import { ledgerSignAndSend, ledgerSignAndSendV0 } from "./helpers";
import { connection, getSigner, getEnv } from "./env";
import {
  createApproveInstruction,
} from "@solana/spl-token";

type Config = {
  treasury: PublicKey;
  configAccount: PublicKey;
  mintAmount: bigint;
};

(async () => {
  const config: Config = {
    treasury: new PublicKey(getEnv("TREASURY")),
    configAccount: new PublicKey(getEnv("CONFIG_PDA")),
    mintAmount: BigInt(getEnv("MINT_AMOUNT")),
  };

  console.log(`Delegating ${config.mintAmount} of treasury: `, config.treasury.toBase58());

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());
  const setComputePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1_000_000,
  });

  const approveInstruction = createApproveInstruction(
    config.treasury,
    config.configAccount,
    signerPk,
    config.mintAmount,
  );

  const result = await ledgerSignAndSend([
    setComputePriceIx,
    approveInstruction,
  ], []);

  console.log(`Token account ${config.treasury.toBase58()} delegated. Signature: `, result);
})();
