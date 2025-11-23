/**
 * LayerZero Client for EAGLE OFT
 * Wrapper around @layerzerolabs/lz-solana-sdk-v2
 */

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { EagleOftLayerzero } from "../target/types/eagle_oft_layerzero";
import {
  LAYERZERO_EIDS,
  getEndpointForCluster,
  getSolanaEid,
  OftMessage,
  FeeEstimator,
  DecimalConverter,
  ethereumAddressToBytes32,
} from "./layerzero-config";

export interface SendParams {
  dstEid: number;
  toAddress: string; // Ethereum address (0x...) or Solana address
  amountLD: bigint; // Amount in local decimals (9 for Solana)
  minAmountLD: bigint; // Minimum amount with slippage
  extraOptions?: Uint8Array;
}

export interface SendReceipt {
  signature: string;
  guid: Uint8Array;
  nonce: number;
  fee: { nativeFee: number; lzTokenFee: number };
}

export class LayerZeroClient {
  private connection: Connection;
  private wallet: Wallet;
  private provider: AnchorProvider;
  private program: Program<EagleOftLayerzero>;
  private cluster: "mainnet-beta" | "devnet";
  
  // PDAs
  private oftConfigPda: PublicKey;
  private oftConfigBump: number;

  constructor(
    connection: Connection,
    wallet: Keypair,
    programId: PublicKey,
    cluster: "mainnet-beta" | "devnet" = "devnet"
  ) {
    this.connection = connection;
    this.wallet = new Wallet(wallet);
    this.cluster = cluster;
    
    this.provider = new AnchorProvider(connection, this.wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(this.provider);

    this.program = new Program<EagleOftLayerzero>(
      require("../target/idl/eagle_oft_layerzero.json"),
      programId,
      this.provider
    );

    // Derive PDAs
    [this.oftConfigPda, this.oftConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("oft_config")],
      this.program.programId
    );
  }

  /**
   * Initialize the OFT
   */
  async initialize(admin: PublicKey): Promise<string> {
    const endpoint = getEndpointForCluster(this.cluster);
    const mintKeypair = Keypair.generate();

    const tx = await this.program.methods
      .initialize(endpoint, admin)
      .accounts({
        oftConfig: this.oftConfigPda,
        mint: mintKeypair.publicKey,
        payer: this.wallet.publicKey,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("✅ OFT initialized");
    console.log("   Transaction:", tx);
    console.log("   Mint:", mintKeypair.publicKey.toBase58());

    return tx;
  }

  /**
   * Set peer OFT on another chain
   */
  async setPeer(dstEid: number, peerAddress: string): Promise<string> {
    const peerBytes32 = ethereumAddressToBytes32(peerAddress);
    const peerBytes32Array = Array.from(peerBytes32);

    const [peerConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("peer"), Buffer.from(new Uint32Array([dstEid]).buffer)],
      this.program.programId
    );

    const tx = await this.program.methods
      .setPeer(dstEid, peerBytes32Array)
      .accounts({
        oftConfig: this.oftConfigPda,
        peerConfig: peerConfigPda,
        admin: this.wallet.publicKey,
      })
      .rpc();

    console.log("✅ Peer set for EID", dstEid);
    console.log("   Transaction:", tx);
    console.log("   Peer address:", peerAddress);

    return tx;
  }

  /**
   * Send tokens to another chain
   */
  async send(params: SendParams, fromTokenAccount: PublicKey): Promise<SendReceipt> {
    // Get config and mint
    const config = await this.program.account.oftConfig.fetch(this.oftConfigPda);
    
    // Get peer config PDA
    const [peerConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("peer"), Buffer.from(new Uint32Array([params.dstEid]).buffer)],
      this.program.programId
    );

    // Convert address to bytes32
    const toBytes32 = ethereumAddressToBytes32(params.toAddress);
    const toBytes32Array = Array.from(toBytes32);

    // Prepare send param
    const sendParam = {
      dstEid: params.dstEid,
      to: toBytes32Array,
      amountLd: new anchor.BN(params.amountLD.toString()),
      minAmountLd: new anchor.BN(params.minAmountLD.toString()),
      extraOptions: params.extraOptions || [],
      composeMsg: [],
      oftCmd: [],
    };

    // Send transaction
    const tx = await this.program.methods
      .send(sendParam)
      .accounts({
        oftConfig: this.oftConfigPda,
        peerConfig: peerConfigPda,
        mint: config.mint,
        from: fromTokenAccount,
        sender: this.wallet.publicKey,
        endpointProgram: config.endpointProgram,
      })
      .rpc();

    // Get updated config for nonce
    const updatedConfig = await this.program.account.oftConfig.fetch(this.oftConfigPda);

    console.log("🚀 Sent cross-chain message");
    console.log("   Transaction:", tx);
    console.log("   Amount:", params.amountLD.toString());
    console.log("   Destination EID:", params.dstEid);
    console.log("   To:", params.toAddress);

    return {
      signature: tx,
      guid: new Uint8Array(32), // Would come from event
      nonce: Number(updatedConfig.totalBridgedOut),
      fee: await FeeEstimator.estimate(
        getSolanaEid(this.cluster),
        params.dstEid,
        41 // OFT message size
      ),
    };
  }

  /**
   * Quote send fee
   */
  async quoteSend(params: SendParams): Promise<{ nativeFee: number; lzTokenFee: number }> {
    const toBytes32Array = Array.from(ethereumAddressToBytes32(params.toAddress));

    const sendParam = {
      dstEid: params.dstEid,
      to: toBytes32Array,
      amountLd: new anchor.BN(params.amountLD.toString()),
      minAmountLd: new anchor.BN(params.minAmountLD.toString()),
      extraOptions: params.extraOptions || [],
      composeMsg: [],
      oftCmd: [],
    };

    const config = await this.program.account.oftConfig.fetch(this.oftConfigPda);

    const result = await this.program.methods
      .quoteSend(sendParam, false)
      .accounts({
        oftConfig: this.oftConfigPda,
        endpointProgram: config.endpointProgram,
      })
      .view();

    return {
      nativeFee: Number(result.nativeFee),
      lzTokenFee: Number(result.lzTokenFee),
    };
  }

  /**
   * Get OFT configuration
   */
  async getConfig() {
    return await this.program.account.oftConfig.fetch(this.oftConfigPda);
  }

  /**
   * Get peer configuration
   */
  async getPeer(dstEid: number) {
    const [peerConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("peer"), Buffer.from(new Uint32Array([dstEid]).buffer)],
      this.program.programId
    );

    return await this.program.account.peerConfig.fetch(peerConfigPda);
  }

  /**
   * Set paused state (admin only)
   */
  async setPaused(paused: boolean): Promise<string> {
    const tx = await this.program.methods
      .setPaused(paused)
      .accounts({
        oftConfig: this.oftConfigPda,
        admin: this.wallet.publicKey,
      })
      .rpc();

    console.log(`🔒 OFT ${paused ? "paused" : "unpaused"}`);
    console.log("   Transaction:", tx);

    return tx;
  }

  /**
   * Get bridge statistics
   */
  async getStats() {
    const config = await this.getConfig();
    
    return {
      totalBridgedIn: config.totalBridgedIn.toString(),
      totalBridgedOut: config.totalBridgedOut.toString(),
      paused: config.paused,
      mint: config.mint.toBase58(),
      admin: config.admin.toBase58(),
    };
  }

  /**
   * Helper: Convert amount from ETH decimals to SOL decimals
   */
  static convertEthToSol(amountEth: bigint): bigint {
    return DecimalConverter.ethToSol(amountEth);
  }

  /**
   * Helper: Convert amount from SOL decimals to ETH decimals
   */
  static convertSolToEth(amountSol: bigint): bigint {
    return DecimalConverter.solToEth(amountSol);
  }
}

export { DecimalConverter, ethereumAddressToBytes32, OftMessage };

