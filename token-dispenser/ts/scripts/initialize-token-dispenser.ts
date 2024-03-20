import { PublicKey } from "@solana/web3.js";

import { TokenDispenserSdk } from "../sdk";
import { ledgerSignAndSend } from './helpers';
import { connection, getSigner, getEnv } from './env';

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
    tokenDispenser: getEnv("TOKEN_DISPENSER_ADDRESS"),
    mint: getEnv("MINT_ADDRESS"),
    treasury: getEnv("TREASURY_ADDRESS"),
    dispenserGuard: getEnv("DISPENSER_GUARD_ADDRESS"),
    funder: getEnv("FUNDER_ADDRESS"),
    addressLookupTable: getEnv("ADDRESS_LOOKUP_TABLE_ADDRESS"),

    merkleRoot: Buffer.from(getEnv("MERKLE_ROOT"), "hex"),
    maxTransfer: BigInt(getEnv("MAX_TRANSFER")),
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const tokenDispenser = new TokenDispenserSdk(connection, {
    programId: config.tokenDispenser,
  });

  const initializeIx = await tokenDispenser.createInitializeInstruction({
    payer: signerPk,
    mint: new PublicKey(config.mint),
    treasury: new PublicKey(config.treasury),
    dispenserGuard: new PublicKey(config.dispenserGuard),
    funder: new PublicKey(config.funder),
    addressLookupTable: new PublicKey(config.addressLookupTable),
    merkleRoot: Buffer.from(getEnv("MERKLE_ROOT"), "hex"),
    maxTransfer: config.maxTransfer,
  });

  await ledgerSignAndSend([initializeIx], []);
})();

