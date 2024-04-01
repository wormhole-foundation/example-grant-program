import { PublicKey } from "@solana/web3.js";

import { TokenDispenserSdk } from "../sdk";
import { connection, getSigner } from "./env";
import { tokenDispenserProgramId } from "./config";

type InitConfig = {
  // Account Addresses (base58 encoded):
  tokenDispenser: string;
};

(async () => {
  const config: InitConfig = {
    tokenDispenser: tokenDispenserProgramId,
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
