import { Program, BN, Address } from "@coral-xyz/anchor";

import { TokenDispenser } from "./idl/token_dispenser";
import IDL from "./idl/token_dispenser.json";
import { PublicKey, Connection } from "@solana/web3.js";

import { derivePda } from "./utils";

const CONFIG_SEED_PREFIX = "config";

export class TokenDispenserSdk {
  readonly program: Program<TokenDispenser>;
  // readonly mint: PublicKey;

  constructor(
    connection: Connection,
    args: {
      programId: string;
    }
  ) {
    this.program = new Program(IDL as any, new PublicKey(args.programId), {
      connection,
    });
  }

  // Acounts:
  configAccountAddress(): Address {
    return derivePda(CONFIG_SEED_PREFIX, this.program.programId);
  }

  // Instructions:
  async createInitializeInstruction(args: {
    payer: PublicKey;
    mint: PublicKey;
    treasury: PublicKey;
    dispenserGuard: PublicKey;
    funder: PublicKey;
    addressLookupTable: PublicKey;
    merkleRoot: Buffer;
    maxTransfer: bigint;
  }) {
    return this.program.methods
      .initialize(
        Array.from(args.merkleRoot),
        args.dispenserGuard,
        args.funder,
        new BN(args.maxTransfer.toString())
      )
      .accounts({
        payer: args.payer,
        mint: args.mint,
        treasury: args.treasury,
        config: new PublicKey(this.configAccountAddress()),
        addressLookupTable: args.addressLookupTable,
      })
      .instruction();
  }
}
