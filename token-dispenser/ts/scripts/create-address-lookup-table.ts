import { PublicKey, AddressLookupTableProgram, ExtendLookupTableParams } from "@solana/web3.js";

import { ledgerSignAndSend, ledgerSignAndSendV0 } from './helpers';
import { connection, getSigner, getEnv } from './env';

type AddressTableConfig = {
  addresses: string[];
};

(async () => {
  const config: AddressTableConfig = {
    addresses: JSON.parse(getEnv("ADDRESS_TABLE_DATA")), // comma separated list of addresses
  };

  const signer = await getSigner();
  const signerPk = new PublicKey(await signer.getAddress());

  const [createAddressLookupTableIx, lookupTablePubKey] = AddressLookupTableProgram.createLookupTable({
    authority: signerPk,
    payer: signerPk,
    recentSlot: await connection.getSlot(),
  });

  console.log("Lookup Table Address will be created at: ", lookupTablePubKey.toBase58());

  await ledgerSignAndSendV0([createAddressLookupTableIx], []);

  console.log("Lookup Table Address created succesfully.");

  const extendAddressLooupTableIx = AddressLookupTableProgram.extendLookupTable({
    authority: signerPk,
    lookupTable: lookupTablePubKey,
    // TODO: there will probably be more addresses on the lookup table than what
    // can be fitted into a sinfle transaction so we'll need to chunk the data into
    // many different transactions.
    addresses: config.addresses.map((address) => new PublicKey(address)),
  });

  await ledgerSignAndSendV0([extendAddressLooupTableIx], []);
})();