import { PublicKey } from "@solana/web3.js";

import { TokenDispenserSdk } from "../sdk";
import { connection, getSigner, getEnv } from "./env";

type InitConfig = {
  // Account Addresses (base58 encoded):
  tokenDispenser: string;
};

(async () => {
  const config: InitConfig = {
    tokenDispenser: getEnv("PROGRAM_ID"),
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const tokenDispenser = new TokenDispenserSdk(connection, {
    programId: config.tokenDispenser,
    payer: signerPk,
  });

  const configPda = new PublicKey(tokenDispenser.configAccountAddress());

  console.log("Config PDA: ", configPda.toBase58());
})();
