import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount
} from '@solana/spl-token';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { EagleOftLayerzero } from '../target/types/eagle_oft_layerzero';
import * as fs from 'fs';

// EAGLE Token Constants
export const EAGLE_MINT = new PublicKey('9yiFPjapx5sr5UZELtmfVZK6dnMgQVfzWGL8XB6dbonk');
export const EAGLE_DECIMALS = 5;

// Bridge event types
export interface BridgeEvent {
  bridgeId: string;
  amount: number;
  from: PublicKey;
  to: string; // Destination address (bytes32 as hex)
  destinationChain: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

// Merkle proof for claims
export interface BridgeProof {
  bridgeId: string;
  amount: number;
  from: PublicKey;
  to: string;
  destinationChain: number;
  timestamp: number;
  merkleProof: string[];
  root: string;
}

/**
 * EAGLE Bridge - Client-side bridging for EAGLE token using existing OFT infrastructure
 */
export class EagleBridge {
  private connection: Connection;
  private wallet: Wallet;
  private oftProgram: Program<EagleOftLayerzero>;
  private bridgeEvents: Map<string, BridgeEvent> = new Map();

  constructor(
    connection: Connection,
    wallet: Wallet,
    oftProgram: Program<EagleOftLayerzero>
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.oftProgram = oftProgram;
  }

  /**
   * Bridge EAGLE tokens to another chain
   */
  async bridgeEagle(
    amount: number,
    destinationAddress: string,
    destinationChain: number
  ): Promise<{ bridgeId: string; txHash: string }> {
    console.log(`🌉 Bridging ${amount} EAGLE to chain ${destinationChain}`);

    // 1. Get user's EAGLE token account
    const userBonkAccount = await getAssociatedTokenAddress(
      EAGLE_MINT,
      this.wallet.publicKey
    );

    // 2. Check EAGLE balance
    const accountInfo = await getAccount(this.connection, userBonkAccount);
    const balance = Number(accountInfo.amount) / Math.pow(10, EAGLE_DECIMALS);

    if (balance < amount) {
      throw new Error(`Insufficient EAGLE balance: ${balance} < ${amount}`);
    }

    // 3. Create bridge vault for this bridge (deterministic PDA)
    const bridgeId = this.generateBridgeId();
    const [bridgeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('eagle_bridge'), Buffer.from(bridgeId)],
      this.oftProgram.programId
    );

    // 4. Create vault token account if it doesn't exist
    const vaultBonkAccount = await getAssociatedTokenAddress(
      EAGLE_MINT,
      bridgeVault,
      true // allowOwnerOffCurve
    );

    // 5. Build transaction
    const transaction = new Transaction();

    // Create vault EAGLE account if needed
    try {
      await getAccount(this.connection, vaultBonkAccount);
    } catch {
      // Account doesn't exist, create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,
          vaultBonkAccount,
          bridgeVault,
          EAGLE_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Transfer EAGLE to vault (lock it)
    const transferAmount = Math.floor(amount * Math.pow(10, EAGLE_DECIMALS));
    transaction.add(
      createTransferInstruction(
        userBonkAccount,
        vaultBonkAccount,
        this.wallet.publicKey,
        transferAmount
      )
    );

    // 6. Record bridge event
    const bridgeEvent: BridgeEvent = {
      bridgeId,
      amount,
      from: this.wallet.publicKey,
      to: destinationAddress,
      destinationChain,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.bridgeEvents.set(bridgeId, bridgeEvent);
    this.saveBridgeEvent(bridgeEvent);

    // 7. Execute transaction
    const txHash = await this.connection.sendTransaction(
      transaction,
      [this.wallet.payer]
    );

    console.log(`✅ EAGLE locked in vault. TX: ${txHash}`);

    // 8. Call existing OFT program (this could be enhanced with actual LayerZero messaging)
    // For now, this is a "virtual" bridge - in production you'd integrate with LayerZero
    const oftTx = await this.oftProgram.methods
      .initialize(
        SystemProgram.programId, // placeholder endpoint
        this.wallet.publicKey
      )
      .accounts({
        oftConfig: PublicKey.findProgramAddressSync(
          [Buffer.from('oft_config')],
          this.oftProgram.programId
        )[0],
        mint: EAGLE_MINT,
        payer: this.wallet.publicKey,
      })
      .rpc();

    console.log(`✅ OFT notified. TX: ${oftTx}`);

    // Update bridge event
    bridgeEvent.txHash = txHash;
    this.saveBridgeEvent(bridgeEvent);

    return { bridgeId, txHash };
  }

  /**
   * Claim EAGLE tokens on destination chain
   * In production, this would verify proofs from the source chain
   */
  async claimBonk(
    bridgeId: string,
    proof: BridgeProof
  ): Promise<string> {
    console.log(`🎯 Claiming EAGLE for bridge ${bridgeId}`);

    // Verify proof (simplified - in production use merkle verification)
    if (!this.verifyBridgeProof(proof)) {
      throw new Error('Invalid bridge proof');
    }

    // Get bridge vault
    const [bridgeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('eagle_bridge'), Buffer.from(bridgeId)],
      this.oftProgram.programId
    );

    const vaultBonkAccount = await getAssociatedTokenAddress(
      EAGLE_MINT,
      bridgeVault,
      true
    );

    // Get recipient's EAGLE account
    const recipientBonkAccount = await getAssociatedTokenAddress(
      EAGLE_MINT,
      new PublicKey(proof.from) // In production, this would be the claimer
    );

    // Transfer EAGLE from vault to recipient
    const transaction = new Transaction();
    const transferAmount = Math.floor(proof.amount * Math.pow(10, EAGLE_DECIMALS));

    transaction.add(
      createTransferInstruction(
        vaultBonkAccount,
        recipientBonkAccount,
        bridgeVault, // Authorized by the bridge vault
        transferAmount
      )
    );

    const txHash = await this.connection.sendTransaction(
      transaction,
      [this.wallet.payer] // In production, this would be signed by a relayer
    );

    console.log(`✅ EAGLE claimed. TX: ${txHash}`);

    // Update bridge event status
    const bridgeEvent = this.bridgeEvents.get(bridgeId);
    if (bridgeEvent) {
      bridgeEvent.status = 'completed';
      this.saveBridgeEvent(bridgeEvent);
    }

    return txHash;
  }

  /**
   * Get bridge status
   */
  getBridgeStatus(bridgeId: string): BridgeEvent | undefined {
    return this.bridgeEvents.get(bridgeId);
  }

  /**
   * Generate unique bridge ID
   */
  private generateBridgeId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `bonk_${timestamp}_${random}`;
  }

  /**
   * Save bridge event to persistent storage
   */
  private saveBridgeEvent(event: BridgeEvent): void {
    // In production, save to database/IPFS
    const filename = `bridge_events/${event.bridgeId}.json`;
    try {
      fs.mkdirSync('bridge_events', { recursive: true });
      fs.writeFileSync(filename, JSON.stringify(event, null, 2));
    } catch (error) {
      console.warn('Failed to save bridge event:', error);
    }
  }

  /**
   * Verify bridge proof
   */
  private verifyBridgeProof(proof: BridgeProof): boolean {
    // Simplified verification - in production:
    // 1. Verify merkle proof against known root
    // 2. Check bridge event exists and is valid
    // 3. Verify destination chain and address

    const event = this.bridgeEvents.get(proof.bridgeId);
    if (!event) return false;

    return (
      event.amount === proof.amount &&
      event.from.equals(proof.from) &&
      event.to === proof.to &&
      event.destinationChain === proof.destinationChain
    );
  }

  /**
   * Get all pending bridges
   */
  getPendingBridges(): BridgeEvent[] {
    return Array.from(this.bridgeEvents.values())
      .filter(event => event.status === 'pending');
  }

  /**
   * Load bridge events from storage
   */
  loadBridgeEvents(): void {
    try {
      const files = fs.readdirSync('bridge_events');
      for (const file of files) {
        if (file.endsWith('.json')) {
          const event: BridgeEvent = JSON.parse(
            fs.readFileSync(`bridge_events/${file}`, 'utf8')
          );
          // Convert back to PublicKey
          event.from = new PublicKey(event.from);
          this.bridgeEvents.set(event.bridgeId, event);
        }
      }
    } catch (error) {
      console.warn('Failed to load bridge events:', error);
    }
  }
}

/**
 * Helper function to create EAGLE bridge instance
 */
export function createBonkBridge(
  connection: Connection,
  wallet: Wallet,
  oftProgram: Program<EagleOftLayerzero>
): BonkBridge {
  const bridge = new BonkBridge(connection, wallet, oftProgram);
  bridge.loadBridgeEvents(); // Load existing events
  return bridge;
}

/**
 * Example usage:
 *
 * ```typescript
 * import { createBonkBridge } from './bonk-bridge';
 *
 * // Setup
 * const bridge = createBonkBridge(connection, wallet, oftProgram);
 *
 * // Bridge EAGLE
 * const result = await bridge.bridgeBonk(
 *   1000, // amount
 *   '0x1234...', // destination address
 *   30101 // destination chain (Ethereum)
 * );
 *
 * // Check status
 * const status = bridge.getBridgeStatus(result.bridgeId);
 *
 * // Claim on destination (would be called by relayer)
 * await bridge.claimBonk(result.bridgeId, proof);
 * ```
 */
