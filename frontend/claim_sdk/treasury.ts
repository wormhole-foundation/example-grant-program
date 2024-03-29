import { PublicKey } from "@solana/web3.js";
import { ClaimInfo } from "./claim";

const treasuries: PublicKey[] = [];

const funders: PublicKey[] = [];

export function getClaimPayers(claimInfo: ClaimInfo): [PublicKey, PublicKey]{
    const buffer = claimInfo.toBuffer();
    const toHex = buffer.toString('hex');
    const toNumber = parseInt(toHex, 16);
    const funderIndex = toNumber % funders.length;
    const treasuryIndex = toNumber % treasuries.length;

    return [funders[funderIndex], treasuries[treasuryIndex]];
}