#![allow(clippy::result_large_err)]
use {
    anchor_lang::{
        prelude::*,
        solana_program::{
            pubkey,
            keccak::hashv,
            program::{
                invoke,
                invoke_signed,
            },
            system_instruction,
            sysvar::instructions::{
                load_instruction_at_checked,
                ID as SYSVAR_IX_ID,
            },
        },
        system_program,
    },
    anchor_spl::{
        associated_token::{
            self,
            AssociatedToken,
        },
        token::{
            spl_token,
            Mint,
            Token,
            TokenAccount,
        },
    },
    ecosystems::{
        algorand::AlgorandMessage,
        aptos::{
            AptosAddress,
            AptosMessage,
        },
        check_payload,
        cosmos::{
            CosmosBech32Address,
            CosmosMessage,
            UncompressedSecp256k1Pubkey,
        },
        discord::DiscordMessage,
        ed25519::{
            Ed25519InstructionData,
            Ed25519Pubkey,
        },
        evm::EvmPrefixedMessage,
        secp256k1::{
            secp256k1_verify_signer,
            EvmPubkey,
            Secp256k1InstructionData,
            Secp256k1Signature,
        },
        sui::{
            SuiAddress,
            SuiMessage,
        },
    },
    pythnet_sdk::{
        accumulators::merkle::{
            MerklePath,
            MerkleRoot,
            MerkleTree,
        },
        hashers::Hasher,
    },
};

#[cfg(test)]
mod tests;

mod ecosystems;

//butt ugly but straightforward
const FORBIDDEN_SOL: &[Pubkey] = &[
    pubkey!("5XiqTJQBTZKcGjcbCydZvf9NzhE2R3g7GDx1yKHxs8jd"),
    pubkey!("74YpKKAScQky4YouDXMfnGnXFbUQcccp958B8R8eQrvV"),
    pubkey!("Esmx2QjmDZMjJ15yBJ2nhqisjEt7Gqro4jSkofdoVsvY"),
    pubkey!("ALDxR5NXJLruoRNQDk88AiF9FXyTN3iQ9E8NQB73zSoh"),
    pubkey!("8ggviFegLUzsddm9ShyMy42TiDYyH9yDDS3gSGdejND7"),
    pubkey!("4nBEtJKz99WJKqNYmdmpogayqcvXBQ2PxrkwgjYENhjt"),
    pubkey!("G3udanrxk8stVe8Se2zXmJ3QwU8GSFJMn28mTfn8t1kq"),
    pubkey!("AgJddDJLt17nHyXDCpyGELxwsZZQPqfUsuwzoiqVGJwD"),
    pubkey!("CxegPrfn2ge5dNiQberUrQJkHCcimeR4VXkeawcFBBka"),
    pubkey!("HuiYfmAceFkmhu3yP8t3a6VMYfw3VSX2Ymqqj9M2k9ib"),
    pubkey!("B9UAHnGTS31u3vpaTM79eyQowMMjYP3uzn6XQucAYRv7"),
    pubkey!("3SEn2DertMoxBEq1MY4Fg27LsQmkdFGQH4yzmEGfsS6e"),
    pubkey!("6D7fgzpPZXtDB6Zqg3xRwfbohzerbytB2U5pFchnVuzw"),
    pubkey!("76w4SBe2of2wWUsx2FjkkwD29rRznfvEkBa1upSbTAWH"),
    pubkey!("61wJT43nWMUpDR92wC7pmo6xoJRh2s4kCYRBq4d5XQHZ"),
    pubkey!("6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH"),
];

const FORBIDDEN_EVM: &[[u8; EvmPubkey::LEN]] = &[
    [   //0x748e1932a18dc7adce63ab7e8e705004128402fd
        0x74, 0x8e, 0x19, 0x32, 0xa1, 0x8d, 0xc7, 0xad, 0xce, 0x63,
        0xab, 0x7e, 0x8e, 0x70, 0x50, 0x04, 0x12, 0x84, 0x02, 0xfd,
    ],
    [   //0x2fc617e933a52713247ce25730f6695920b3befe
        0x2f, 0xc6, 0x17, 0xe9, 0x33, 0xa5, 0x27, 0x13, 0x24, 0x7c,
        0xe2, 0x57, 0x30, 0xf6, 0x69, 0x59, 0x20, 0xb3, 0xbe, 0xfe,
    ],
];

// -- Keys used for testing --
//
//I'd have loved to use #[cfg(test)] but when running `cargo test-bpf` as we
//  are for testing, it first compiles the program without it and so the
//  real addresses end up in the program that the local test validator
//  tests against. I couldn't find any doc on whether test-bpf sets some
//  other feature that I could use to conditionally compile the real keys
//  into the program, and so here we are. Another piece of garbage in the
//  landfill.
//So to run the forbidden key tests, comment out the real keys and uncomment
//  the forbidden keys along with the test at the bottom of test_claims (you
//  can also find the private keys for our two test wallets there).
//
// const FORBIDDEN_SOL: &[Pubkey] = &[
//     pubkey!("UnsedTest1111111111111111111111111111111111"),
//     pubkey!("bW5NFQvLwCKo826zr8m8DXHtUYkCF6Nn53QoKXLmW7b"),
//     pubkey!("UnsedTest1111111111111111111111111111111112"),
// ];
// const FORBIDDEN_EVM: &[[u8; EvmPubkey::LEN]] = &[
//     [   //0x7e577e577e577e577e577e577e577e577e577e57
//         0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57,
//         0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57,
//     ],
//     [   //0xd3E739d874789CB4545dD745eb391BE54A5505e2
//         0xd3, 0xe7, 0x39, 0xd8, 0x74, 0x78, 0x9c, 0xb4, 0x54, 0x5d,
//         0xd7, 0x45, 0xeb, 0x39, 0x1b, 0xe5, 0x4a, 0x55, 0x05, 0xe2,
//     ],
//     [   //0x00007e577e577e577e577e577e577e577e570000
//         0x00, 0x00, 0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57,
//         0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57, 0x7e, 0x57, 0x00, 0x00,
//     ],
// ];

declare_id!("Wapq3Hpv2aSKjWrh4pM8eweh8jVJB7D1nLBw9ikjVYx");

const CONFIG_SEED: &[u8] = b"config";
const RECEIPT_SEED: &[u8] = b"receipt";
#[program]
pub mod token_dispenser {
    use {
        super::*,
        anchor_spl::token,
    };

    /// This can only be called once and should be called right after the program is deployed.
    pub fn initialize(
        ctx: Context<Initialize>,
        merkle_root: MerkleRoot<SolanaHasher>,
        dispenser_guard: Pubkey,
        max_transfer: u64,
    ) -> Result<()> {
        require_keys_neq!(dispenser_guard, Pubkey::default());
        let config: &mut Account<'_, Config> = &mut ctx.accounts.config;
        config.bump = *ctx.bumps.get("config").unwrap();
        config.merkle_root = merkle_root;
        config.dispenser_guard = dispenser_guard;
        config.mint = ctx.accounts.mint.key();
        config.address_lookup_table = ctx.accounts.address_lookup_table.key();
        config.max_transfer = max_transfer;
        Ok(())
    }

    /**
     * Claim a claimant's tokens. This instructions needs to enforce :
     * - The dispenser guard has signed the transaction - DONE
     * - The claimant is claiming no more than once per ecosystem - DONE
     * - The claimant has provided a valid proof of identity (is the owner of the wallet
     *   entitled to the tokens)
     * - The claimant has provided a valid proof of inclusion (this confirm that the claimant --
     *   DONE
     * - The claimant has not already claimed tokens -- DONE
     */
    pub fn claim<'info>(
        ctx: Context<'_, '_, '_, 'info, Claim<'info>>,
        claim_certificate: ClaimCertificate,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let treasury = &mut ctx.accounts.treasury;
        let claimant_fund = &ctx.accounts.claimant_fund;

        match claim_certificate.proof_of_identity {
            IdentityCertificate::Solana => {
                let claimant_key = ctx.accounts.claimant.key;
                require!(
                    !FORBIDDEN_SOL
                        .iter()
                        .any(|&key| *claimant_key == key),
                    ErrorCode::Forbidden
                );
            }
            IdentityCertificate::Evm { pubkey, .. } => {
                let pubkey_bytes = &pubkey.as_bytes();
                require!(
                    !FORBIDDEN_EVM.iter().any(|addr| *pubkey_bytes == *addr),
                    ErrorCode::Forbidden
                );
            }
            _ => {}
        }

        // Check that the identity corresponding to the leaf has authorized the claimant
        let claim_info = claim_certificate.checked_into_claim_info(
            &ctx.accounts.sysvar_instruction,
            ctx.accounts.claimant.key,
            &ctx.accounts.config.dispenser_guard,
        )?;
        // Each leaf of the tree is a hash of the serialized claim info
        let leaf_vector = claim_info.try_to_vec()?;

        if !config
            .merkle_root
            .check(claim_certificate.proof_of_inclusion.clone(), &leaf_vector)
        {
            return err!(ErrorCode::InvalidInclusionProof);
        };


        checked_create_claim_receipt(
            0,
            &leaf_vector,
            &ctx.accounts.funder,
            &ctx.accounts.system_program,
            ctx.remaining_accounts,
        )?;

        require_gte!(
            config.max_transfer,
            claim_info.amount,
            ErrorCode::TransferExceedsMax
        );

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from:      treasury.to_account_info(),
                    to:        claimant_fund.to_account_info(),
                    authority: config.to_account_info(),
                },
                &[&[CONFIG_SEED, &[config.bump]]],
            ),
            claim_info.amount,
        )?;

        // reload treasury account from storage to get the updated balance
        treasury.reload()?;

        emit!(ClaimEvent {
            remaining_balance: treasury.amount,
            treasury: ctx.accounts.treasury.key(),
            claimant: *ctx.accounts.claimant.key,
            claim_info,
        });


        Ok(())
    }
}

////////////////////////////////////////////////////////////////////////////////
// Contexts.
////////////////////////////////////////////////////////////////////////////////

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer:                Signer<'info>,
    #[account(init, payer = payer, space = Config::LEN, seeds = [CONFIG_SEED], bump)]
    pub config:               Account<'info, Config>,
    pub mint:                 Account<'info, Mint>,
    pub system_program:       Program<'info, System>,
    /// CHECK: we only store this on-chain so it can be conveniently looked up off-chain
    #[account(owner = solana_address_lookup_table_program::id())]
    pub address_lookup_table: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(claim_certificate : ClaimCertificate)]
pub struct Claim<'info> {
    #[account(mut)]
    pub funder:                   Signer<'info>, // Funds the claimant_fund and the claim receipt account
    pub claimant:                 Signer<'info>,
    /// Claimant's associated token account to receive the tokens
    /// Should be initialized outside of this program.
    #[account(
        init_if_needed,
        payer = funder,
        associated_token::authority = claimant,
        associated_token::mint = mint,
    )]
    pub claimant_fund:            Account<'info, TokenAccount>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = mint)]
    pub config:                   Account<'info, Config>,
    pub mint:                     Account<'info, Mint>,
    #[account(mut)]
    pub treasury:                 Account<'info, TokenAccount>,
    pub token_program:            Program<'info, Token>,
    pub system_program:           Program<'info, System>,
    /// CHECK : Anchor wants me to write this comment because I'm using AccountInfo which doesn't check for ownership and doesn't deserialize the account automatically. But it's fine because I check the address and I load it using load_instruction_at_checked.
    #[account(address = SYSVAR_IX_ID)]
    pub sysvar_instruction:       AccountInfo<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


////////////////////////////////////////////////////////////////////////////////
// Instruction calldata.
////////////////////////////////////////////////////////////////////////////////

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimInfo {
    pub identity: Identity,
    pub amount:   u64,
}

/**
 * This is the identity that the claimant will use to claim tokens.
 * A claimant can claim tokens for 1 identity on each ecosystem.
 * Typically for a blockchain it is a public key in the blockchain's address space.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum Identity {
    Discord { username: String },
    Solana { pubkey: Ed25519Pubkey },
    Evm { pubkey: EvmPubkey },
    Sui { address: SuiAddress },
    Aptos { address: AptosAddress },
    Cosmwasm { address: CosmosBech32Address },
    Injective { address: CosmosBech32Address },
    Algorand { pubkey: Ed25519Pubkey },
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum IdentityCertificate {
    Discord {
        username:                       String,
        verification_instruction_index: u8,
    },
    Evm {
        pubkey:                         EvmPubkey,
        verification_instruction_index: u8,
    },
    Solana,
    Sui {
        pubkey:                         Ed25519Pubkey,
        verification_instruction_index: u8,
    },
    Aptos {
        pubkey:                         Ed25519Pubkey,
        verification_instruction_index: u8,
    },
    Cosmwasm {
        chain_id:    String,
        signature:   Secp256k1Signature,
        recovery_id: u8,
        pubkey:      UncompressedSecp256k1Pubkey,
        message:     Vec<u8>,
    },
    Injective {
        pubkey:                         EvmPubkey,
        verification_instruction_index: u8,
    },
    Algorand {
        pubkey:                         Ed25519Pubkey,
        verification_instruction_index: u8,
    },
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimCertificate {
    pub amount:             u64,
    pub proof_of_identity:  IdentityCertificate,
    pub proof_of_inclusion: MerklePath<SolanaHasher>, // Proof that the leaf is in the tree
}

////////////////////////////////////////////////////////////////////////////////
// Accounts.
////////////////////////////////////////////////////////////////////////////////

/**
 * A hasher that uses the solana pre-compiled keccak256 function.
 */
#[derive(Default, Debug, Clone, PartialEq)]
pub struct SolanaHasher {}
impl SolanaHasher {
    const LEN: usize = 20;
}
impl Hasher for SolanaHasher {
    type Hash = [u8; Self::LEN];

    fn hashv(data: &[impl AsRef<[u8]>]) -> Self::Hash {
        let bytes = hashv(&data.iter().map(|x| x.as_ref()).collect::<Vec<&[u8]>>());
        let mut hash = [0u8; Self::LEN];
        hash.copy_from_slice(&bytes.as_ref()[0..Self::LEN]);
        hash
    }
}

#[account]
#[derive(PartialEq, Debug)]
pub struct Config {
    pub bump:                 u8,
    pub merkle_root:          MerkleRoot<SolanaHasher>,
    pub dispenser_guard:      Pubkey,
    pub mint:                 Pubkey,
    pub address_lookup_table: Pubkey,
    pub max_transfer:         u64, // This is an extra safeguard to prevent the dispenser from being drained
}

impl Config {
    pub const LEN: usize = 8 + 1 + SolanaHasher::LEN + 32 + 32 + 32 + 8;
}

#[account]
pub struct Receipt {}

////////////////////////////////////////////////////////////////////////////////
// Error.
////////////////////////////////////////////////////////////////////////////////

#[error_code]
pub enum ErrorCode {
    AlreadyClaimed,
    InvalidInclusionProof,
    WrongPda,
    // Signature verification errors
    SignatureVerificationWrongProgram,
    SignatureVerificationWrongAccounts,
    SignatureVerificationWrongHeader,
    SignatureVerificationWrongPayload,
    SignatureVerificationWrongPayloadMetadata,
    SignatureVerificationWrongSigner,
    UnauthorizedCosmosChainId,
    TransferExceedsMax,
    Forbidden,
}

pub fn check_claim_receipt_is_uninitialized(claim_receipt_account: &AccountInfo) -> Result<()> {
    if claim_receipt_account.owner.eq(&crate::id()) {
        return Err(ErrorCode::AlreadyClaimed.into());
    }
    Ok(())
}

/**
 * Checks that a proof of identity is valid and returns the underlying identity.
 * For some ecosystems like EVM we use a signature verification program,
 * for others like cosmos the signature is included in the ClaimCertificate.
 */
impl IdentityCertificate {
    pub fn checked_into_identity(
        &self,
        sysvar_instruction: &AccountInfo,
        claimant: &Pubkey,
        dispenser_guard: &Pubkey,
    ) -> Result<Identity> {
        match self {
            IdentityCertificate::Discord {
                username,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                let discord_message = DiscordMessage::parse_and_check_claimant_and_username(
                    &Ed25519InstructionData::extract_message_and_check_signature(
                        &signature_verification_instruction,
                        &Ed25519Pubkey::from(*dispenser_guard),
                        verification_instruction_index,
                    )?,
                    username,
                    claimant,
                )?;

                Ok(Identity::Discord {
                    username: discord_message.get_username(),
                })
            }
            IdentityCertificate::Evm {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                check_payload(
                    EvmPrefixedMessage::parse(
                        &Secp256k1InstructionData::extract_message_and_check_signature(
                            &signature_verification_instruction,
                            pubkey,
                            verification_instruction_index,
                        )?,
                    )?
                    .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Evm { pubkey: *pubkey })
            }
            IdentityCertificate::Cosmwasm {
                pubkey,
                chain_id,
                signature,
                recovery_id,
                message,
            } => {
                secp256k1_verify_signer(signature, recovery_id, pubkey, message)?;
                let cosmos_bech32 = pubkey.into_bech32(chain_id)?;
                CosmosMessage::check_hashed_payload(message, &cosmos_bech32, claimant)?;
                Ok(Identity::Cosmwasm {
                    address: cosmos_bech32,
                })
            }
            IdentityCertificate::Algorand {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                check_payload(
                    AlgorandMessage::parse(
                        &Ed25519InstructionData::extract_message_and_check_signature(
                            &signature_verification_instruction,
                            pubkey,
                            verification_instruction_index,
                        )?,
                    )?
                    .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Algorand {
                    pubkey: pubkey.clone(),
                })
            }
            IdentityCertificate::Aptos {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                check_payload(
                    AptosMessage::parse(
                        &Ed25519InstructionData::extract_message_and_check_signature(
                            &signature_verification_instruction,
                            pubkey,
                            verification_instruction_index,
                        )?,
                    )?
                    .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Aptos {
                    address: Into::<AptosAddress>::into(pubkey.clone()),
                })
            }
            IdentityCertificate::Sui {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                SuiMessage::check_hashed_payload(
                    &Ed25519InstructionData::extract_message_and_check_signature(
                        &signature_verification_instruction,
                        pubkey,
                        verification_instruction_index,
                    )?,
                    claimant,
                )?;
                Ok(Identity::Sui {
                    address: Into::<SuiAddress>::into(pubkey.clone()),
                })
            }
            IdentityCertificate::Solana => Ok(Identity::Solana {
                pubkey: Ed25519Pubkey::from(*claimant), // Solana verification relies on claimant signing the Solana transaction
            }),
            IdentityCertificate::Injective {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                let cosmos_bech32 = CosmosBech32Address::from(*pubkey);
                check_payload(
                    EvmPrefixedMessage::parse(
                        &Secp256k1InstructionData::extract_message_and_check_signature(
                            &signature_verification_instruction,
                            pubkey,
                            verification_instruction_index,
                        )?,
                    )?
                    .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Injective {
                    address: cosmos_bech32,
                })
            }
        }
    }
}

/**
 * Check that the identity of the claim_info has authorized the claimant by signing a message.
 */
impl ClaimCertificate {
    pub fn checked_into_claim_info(
        &self,
        sysvar_instruction: &AccountInfo,
        claimant: &Pubkey,
        dispenser_guard: &Pubkey,
    ) -> Result<ClaimInfo> {
        Ok(ClaimInfo {
            identity: self.proof_of_identity.checked_into_identity(
                sysvar_instruction,
                claimant,
                dispenser_guard,
            )?,
            amount:   self.amount,
        })
    }
}


/**
 * Creates a claim receipt for the claimant. This is an account that contains no data. Each leaf
 * is associated with a unique claim receipt account. Since the number of claim receipt accounts
 * to be passed to the program is dynamic and equal to the size of `claim_certificates`, it is
 * awkward to declare them in the anchor context. Instead, we pass them inside
 * remaining_accounts. If the account is initialized, the assign instruction will fail.
 */
pub fn checked_create_claim_receipt<'info>(
    index: usize,
    leaf: &[u8],
    funder: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
) -> Result<()> {
    let (receipt_pubkey, bump) = get_receipt_pda(leaf);


    // The claim receipt accounts should appear in remaining accounts in the same order as the claim certificates
    let claim_receipt_account = &remaining_accounts[index];
    require_keys_eq!(
        claim_receipt_account.key(),
        receipt_pubkey,
        ErrorCode::WrongPda
    );

    check_claim_receipt_is_uninitialized(claim_receipt_account)?;

    let account_infos = vec![
        claim_receipt_account.clone(),
        funder.to_account_info(),
        system_program.to_account_info(),
    ];
    // Pay rent for the receipt account
    let transfer_instruction = system_instruction::transfer(
        &funder.key(),
        &claim_receipt_account.key(),
        Rent::get()?
            .minimum_balance(0)
            .saturating_sub(claim_receipt_account.lamports()),
    );
    invoke(&transfer_instruction, &account_infos)?;

    // Assign it to the program, this instruction will fail if the account already belongs to the
    // program
    let assign_instruction = system_instruction::assign(&claim_receipt_account.key(), &crate::id());
    invoke_signed(
        &assign_instruction,
        &account_infos,
        &[&[
            RECEIPT_SEED,
            &MerkleTree::<SolanaHasher>::hash_leaf(leaf),
            &[bump],
        ]],
    )
    .map_err(|_| ErrorCode::AlreadyClaimed)?;

    Ok(())
}


////////////////////////////////////////////////////////////////////////////////
// Sdk.
////////////////////////////////////////////////////////////////////////////////

pub fn get_config_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED], &crate::id())
}

pub fn get_receipt_pda(leaf: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[RECEIPT_SEED, &MerkleTree::<SolanaHasher>::hash_leaf(leaf)],
        &crate::id(),
    )
}

impl crate::accounts::Initialize {
    pub fn populate(payer: Pubkey, mint: Pubkey, address_lookup_table: Pubkey) -> Self {
        crate::accounts::Initialize {
            payer,
            config: get_config_pda().0,
            mint,
            system_program: system_program::System::id(),
            address_lookup_table,
        }
    }
}

impl crate::accounts::Claim {
    pub fn populate(
        funder: Pubkey,
        claimant: Pubkey,
        mint: Pubkey,
        claimant_fund: Pubkey,
        treasury: Pubkey,
    ) -> Self {
        crate::accounts::Claim {
            funder,
            claimant,
            claimant_fund,
            config: get_config_pda().0,
            mint,
            treasury,
            token_program: spl_token::id(),
            system_program: system_program::System::id(),
            sysvar_instruction: SYSVAR_IX_ID,
            associated_token_program: associated_token::ID,
        }
    }
}


////////////////////////////////////////////////////////////////////////////////
// Event
////////////////////////////////////////////////////////////////////////////////

#[event]
pub struct ClaimEvent {
    pub treasury:          Pubkey,
    pub remaining_balance: u64,
    pub claimant:          Pubkey,
    pub claim_info:        ClaimInfo,
}
