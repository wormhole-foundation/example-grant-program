import { PublicKey } from "@solana/web3.js";
import { ClaimInfo } from "./claim";
import { envOrErr } from "claim_sdk";

const treasuries: Record<string, PublicKey[]> = {
    "mainnet": [

    ],
    "testnet": [

    ]
}

const funders: Record<string, PublicKey[]> = {
    "mainnet": [],
    "testnet": []
}

const getFundersByEnv = (env: string): PublicKey[] => {
    return funders[env];
}

const getTreasuryByEnv = (env: string): PublicKey[] => {
    return treasuries[env];
}

export function getClaimPayers(claimInfo: ClaimInfo): [PublicKey, PublicKey]{
    const buffer = claimInfo.toBuffer();
    const toHex = buffer.toString('hex');
    const toNumber = parseInt(toHex, 16);
    const blockchainEnv = envOrErr("CLUSTER");
    const funders = getFundersByEnv(blockchainEnv);
    const funderIndex = toNumber % funders.length;
    const treasuries = getTreasuryByEnv(blockchainEnv);
    const treasuryIndex = toNumber % treasuries.length;

    return [funders[funderIndex], treasuries[treasuryIndex]];
}