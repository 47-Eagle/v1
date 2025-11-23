#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import fs from "fs";
import * as dotenv from "dotenv";
import { EagleOftClient } from "./program-client";

dotenv.config();

// Configuration
const ETHEREUM_RPC = process.env.ETHEREUM_RPC || process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY";
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const EAGLE_SHARE_OFT = process.env.EAGLE_SHARE_OFT_ADDRESS || "0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E";
const SOLANA_PROGRAM_ID = new PublicKey(process.env.SOLANA_PROGRAM_ID || "3973MRkbN9E3GW4TnE9A8VzAgNxWAVRSAFVW4QQktAkb");
const SOLANA_MINT = new PublicKey(process.env.SOLANA_MINT || "5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j");

// Load user mapping database
interface UserMapping {
  [ethAddress: string]: string; // eth -> solana pubkey
}

let userMappings: UserMapping = {};

function loadUserMappings() {
  try {
    if (fs.existsSync("./user-mappings.json")) {
      userMappings = JSON.parse(fs.readFileSync("./user-mappings.json", "utf-8"));
      console.log(`📁 Loaded ${Object.keys(userMappings).length} user mappings`);
    }
  } catch (error) {
    console.error("Failed to load user mappings:", error);
  }
}

// Ethereum Watcher
class EthereumBurnWatcher {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private lastBlock: number = 0;
  private pollingInterval: number = 12000; // 12 seconds (1 block)

  constructor() {
    this.provider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
    
    // EagleShareOFT ABI - Transfer event (burn is Transfer to 0x0)
    const abi = [
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    ];
    
    this.contract = new ethers.Contract(EAGLE_SHARE_OFT, abi, this.provider);
  }

  async start(onBurn: (user: string, amount: bigint) => Promise<void>) {
    console.log("🔍 Watching Ethereum for EAGLE burns...");
    console.log(`   Contract: ${EAGLE_SHARE_OFT}`);
    
    this.lastBlock = await this.provider.getBlockNumber();
    console.log(`   Starting from block: ${this.lastBlock}`);
    console.log(`   Polling every ${this.pollingInterval / 1000}s`);

    // Use polling instead of filters (more compatible with different RPCs)
    const zeroAddress = ethers.ZeroAddress;
    
    const poll = async () => {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > this.lastBlock) {
          // Query burn events (Transfer to 0x0) for new blocks
          const filter = this.contract.filters.Transfer(null, zeroAddress, null);
          const events = await this.contract.queryFilter(filter, this.lastBlock + 1, currentBlock);
          
          for (const event of events) {
            console.log("\n🔥 EAGLE Burn Detected!");
            console.log(`   User: ${event.args.from}`);
            console.log(`   Amount: ${ethers.formatUnits(event.args.value, 18)} EAGLE`);
            console.log(`   Block: ${event.blockNumber}`);
            console.log(`   Tx: ${event.transactionHash}`);
            
            try {
              await onBurn(event.args.from, event.args.value);
            } catch (error) {
              console.error("❌ Failed to mint on Solana:", error);
            }
          }
          
          this.lastBlock = currentBlock;
        }
      } catch (error: any) {
        console.error("⚠️  Polling error:", error.message);
      }
      
      // Schedule next poll
      setTimeout(poll, this.pollingInterval);
    };

    console.log("\n✨ Ethereum watcher is running...\n");
    
    // Start polling
    poll();
  }
}

// Solana Bridge
class SolanaBridge {
  private connection: Connection;
  private relayerKeypair: Keypair;
  private programId: PublicKey;
  private mint: PublicKey;
  private client: EagleOftClient;

  constructor() {
    this.connection = new Connection(SOLANA_RPC, "confirmed");
    this.programId = SOLANA_PROGRAM_ID;
    this.mint = SOLANA_MINT;
    
    // Load relayer keypair
    const walletPath = process.env.SOLANA_WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
    
    // Check if wallet file exists
    if (!fs.existsSync(walletPath)) {
      console.error(`❌ Solana wallet not found at: ${walletPath}`);
      console.error("   Please set SOLANA_WALLET_PATH in .env file");
      console.error("   Or create wallet with: solana-keygen new -o ~/.config/solana/id.json");
      throw new Error(`Wallet file not found: ${walletPath}`);
    }
    
    this.relayerKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
    );
    
    console.log("💼 Relayer Solana Wallet:", this.relayerKeypair.publicKey.toBase58());
    
    // Initialize Anchor program client
    this.client = new EagleOftClient(
      this.connection,
      this.relayerKeypair,
      this.programId,
      this.mint
    );
  }

  async mintToUser(ethereumAddress: string, amount: bigint): Promise<void> {
    console.log("\n🌉 Bridging to Solana...");
    console.log(`   Amount: ${ethers.formatUnits(amount, 18)} EAGLE`);

    // Get user's Solana address
    const solanaAddress = userMappings[ethereumAddress.toLowerCase()];
    if (!solanaAddress) {
      console.log("⚠️  No Solana wallet linked for user:", ethereumAddress);
      console.log("   User needs to link wallets at 47eagle.com");
      return;
    }

    const recipientPubkey = new PublicKey(solanaAddress);
    console.log(`   Solana recipient: ${solanaAddress}`);

    try {
      // Convert amount from 18 decimals (ETH) to 9 decimals (Solana)
      // amount is in wei (18 decimals), we need 9 decimals
      const solanaAmount = amount / 1_000_000_000n; // Divide by 10^9 to go from 18 to 9 decimals

      console.log(`   Minting ${solanaAmount.toString()} EAGLE (9 decimals)...`);

      // Use the deployed program's bridge_in instruction
      // This is the proper way to mint via the Anchor program
      const signature = await this.client.bridgeIn(
        recipientPubkey,
        solanaAmount,
        30101 // Ethereum EID
      );

      console.log("✅ Bridged to Solana!");
      console.log(`   Signature: ${signature}`);
      console.log(`   Explorer: https://solscan.io/tx/${signature}`);
      console.log(`   Method: bridge_in instruction (proper Anchor call)`);
      
    } catch (error: any) {
      console.error("❌ Bridge failed:", error.message);
      
      // If bridge_in fails (e.g., not authorized), provide helpful error
      if (error.message.includes("Unauthorized")) {
        console.error("");
        console.error("⚠️  Relayer not authorized to mint!");
        console.error("   The program authority needs to be set to:");
        console.error(`   ${this.relayerKeypair.publicKey.toBase58()}`);
        console.error("");
        console.error("   Current authority can transfer with:");
        console.error("   (check EXISTING_DEPLOYMENT_ANALYSIS.md for details)");
      }
      
      throw error;
    }
  }

  async checkBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.relayerKeypair.publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }

  async checkProgramStatus(): Promise<void> {
    console.log("📋 Program Status:");
    console.log(`   Program ID: ${this.programId.toBase58()}`);
    console.log(`   Mint: ${this.mint.toBase58()}`);
    console.log(`   Config PDA: ${this.client.configPda.toBase58()}`);
    
    const isInit = await this.client.isInitialized();
    console.log(`   Initialized: ${isInit ? "✅ Yes" : "❌ No"}`);
    
    if (isInit) {
      const config = await this.client.getConfig();
      console.log(`   Authority: ${config.authority.toBase58()}`);
      console.log(`   Decimals: ${config.decimals}`);
      
      const isAuthorized = config.authority.equals(this.relayerKeypair.publicKey);
      console.log(`   Relayer Authorized: ${isAuthorized ? "✅ Yes" : "⚠️  No"}`);
      
      if (!isAuthorized) {
        console.log("");
        console.log("⚠️  WARNING: Relayer is not the program authority!");
        console.log("   Bridge operations will fail until authority is transferred.");
        console.log(`   Current authority: ${config.authority.toBase58()}`);
        console.log(`   Needed authority: ${this.relayerKeypair.publicKey.toBase58()}`);
      }
    }
    console.log("");
  }
}

// Main
async function main() {
  console.log("============================================");
  console.log("  EAGLE Bridge: Ethereum → Solana");
  console.log("============================================");
  console.log("");

  // Load user mappings
  loadUserMappings();

  // Initialize components
  const solanaBridge = new SolanaBridge();
  const ethWatcher = new EthereumBurnWatcher();

  // Check relayer balance
  const balance = await solanaBridge.checkBalance();
  console.log(`💰 Relayer balance: ${balance.toFixed(4)} SOL`);
  
  if (balance < 0.01) {
    console.warn("⚠️  WARNING: Low SOL balance! Add more SOL for transaction fees.");
  }
  console.log("");

  // Check program status
  await solanaBridge.checkProgramStatus();

  // Start watching Ethereum burns
  await ethWatcher.start(async (user, amount) => {
    await solanaBridge.mintToUser(user, amount);
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log("\n👋 Shutting down gracefully...");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

