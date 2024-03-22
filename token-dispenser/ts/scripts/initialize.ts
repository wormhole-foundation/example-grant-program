import { PublicKey, SystemProgram, AddressLookupTableProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

import { TokenDispenserSdk } from "../sdk";
import { ledgerSignAndSend, ledgerSignAndSendV0 } from './helpers';
import { connection, getSigner, getEnv } from './env';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

type InitConfig = {
  // Account Addresses (base58 encoded):
  tokenDispenser: string,
  mint: string,
  treasury: string,
  dispenserGuard: string,
  funder: string,
  addressLookupTable: string,

  merkleRoot: Buffer,
  maxTransfer: bigint,
};

(async () => {
  const config: InitConfig = {
    tokenDispenser: getEnv("PROGRAM_ID"),
    mint: getEnv("MINT"),
    treasury: getEnv("TREASURY"),
    dispenserGuard: getEnv("DISPENSER_GUARD"),
    funder: getEnv("FUNDER"),
    addressLookupTable: getEnv("ADDRESS_LOOKUP_TABLE"),
    merkleRoot: Buffer.from(getEnv("MERKLE_ROOT"), "hex"),
    maxTransfer: BigInt(getEnv("MAX_TRANSFER")),
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const tokenDispenser = new TokenDispenserSdk(connection, {
    programId: config.tokenDispenser,
  });

  const configPda = new PublicKey(tokenDispenser.configAccountAddress());
  const mint = new PublicKey(config.mint);
  const treasury = new PublicKey(config.treasury);
  const funder = new PublicKey(config.funder);
  const dispenserGuard = new PublicKey(config.dispenserGuard);

  const [createAddressLookupTableIx, lookupTable] = AddressLookupTableProgram.createLookupTable({
    payer: signerPk,
    authority: signerPk,
    recentSlot: await connection.getSlot(),
  });

  console.log("Lookup Table: ", lookupTable.toBase58());
  console.log("Config PDA: ", configPda.toBase58());

  const extendAddressLooupTableIx = AddressLookupTableProgram.extendLookupTable({
    payer: signerPk,
    authority: signerPk,
    lookupTable,
    addresses: [
      configPda,
      mint,
      treasury,
      TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      SYSVAR_INSTRUCTIONS_PUBKEY,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      funder
    ],
  });

  await ledgerSignAndSendV0([createAddressLookupTableIx, extendAddressLooupTableIx], []);

  const initializeIx = await tokenDispenser.createInitializeInstruction({
    payer: signerPk,
    mint,
    treasury,
    dispenserGuard,
    funder,
    addressLookupTable: lookupTable,
    merkleRoot: config.merkleRoot,
    maxTransfer: config.maxTransfer,
  });

  const result = await ledgerSignAndSend([initializeIx], []);

  console.log("Dispenser initialized. Signature: ", result);
})();

