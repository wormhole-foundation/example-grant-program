import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import tokenDispenser from './idl/token_dispenser.json'
import { ethers } from 'ethers'
import { base32decode, removeLeading0x } from './index'

// Must be kept in line with the database types and the on-chain program
export const Ecosystems = [
  'discord',
  'solana',
  'evm',
  'sui',
  'algorand',
  'aptos',
  'terra',
  'osmosis',
  'injective',
] as const
export type Ecosystem = typeof Ecosystems[number]

export class ClaimInfo {
  constructor(
    public ecosystem: Ecosystem,
    public identity: string,
    public amount: anchor.BN
  ) {}

  /** Get the serialized form of this claim info that is stored as leaves in the merkle tree. */
  public toBuffer(): Buffer {
    let identityStruct: any = undefined
    switch (this.ecosystem) {
      case 'discord': {
        identityStruct = { discord: { username: this.identity } }
        break
      }
      case 'solana': {
        identityStruct = {
          solana: { pubkey: new PublicKey(this.identity).toBuffer() },
        }
        break
      }
      case 'evm': {
        identityStruct = {
          evm: {
            pubkey: Array.from(ethers.getBytes(this.identity)),
          },
        }
        break
      }
      case 'sui': {
        identityStruct = {
          sui: {
            address: Buffer.from(removeLeading0x(this.identity), 'hex'),
          },
        }
        break
      }
      case 'aptos': {
        identityStruct = {
          aptos: {
            address: Buffer.from(removeLeading0x(this.identity), 'hex'),
          },
        }
        break
      }
      case 'terra':
      case 'osmosis': {
        identityStruct = {
          cosmwasm: { address: this.identity },
        }
        break
      }
      case 'injective': {
        identityStruct = {
          injective: { address: this.identity },
        }
        break
      }
      case 'algorand': {
        identityStruct = {
          algorand: {
            pubkey: base32decode(this.identity).subarray(0, 32),
          },
        }
        break
      }
      default: {
        // TODO: support the other ecosystems
        throw new Error(`unknown ecosystem type: ${this.ecosystem}`)
      }
    }

    const coder = new anchor.BorshCoder(tokenDispenser as anchor.Idl)
    // type ascription needed because typescript doesn't think the two buffer types are equal for some reason.
    return coder.types.encode('ClaimInfo', {
      amount: this.amount,
      identity: identityStruct,
    }) as Buffer
  }
}

export function getMaxAmount(claimInfos: ClaimInfo[]): anchor.BN {
  return claimInfos.reduce((prev, curr) => {
    return anchor.BN.max(prev, curr.amount)
  }, new anchor.BN(0))
}
