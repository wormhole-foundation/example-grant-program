import {
  PublicKey,
  SystemProgram,
  AddressLookupTableProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";

import { TokenDispenserSdk } from "../sdk";
import { ledgerSignAndSend, ledgerSignAndSendV0 } from "./helpers";
import { connection, getSigner, getEnv } from "./env";
import { funders, tokenDispenserProgramId, treasuries } from "./config";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
} from "@solana/spl-token";

type Config = {
  treasury: PublicKey;
  newAuthority: PublicKey;
};

(async () => {
  const config: Config = {
    treasury: new PublicKey(getEnv("TREASURY")),
    newAuthority: new PublicKey(getEnv("NEW_AUTHORITY")),
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  // AuthorityType.AccountOwner;
  const setAuthorityIx = createSetAuthorityInstruction(
    config.treasury,
    signerPk,
    AuthorityType.AccountOwner,
    config.newAuthority,
  );

  console.log(`Setting account ${config.treasury.toBase58()} authority to ${config.newAuthority.toBase58()}`);
  const result = await ledgerSignAndSendV0([setAuthorityIx], []);
  console.log("Tx Sent: ", result);
  const txIncluded = await connection.confirmTransaction(result);
  console.log("Tx Included");
})();
