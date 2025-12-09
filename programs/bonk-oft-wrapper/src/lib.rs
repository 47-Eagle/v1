use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn, MintTo};

declare_id!("11111111111111111111111111111112"); // Will be updated after deployment

/// BONK Token Mint Address (official)
pub const BONK_MINT: &str = "9yiFPjapx5sr5UZELtmfVZK6dnMgQVfzWGL8XB6dbonk";
pub const BONK_MINT_PUBKEY: Pubkey = pubkey!("9yiFPjapx5sr5UZELtmfVZK6dnMgQVfzWGL8XB6dbonk");

#[program]
pub mod bonk_oft_wrapper {
    use super::*;

    /// Initialize the BONK wrapper
    /// Creates the wrapped BONK-OFT token mint
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.admin = ctx.accounts.admin.key();
        config.bonk_mint = BONK_MINT_PUBKEY;
        config.wrapped_mint = ctx.accounts.wrapped_mint.key();
        config.total_wrapped = 0;
        config.paused = false;
        config.bump = ctx.bumps.config;

        msg!("BONK wrapper initialized");

        Ok(())
    }

    /// Deposit BONK tokens and receive wrapped BONK-OFT tokens
    /// User sends BONK, receives equivalent amount of wrapped tokens
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;

        require!(!config.paused, WrapperError::Paused);
        require!(amount > 0, WrapperError::InvalidAmount);
        require!(ctx.accounts.bonk_from.amount >= amount, WrapperError::InsufficientBalance);

        // Transfer BONK from user to wrapper vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bonk_from.to_account_info(),
                    to: ctx.accounts.bonk_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Mint wrapped BONK-OFT tokens to user
        let seeds = &[b"config", &[config.bump]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.wrapped_mint.to_account_info(),
                    to: ctx.accounts.wrapped_to.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Update total wrapped
        let config_mut = &mut ctx.accounts.config;
        config_mut.total_wrapped = config_mut.total_wrapped.checked_add(amount)
            .ok_or(WrapperError::Overflow)?;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            bonk_amount: amount,
            wrapped_amount: amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Deposited {} BONK", amount);

        Ok(())
    }

    /// Withdraw BONK tokens by burning wrapped BONK-OFT tokens
    /// User burns wrapped tokens, receives equivalent BONK back
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;

        require!(!config.paused, WrapperError::Paused);
        require!(amount > 0, WrapperError::InvalidAmount);
        require!(ctx.accounts.wrapped_from.amount >= amount, WrapperError::InsufficientBalance);

        // Burn wrapped BONK-OFT tokens from user
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.wrapped_mint.to_account_info(),
                    from: ctx.accounts.wrapped_from.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Transfer BONK from vault back to user
        let seeds = &[b"bonk_vault", &[ctx.bumps.bonk_vault]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bonk_vault.to_account_info(),
                    to: ctx.accounts.bonk_to.to_account_info(),
                    authority: ctx.accounts.bonk_vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Update total wrapped
        let config_mut = &mut ctx.accounts.config;
        config_mut.total_wrapped = config_mut.total_wrapped.checked_sub(amount)
            .ok_or(WrapperError::Underflow)?;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            bonk_amount: amount,
            wrapped_amount: amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Withdrew {} BONK", amount);

        Ok(())
    }

    /// Emergency pause/unpause
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.paused = paused;
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + WrapperConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, WrapperConfig>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 5, // BONK has 5 decimals
        mint::authority = config,
    )]
    pub wrapped_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = wrapped_mint,
        token::authority = config,
        seeds = [b"wrapped_vault"],
        bump
    )]
    pub wrapped_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        token::mint = BONK_MINT_PUBKEY,
        token::authority = config,
        seeds = [b"bonk_vault"],
        bump
    )]
    pub bonk_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = bonk_mint,
        has_one = wrapped_mint
    )]
    pub config: Account<'info, WrapperConfig>,

    #[account(
        mut,
        address = config.bonk_mint
    )]
    pub bonk_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = config.wrapped_mint
    )]
    pub wrapped_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonk_vault"],
        bump
    )]
    pub bonk_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"wrapped_vault"],
        bump
    )]
    pub wrapped_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = bonk_from.mint == config.bonk_mint,
        constraint = bonk_from.owner == user.key()
    )]
    pub bonk_from: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = wrapped_to.mint == config.wrapped_mint,
        constraint = wrapped_to.owner == user.key()
    )]
    pub wrapped_to: Account<'info, TokenAccount>,

    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = bonk_mint,
        has_one = wrapped_mint
    )]
    pub config: Account<'info, WrapperConfig>,

    #[account(
        address = config.bonk_mint
    )]
    pub bonk_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = config.wrapped_mint
    )]
    pub wrapped_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonk_vault"],
        bump
    )]
    pub bonk_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = bonk_to.mint == config.bonk_mint,
        constraint = bonk_to.owner == user.key()
    )]
    pub bonk_to: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = wrapped_from.mint == config.wrapped_mint,
        constraint = wrapped_from.owner == user.key()
    )]
    pub wrapped_from: Account<'info, TokenAccount>,

    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, WrapperConfig>,

    pub admin: Signer<'info>,
}


// ============================================================================
// State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct WrapperConfig {
    pub admin: Pubkey,
    pub bonk_mint: Pubkey,
    pub wrapped_mint: Pubkey,
    pub total_wrapped: u64,
    pub paused: bool,
    pub bump: u8,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub bonk_amount: u64,
    pub wrapped_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub bonk_amount: u64,
    pub wrapped_amount: u64,
    pub timestamp: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum WrapperError {
    Paused,
    InvalidAmount,
    InsufficientBalance,
    Overflow,
    Underflow,
    Unauthorized,
}
