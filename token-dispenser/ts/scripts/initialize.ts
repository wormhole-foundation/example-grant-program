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
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

type InitConfig = {
  // Account Addresses (base58 encoded):
  tokenDispenser: string;
  mint: string;
  dispenserGuard: string;
  merkleRoot: Buffer;
  maxTransfer: bigint;
};

(async () => {
  const config: InitConfig = {
    tokenDispenser: tokenDispenserProgramId,
    mint: getEnv("MINT"),
    dispenserGuard: getEnv("DISPENSER_GUARD"),
    merkleRoot: Buffer.from(getEnv("MERKLE_ROOT"), "hex"),
    maxTransfer: BigInt(getEnv("MAX_TRANSFER")),
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const tokenDispenser = new TokenDispenserSdk(connection, {
    programId: config.tokenDispenser,
    payer: signerPk,
  });

  const configPda = new PublicKey(tokenDispenser.configAccountAddress());
  const mint = new PublicKey(config.mint);
  const dispenserGuard = new PublicKey(config.dispenserGuard);

  const [createAddressLookupTableIx, lookupTable] =
    AddressLookupTableProgram.createLookupTable({
      payer: signerPk,
      authority: signerPk,
      recentSlot: await connection.getSlot(),
    });

  console.log("Config PDA: ", configPda.toBase58());

  const extendAddressLooupTableIx = AddressLookupTableProgram.extendLookupTable(
    {
      payer: signerPk,
      authority: signerPk,
      lookupTable,
      addresses: [
        configPda,
        mint,
        TOKEN_PROGRAM_ID,
        SystemProgram.programId,
        SYSVAR_INSTRUCTIONS_PUBKEY,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ],
    }
  );

  await ledgerSignAndSendV0(
    [createAddressLookupTableIx, extendAddressLooupTableIx],
    []
  );
  console.log("Lookup Table created at address: ", lookupTable.toBase58());

  const addFundersAndTreasuriesIx = AddressLookupTableProgram.extendLookupTable(
    {
      payer: signerPk,
      authority: signerPk,
      lookupTable,
      addresses: [
        ...funders,
        ...treasuries,
      ],
    }
  );

  await ledgerSignAndSendV0(
    [addFundersAndTreasuriesIx],
    []
  );
  console.log("Funders and Treasuries added to lookup table");

  const initializeIx = await tokenDispenser.createInitializeInstruction({
    payer: signerPk,
    mint,
    dispenserGuard,
    addressLookupTable: lookupTable,
    merkleRoot: config.merkleRoot,
    maxTransfer: config.maxTransfer,
  });

  const result = await ledgerSignAndSend([initializeIx], []);

  console.log("Dispenser initialized. Signature: ", result);
})();
