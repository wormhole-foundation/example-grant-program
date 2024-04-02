import {
  PublicKey,
  SystemProgram,
  AddressLookupTableProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Keypair,
  ComputeBudgetProgram,
} from "@solana/web3.js";

import { TokenDispenserSdk } from "../sdk";
import { ledgerSignAndSend, ledgerSignAndSendV0 } from "./helpers";
import { connection, getSigner, getEnv } from "./env";
import { funders, tokenDispenserProgramId, treasuries } from "./config";
import fs from "fs";
import { envOrErr } from "../../../frontend/claim_sdk/index";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  getMint,
  getAccountLenForMint,
  createInitializeAccountInstruction,
} from "@solana/spl-token";

type Config = {
  mint: PublicKey;
  treasury: Keypair;
};

(async () => {
  const config: Config = {
    mint: new PublicKey(getEnv("MINT")),
    treasury: Keypair.fromSecretKey(
      new Uint8Array(loadJsonSync(`${getEnv("TREASURY")}.json`))
    ),
  };

  console.log(
    "Creating token account for treasury: ",
    config.treasury.publicKey.toBase58()
  );

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const mintState = await getMint(
    connection,
    config.mint,
    "confirmed",
    TOKEN_PROGRAM_ID
  );
  const space = getAccountLenForMint(mintState);
  const lamports = await connection.getMinimumBalanceForRentExemption(space);

  const setComputePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1_000_000,
  });

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: signerPk,
    newAccountPubkey: config.treasury.publicKey,
    space,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  });

  const initializeInstructionIx = createInitializeAccountInstruction(
    config.treasury.publicKey,
    config.mint,
    signerPk,
    TOKEN_PROGRAM_ID
  );

  const result = await ledgerSignAndSend(
    [setComputePriceIx, createAccountIx, initializeInstructionIx],
    [config.treasury]
  );

  console.log(
    `Token account ${config.treasury.publicKey.toBase58()} created. Signature: `,
    result
  );
})();

function loadJsonSync(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    throw new Error("File does not exist");
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
}
