import {
  PublicKey,
} from "@solana/web3.js";
import {
  AuthorityType,
  createSetAuthorityInstruction,
} from "@solana/spl-token";

import { ledgerSignAndSend } from "./helpers";
import { connection, getSigner, getEnv } from "./env";

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

  const setAuthorityIx = createSetAuthorityInstruction(
    config.treasury,
    signerPk,
    AuthorityType.AccountOwner,
    config.newAuthority,
  );

  console.log(`Setting account ${config.treasury.toBase58()} authority to ${config.newAuthority.toBase58()}`);
  const result = await ledgerSignAndSend([setAuthorityIx], []);
  console.log("Tx Sent: ", result);
  const txIncluded = await connection.confirmTransaction(result);
  console.log("Tx Included");
})();
