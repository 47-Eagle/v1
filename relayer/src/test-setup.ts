#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import fs from "fs";
import { loadConfig, validateConfig } from "./config";

console.log("============================================");
console.log("  EAGLE Bridge - Test Setup");
console.log("============================================");
console.log("");

async function testSetup() {
  try {
    // Load and validate configuration
    console.log("Loading configuration...");
    const config = loadConfig();
    validateConfig(config);
    console.log("");

    // Test Ethereum connection
    console.log("============================================");
    console.log("  Testing Ethereum Connection");
    console.log("============================================");
    console.log("");

    const ethProvider = new ethers.JsonRpcProvider(config.ethereumRpc);
    
    try {
      const network = await ethProvider.getNetwork();
      const blockNumber = await ethProvider.getBlockNumber();
      
      console.log("✅ Connected to Ethereum");
      console.log(`  Network: ${network.name} (Chain ID: ${network.chainId})`);
      console.log(`  Block: ${blockNumber}`);
      console.log(`  RPC: ${config.ethereumRpc}`);
      
      // Test contract exists
      const code = await ethProvider.getCode(config.eagleShareOftAddress);
      if (code === "0x") {
        console.log("⚠️  Warning: No contract found at EagleShareOFT address");
      } else {
        console.log(`  Contract: ${config.eagleShareOftAddress} ✅`);
      }
    } catch (error: any) {
      console.error("❌ Ethereum connection failed:", error.message);
      throw error;
    }
    console.log("");

    // Test Solana connection
    console.log("============================================");
    console.log("  Testing Solana Connection");
    console.log("============================================");
    console.log("");

    const solanaConnection = new Connection(config.solanaRpcUrl, "confirmed");
    
    try {
      const version = await solanaConnection.getVersion();
      const slot = await solanaConnection.getSlot();
      
      console.log("✅ Connected to Solana");
      console.log(`  Cluster: ${config.solanaCluster}`);
      console.log(`  Version: ${version["solana-core"]}`);
      console.log(`  Slot: ${slot}`);
      console.log(`  RPC: ${config.solanaRpcUrl}`);
      
      // Test program exists
      try {
        const programInfo = await solanaConnection.getAccountInfo(config.solanaProgramId);
        if (!programInfo) {
          console.log("⚠️  Warning: Program not found on-chain");
          console.log(`  Program ID: ${config.solanaProgramId.toBase58()}`);
        } else {
          console.log(`  Program: ${config.solanaProgramId.toBase58()} ✅`);
          console.log(`  Executable: ${programInfo.executable}`);
        }
      } catch (error) {
        console.log("⚠️  Could not verify program");
      }
    } catch (error: any) {
      console.error("❌ Solana connection failed:", error.message);
      throw error;
    }
    console.log("");

    // Test wallet
    console.log("============================================");
    console.log("  Testing Wallet");
    console.log("============================================");
    console.log("");

    if (!fs.existsSync(config.solanaWalletPath)) {
      console.error("❌ Solana wallet not found at:", config.solanaWalletPath);
      console.log("");
      console.log("Create a wallet with:");
      console.log(`  solana-keygen new -o ${config.solanaWalletPath}`);
      console.log("");
      throw new Error("Wallet not found");
    }

    const walletKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(config.solanaWalletPath, "utf-8")))
    );

    console.log("✅ Wallet loaded");
    console.log(`  Address: ${walletKeypair.publicKey.toBase58()}`);

    // Check balance
    const balance = await solanaConnection.getBalance(walletKeypair.publicKey);
    const balanceSol = balance / 1e9;
    
    console.log(`  Balance: ${balanceSol.toFixed(4)} SOL`);
    
    if (balanceSol < config.alertLowBalanceSol) {
      console.log(`⚠️  Low balance! Recommended minimum: ${config.alertLowBalanceSol} SOL`);
      
      if (config.solanaCluster === "devnet") {
        console.log("");
        console.log("Get devnet SOL with:");
        console.log(`  solana airdrop 2 ${walletKeypair.publicKey.toBase58()} --url devnet`);
      }
    }
    console.log("");

    // Test mint (if configured)
    if (config.solanaMint) {
      console.log("============================================");
      console.log("  Testing Mint");
      console.log("============================================");
      console.log("");

      try {
        const mintInfo = await solanaConnection.getAccountInfo(config.solanaMint);
        if (!mintInfo) {
          console.log("⚠️  Mint account not found on-chain");
          console.log(`  Mint: ${config.solanaMint.toBase58()}`);
        } else {
          console.log("✅ Mint found");
          console.log(`  Address: ${config.solanaMint.toBase58()}`);
        }
      } catch (error) {
        console.log("⚠️  Could not verify mint");
      }
      console.log("");
    }

    // Test user mappings file
    console.log("============================================");
    console.log("  Testing User Mappings");
    console.log("============================================");
    console.log("");

    if (fs.existsSync(config.userMappingsFile)) {
      const mappings = JSON.parse(fs.readFileSync(config.userMappingsFile, "utf-8"));
      console.log("✅ User mappings file found");
      console.log(`  File: ${config.userMappingsFile}`);
      console.log(`  Mappings: ${Object.keys(mappings).length}`);
    } else {
      console.log("⚠️  User mappings file not found");
      console.log(`  Creating empty file: ${config.userMappingsFile}`);
      fs.writeFileSync(config.userMappingsFile, "{}");
      console.log("✅ Created empty mappings file");
    }
    console.log("");

    // Summary
    console.log("============================================");
    console.log("  SETUP COMPLETE");
    console.log("============================================");
    console.log("");
    console.log("✅ All connections tested successfully!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Link user wallets:");
    console.log("   npm run link link <ETH_ADDRESS> <SOLANA_ADDRESS>");
    console.log("");
    console.log("2. Start the relayer:");
    console.log("   npm start");
    console.log("");
    console.log("3. Monitor logs:");
    console.log("   tail -f logs/relayer.log");
    console.log("");

  } catch (error: any) {
    console.error("");
    console.error("❌ Setup test failed:", error.message);
    console.error("");
    console.error("Please fix the errors above and try again.");
    process.exit(1);
  }
}

testSetup()
  .then(() => {
    console.log("Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

