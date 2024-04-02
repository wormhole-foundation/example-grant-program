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
import { envOrErr } from "../../../frontend/claim_sdk/index";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

type ExtendConfig = {
  // Account Addresses (base58 encoded):
  lookupTable: PublicKey;
  tokenDispenser: string;
};

(async () => {
  const config: ExtendConfig = {
    lookupTable: new PublicKey(envOrErr("LOOKUP_TABLE")),
    tokenDispenser: tokenDispenserProgramId,
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const extendAddressLooupTableIx = AddressLookupTableProgram.extendLookupTable(
    {
      payer: signerPk,
      authority: signerPk,
      lookupTable: config.lookupTable,
      addresses: [...treasuries],
    }
  );

  await ledgerSignAndSendV0([extendAddressLooupTableIx], []);
})();
