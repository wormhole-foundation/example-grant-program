import { Program, BN, Address, web3, AnchorProvider } from "@coral-xyz/anchor";
import { TokenDispenser } from "./idl/token_dispenser";
import IDL from "./idl/token_dispenser.json";
import { PublicKey, Connection } from '@solana/web3.js';

import { derivePda } from "./utils";

const CONFIG_SEED_PREFIX = "config";

export class TokenDispenserSdk {
  readonly program: Program<TokenDispenser>;
  // readonly mint: PublicKey;

  constructor(
    connection: Connection,
    args: {
      programId: string;
      payer: PublicKey,
    }
  ) {
    const wallet = {
      publicKey: args.payer,
      signTransaction: async function () : Promise<any> {
        throw new Error("ilegal call");
      },
      signAllTransactions: async function (...args: any[]): Promise<any> {
        throw new Error("ilegal call");
      },
      // payer: args.payer,
    }
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );

    // this.program = new Program(IDL as any, new PublicKey(args.programId), provider);
    this.program = new Program(IDL as any, new PublicKey(args.programId), provider);
  }

  // Acounts:
  configAccountAddress(): Address {
    return derivePda(CONFIG_SEED_PREFIX, this.program.programId);
  }

  // Instructions:
  async createInitializeInstruction(args: {
    payer: PublicKey;
    mint: PublicKey;
    dispenserGuard: PublicKey;
    addressLookupTable: PublicKey;
    merkleRoot: Buffer;
    maxTransfer: bigint;
  }) {
    return this.program.methods
      .initialize(
        Array.from(args.merkleRoot),
        args.dispenserGuard,
        new BN(args.maxTransfer.toString()),
      )
      .accounts({
        config: new PublicKey(this.configAccountAddress()),
        mint: args.mint,
        systemProgram: web3.SystemProgram.programId,
        addressLookupTable: args.addressLookupTable,
        payer: args.payer,
      })
      .instruction();
  }
}
