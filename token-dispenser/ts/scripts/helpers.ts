import {
  Transaction,
  TransactionInstruction,
  Keypair,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import { SolanaLedgerSigner } from "@xlabs-xyz/ledger-signer-solana";

import { connection, getSigner } from "./env";

export async function ledgerSignAndSend(
  instructions: TransactionInstruction[],
  signers: Keypair[]
) {
  const deployerSigner = await getSigner();
  const deployerPk = new PublicKey(await deployerSigner.getAddress());

  const tx = new Transaction();
  tx.add(...instructions);

  const recentBlockHash = await connection.getRecentBlockhash();

  tx.recentBlockhash = recentBlockHash.blockhash;
  tx.feePayer = deployerPk;

  signers.forEach((signer) => tx.partialSign(signer));

  await addLedgerSignature(tx, deployerSigner, deployerPk);

  return connection.sendRawTransaction(tx.serialize());
}

export async function ledgerSignAndSendV0(
  instructions: TransactionInstruction[],
  signers: Keypair[]
) {
  const deployerSigner = await getSigner();
  const deployerPk = new PublicKey(await deployerSigner.getAddress());
  const recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

  const message = new TransactionMessage({
    payerKey: deployerPk,
    recentBlockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  transaction.sign(signers);

  const signedByPayer = await deployerSigner.signTransaction(
    Buffer.from(transaction.message.serialize())
  );

  transaction.addSignature(deployerPk, signedByPayer);

  return connection.sendRawTransaction(transaction.serialize());
}

export async function addLedgerSignature(
  tx: Transaction,
  signer: SolanaLedgerSigner,
  signerPk: PublicKey
) {
  const signedByPayer = await signer.signTransaction(
    tx.compileMessage().serialize()
  );
  tx.addSignature(signerPk, signedByPayer);
}
