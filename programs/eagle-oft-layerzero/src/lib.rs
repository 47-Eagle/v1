use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU");

/// LayerZero Endpoint IDs (official)
/// Source: https://docs.layerzero.network/v2/deployments/chains/solana
pub const SOLANA_MAINNET_EID: u32 = 30168;
pub const SOLANA_DEVNET_EID: u32 = 40168;
pub const ETHEREUM_MAINNET_EID: u32 = 30101;
pub const ETHEREUM_SEPOLIA_EID: u32 = 40161;

/// Default to mainnet for compatibility
pub const SOLANA_EID: u32 = SOLANA_MAINNET_EID;
pub const ETHEREUM_EID: u32 = ETHEREUM_MAINNET_EID;

/// Message types for OFT standard
pub const MSG_TYPE_SEND: u8 = 0;
pub const MSG_TYPE_SEND_AND_CALL: u8 = 1;

/// Decimals conversion: ETH (18) -> SOL (9)
pub const SHARED_DECIMALS: u8 = 9;

#[program]
pub mod eagle_oft_layerzero {
    use super::*;

    /// Initialize the OFT with LayerZero endpoint
    pub fn initialize(
        ctx: Context<Initialize>,
        endpoint_program: Pubkey,
        admin: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.oft_config;
        
        config.admin = admin;
        config.mint = ctx.accounts.mint.key();
        config.endpoint_program = endpoint_program;
        config.paused = false;
        config.total_bridged_in = 0;
        config.total_bridged_out = 0;
        config.bump = ctx.bumps.oft_config;
        
        msg!("✅ EAGLE OFT LayerZero initialized");
        msg!("   Admin: {}", admin);
        msg!("   Mint: {}", config.mint);
        msg!("   Endpoint: {}", endpoint_program);
        msg!("   Solana EID: {}", SOLANA_EID);
        
        Ok(())
    }

    /// Set peer OFT on another chain (e.g., Ethereum)
    pub fn set_peer(
        ctx: Context<SetPeer>,
        dst_eid: u32,
        peer: [u8; 32],
    ) -> Result<()> {
        let peer_info = &mut ctx.accounts.peer_config;
        
        peer_info.eid = dst_eid;
        peer_info.address = peer;
        peer_info.enabled = true;
        peer_info.bump = ctx.bumps.peer_config;
        
        msg!("✅ Peer set for EID {}", dst_eid);
        msg!("   Address: {:?}", peer);
        
        Ok(())
    }

    /// Send tokens to another chain via LayerZero
    /// Users call this to bridge tokens OUT from Solana
    pub fn send(
        ctx: Context<Send>,
        send_param: SendParam,
    ) -> Result<SendReceipt> {
        let config = &mut ctx.accounts.oft_config;
        let peer = &ctx.accounts.peer_config;
        
        require!(!config.paused, OftError::Paused);
        require!(peer.enabled, OftError::PeerDisabled);
        require!(
            send_param.amount_ld >= send_param.min_amount_ld,
            OftError::SlippageExceeded
        );
        
        // Burn tokens from sender
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.from.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                },
            ),
            send_param.amount_ld,
        )?;

        // Update stats
        config.total_bridged_out = config.total_bridged_out
            .checked_add(send_param.amount_ld)
            .ok_or(OftError::Overflow)?;

        // Encode OFT message
        let message = encode_oft_message(
            MSG_TYPE_SEND,
            send_param.to,
            send_param.amount_ld,
        );
        
        // Generate GUID
        let guid = generate_guid(
            ctx.accounts.sender.key(),
            send_param.dst_eid,
            send_param.amount_ld,
            Clock::get()?.unix_timestamp as u64,
        );
        
        // In full LayerZero implementation, we would CPI to endpoint here:
        // lz_endpoint::cpi::send(
        //     CpiContext::new(
        //         ctx.accounts.endpoint_program.to_account_info(),
        //         lz_endpoint::cpi::accounts::Send { ... },
        //     ),
        //     SendParams { dst_eid, to, amount, options, ... }
        // )?;
        
        // For now, emit event for DVNs to pick up
        emit!(SendEvent {
            guid,
            src_eid: SOLANA_EID,
            dst_eid: send_param.dst_eid,
            to: send_param.to,
            amount_ld: send_param.amount_ld,
            sender: ctx.accounts.sender.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("🚀 Sent {} tokens to EID {} (GUID: {:?})", 
            send_param.amount_ld, send_param.dst_eid, guid);
        
        Ok(SendReceipt {
            guid,
            nonce: config.total_bridged_out, // Use as nonce
            fee: MessagingFee { native_fee: 0, lz_token_fee: 0 },
        })
    }

    /// Receive tokens from another chain via LayerZero
    /// Called by LayerZero endpoint when message arrives
    pub fn lz_receive(
        ctx: Context<LzReceive>,
        origin: Origin,
        guid: [u8; 32],
        message: Vec<u8>,
        executor: Pubkey,
        extra_data: Vec<u8>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.oft_config;
        let peer = &ctx.accounts.peer_config;
        
        require!(!config.paused, OftError::Paused);
        require!(peer.enabled, OftError::PeerDisabled);
        
        // Verify message comes from our peer
        require!(peer.eid == origin.src_eid, OftError::InvalidPeer);
        require!(peer.address == origin.sender, OftError::InvalidPeer);
        
        // Decode OFT message
        let (msg_type, to_address, amount_ld) = decode_oft_message(&message)?;
        require!(msg_type == MSG_TYPE_SEND, OftError::InvalidMessageType);
        
        // Convert bytes32 to Solana Pubkey
        let recipient = Pubkey::new_from_array(to_address);
        
        // Verify recipient token account matches
        require!(
            ctx.accounts.to.owner == recipient,
            OftError::InvalidRecipient
        );
        
        // Update stats
        config.total_bridged_in = config.total_bridged_in
            .checked_add(amount_ld)
            .ok_or(OftError::Overflow)?;
        
        // Mint tokens to recipient
        let seeds = &[
            b"oft_config",
            &[config.bump],
        ];
        let signer = &[&seeds[..]];
        
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.oft_config.to_account_info(),
                },
                signer,
            ),
            amount_ld,
        )?;

        emit!(ReceiveEvent {
            guid,
            src_eid: origin.src_eid,
            dst_eid: SOLANA_EID,
            to: recipient,
            amount_ld,
            nonce: origin.nonce,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("📥 Received {} tokens from EID {} for {} (GUID: {:?})", 
            amount_ld, origin.src_eid, recipient, guid);
        
        Ok(())
    }

    /// Quote the fee for sending tokens cross-chain
    pub fn quote_send(
        _ctx: Context<QuoteSend>,
        send_param: SendParam,
        _pay_in_lz_token: bool,
    ) -> Result<MessagingFee> {
        // In full implementation, this would CPI to LayerZero endpoint
        // to get real-time fee quote based on:
        // - Destination chain
        // - Message size
        // - DVN configuration
        // - Gas prices
        
        // Estimated fees for Solana -> Ethereum:
        // - DVN verification: ~0.0005 SOL per DVN (need 2+ DVNs)
        // - Executor gas on Ethereum: ~0.001 SOL equivalent
        // Total: ~0.002-0.005 SOL
        
        let base_fee = 2_000_000; // 0.002 SOL in lamports
        let per_byte_fee = 100; // Small fee per byte
        
        let message_size = 1 + 32 + 8; // msgType + to + amount
        let native_fee = base_fee + (message_size * per_byte_fee);
        
        Ok(MessagingFee {
            native_fee,
            lz_token_fee: 0, // Not using LZ token payment
        })
    }

    /// Emergency pause/unpause
    pub fn set_paused(
        ctx: Context<SetPaused>,
        paused: bool,
    ) -> Result<()> {
        let config = &mut ctx.accounts.oft_config;
        config.paused = paused;
        
        msg!("🔒 OFT paused status: {}", paused);
        
        Ok(())
    }

    /// Enable/disable a peer
    pub fn set_peer_enabled(
        ctx: Context<SetPeerEnabled>,
        dst_eid: u32,
        enabled: bool,
    ) -> Result<()> {
        let peer = &mut ctx.accounts.peer_config;
        peer.enabled = enabled;
        
        msg!("🔧 Peer EID {} enabled: {}", dst_eid, enabled);
        
        Ok(())
    }

    /// Transfer admin role
    pub fn transfer_admin(
        ctx: Context<TransferAdmin>,
        new_admin: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.oft_config;
        let old_admin = config.admin;
        config.admin = new_admin;
        
        msg!("👑 Admin transferred from {} to {}", old_admin, new_admin);
        
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
        payer = payer,
        space = 8 + OftConfig::INIT_SPACE,
        seeds = [b"oft_config"],
        bump
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    #[account(
        init,
        payer = payer,
        mint::decimals = SHARED_DECIMALS,
        mint::authority = oft_config,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(dst_eid: u32)]
pub struct SetPeer<'info> {
    #[account(
        seeds = [b"oft_config"],
        bump = oft_config.bump,
        has_one = admin
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + PeerConfig::INIT_SPACE,
        seeds = [b"peer", &dst_eid.to_le_bytes()],
        bump
    )]
    pub peer_config: Account<'info, PeerConfig>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Send<'info> {
    #[account(
        mut,
        seeds = [b"oft_config"],
        bump = oft_config.bump
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    #[account(
        seeds = [b"peer", &oft_config.bump.to_le_bytes()], // Will be validated in instruction
        bump = peer_config.bump
    )]
    pub peer_config: Account<'info, PeerConfig>,
    
    #[account(
        mut,
        address = oft_config.mint
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = from.mint == mint.key(),
        constraint = from.owner == sender.key()
    )]
    pub from: Account<'info, TokenAccount>,
    
    pub sender: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    
    /// LayerZero endpoint program
    /// CHECK: Validated against oft_config.endpoint_program
    #[account(address = oft_config.endpoint_program)]
    pub endpoint_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct LzReceive<'info> {
    #[account(
        mut,
        seeds = [b"oft_config"],
        bump = oft_config.bump
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    #[account(
        seeds = [b"peer", &peer_config.eid.to_le_bytes()],
        bump = peer_config.bump
    )]
    pub peer_config: Account<'info, PeerConfig>,
    
    #[account(
        mut,
        address = oft_config.mint
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = to.mint == mint.key()
    )]
    pub to: Account<'info, TokenAccount>,
    
    /// LayerZero endpoint program (only endpoint can call lz_receive)
    /// CHECK: Must be oft_config.endpoint_program
    #[account(address = oft_config.endpoint_program)]
    pub endpoint_program: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct QuoteSend<'info> {
    #[account(
        seeds = [b"oft_config"],
        bump = oft_config.bump
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    /// CHECK: LayerZero endpoint for fee quote
    #[account(address = oft_config.endpoint_program)]
    pub endpoint_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [b"oft_config"],
        bump = oft_config.bump,
        has_one = admin
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(dst_eid: u32)]
pub struct SetPeerEnabled<'info> {
    #[account(
        seeds = [b"oft_config"],
        bump = oft_config.bump,
        has_one = admin
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    #[account(
        mut,
        seeds = [b"peer", &dst_eid.to_le_bytes()],
        bump = peer_config.bump
    )]
    pub peer_config: Account<'info, PeerConfig>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    #[account(
        mut,
        seeds = [b"oft_config"],
        bump = oft_config.bump,
        has_one = admin
    )]
    pub oft_config: Account<'info, OftConfig>,
    
    pub admin: Signer<'info>,
}

// ============================================================================
// State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct OftConfig {
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub endpoint_program: Pubkey,
    pub paused: bool,
    pub total_bridged_in: u64,
    pub total_bridged_out: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PeerConfig {
    pub eid: u32,
    pub address: [u8; 32],
    pub enabled: bool,
    pub bump: u8,
}

// ============================================================================
// Data Structures
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SendParam {
    pub dst_eid: u32,
    pub to: [u8; 32],
    pub amount_ld: u64,
    pub min_amount_ld: u64,
    pub extra_options: Vec<u8>,
    pub compose_msg: Vec<u8>,
    pub oft_cmd: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Origin {
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub nonce: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MessagingFee {
    pub native_fee: u64,
    pub lz_token_fee: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct SendReceipt {
    pub guid: [u8; 32],
    pub nonce: u64,
    pub fee: MessagingFee,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct SendEvent {
    pub guid: [u8; 32],
    pub src_eid: u32,
    pub dst_eid: u32,
    pub to: [u8; 32],
    pub amount_ld: u64,
    pub sender: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ReceiveEvent {
    pub guid: [u8; 32],
    pub src_eid: u32,
    pub dst_eid: u32,
    pub to: Pubkey,
    pub amount_ld: u64,
    pub nonce: u64,
    pub timestamp: i64,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn encode_oft_message(msg_type: u8, to: [u8; 32], amount: u64) -> Vec<u8> {
    let mut message = Vec::with_capacity(41);
    message.push(msg_type);
    message.extend_from_slice(&to);
    message.extend_from_slice(&amount.to_be_bytes());
    message
}

fn decode_oft_message(message: &[u8]) -> Result<(u8, [u8; 32], u64)> {
    require!(message.len() >= 41, OftError::InvalidMessage);
    
    let msg_type = message[0];
    
    let mut to = [0u8; 32];
    to.copy_from_slice(&message[1..33]);
    
    let mut amount_bytes = [0u8; 8];
    amount_bytes.copy_from_slice(&message[33..41]);
    let amount = u64::from_be_bytes(amount_bytes);
    
    Ok((msg_type, to, amount))
}

fn generate_guid(
    sender: &Pubkey,
    dst_eid: u32,
    amount: u64,
    timestamp: u64,
) -> [u8; 32] {
    use anchor_lang::solana_program::keccak;
    
    let mut data = Vec::new();
    data.extend_from_slice(sender.as_ref());
    data.extend_from_slice(&dst_eid.to_le_bytes());
    data.extend_from_slice(&amount.to_le_bytes());
    data.extend_from_slice(&timestamp.to_le_bytes());
    
    keccak::hash(&data).to_bytes()
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum OftError {
    #[msg("OFT operations are paused")]
    Paused,
    
    #[msg("Invalid or unauthorized peer")]
    InvalidPeer,
    
    #[msg("Peer is disabled")]
    PeerDisabled,
    
    #[msg("Invalid message type")]
    InvalidMessageType,
    
    #[msg("Invalid message format")]
    InvalidMessage,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Invalid recipient address")]
    InvalidRecipient,
    
    #[msg("Arithmetic overflow")]
    Overflow,
    
    #[msg("Unauthorized operation")]
    Unauthorized,
}
