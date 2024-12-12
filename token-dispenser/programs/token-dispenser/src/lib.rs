#![allow(clippy::result_large_err)]
use anchor_lang::{ prelude::*, solana_program::bpf_loader_upgradeable };

declare_id!("Wapq3Hpv2aSKjWrh4pM8eweh8jVJB7D1nLBw9ikjVYx");

#[derive(Accounts)]
pub struct CloseAccounts<'info> {
  #[account(
    mut,
    address = program_data.upgrade_authority_address.unwrap() @ ErrorCode::UpgradeAuthorityMismatch
  )]
  /// CHECK: leave britney alone
  pub upgrade_authority: UncheckedAccount<'info>, //= recipient of the recovered rent

  #[account(
    seeds = [crate::ID.as_ref()],
    bump,
    seeds::program = bpf_loader_upgradeable::ID,
  )]
  pub program_data: Account<'info, ProgramData>,

  //accounts to be closed as remaining accounts (can be claims and config too)
}

#[program]
pub mod token_dispenser {
  use super::*;

  pub fn close_accounts(ctx: Context<CloseAccounts>) -> Result<()> {
    let mut recovered_lamports = 0;

    for account in ctx.remaining_accounts.iter() {
      recovered_lamports += account.lamports();
      **account.try_borrow_mut_lamports()? = 0;
    }

    **ctx.accounts.upgrade_authority.try_borrow_mut_lamports()? += recovered_lamports;

    Ok(())
  }
}

#[error_code]
pub enum ErrorCode {
  UpgradeAuthorityMismatch,
}
