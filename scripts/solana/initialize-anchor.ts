#!/usr/bin/env tsx

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const PROGRAM_ID = new PublicKey("7wSrZXHF6BguZ1qwkXdZcNf3qyV2MPNvcztQLwrh9qPJ");
const DEVNET_RPC = "https://api.devnet.solana.com";
const LZ_ENDPOINT = new PublicKey("76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6");

// Minimal IDL that matches the deployed program
const IDL = {
  version: "0.1.0",
  name: "eagle_registry_solana",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "registryConfig", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "lzEndpoint", type: "publicKey" },
      ],
    },
  ],
  accounts: [
    {
      name: "RegistryConfig",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "lzEndpoint", type: "publicKey" },
          { name: "chainCount", type: "u32" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  metadata: {
    address: "7wSrZXHF6BguZ1qwkXdZcNf3qyV2MPNvcztQLwrh9qPJ",
  },
};

async function initialize() {
  console.log("🚀 Eagle Registry Solana - Anchor Initialization\n");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    console.error("❌ Wallet not found at:", walletPath);
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("👛 Wallet:", walletKeypair.publicKey.toBase58());

  // Create connection and provider
  const connection = new Connection(DEVNET_RPC, "confirmed");
  
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL");

  if (balance === 0) {
    console.log("\n⚠️  No SOL! Run: npm run airdrop");
    process.exit(1);
  }

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Create program instance
  const program = new Program(IDL as any, PROGRAM_ID, provider);

  // Derive registry PDA
  const [registryPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

  console.log("\n📍 Accounts:");
  console.log("   Program ID:", PROGRAM_ID.toBase58());
  console.log("   Registry PDA:", registryPda.toBase58());
  console.log("   Bump:", bump);
  console.log("   LZ Endpoint:", LZ_ENDPOINT.toBase58());

  // Check if already initialized
  try {
    const accountInfo = await connection.getAccountInfo(registryPda);
    if (accountInfo && accountInfo.data.length > 0) {
      console.log("\n✅ Registry already initialized!");
      console.log("   Account size:", accountInfo.data.length, "bytes");
      return;
    }
  } catch (err) {
    console.log("\n⚠️  Registry not yet initialized");
  }

  console.log("\n📤 Sending initialize transaction...");

  try {
    const tx = await program.methods
      .initialize(LZ_ENDPOINT)
      .accounts({
        registryConfig: registryPda,
        authority: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("🔍 Signature:", tx);
    console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    console.log("\n⏳ Waiting for confirmation...");
    await connection.confirmTransaction(tx, "confirmed");

    console.log("\n✅ Registry initialized successfully!");
    console.log("   Registry PDA:", registryPda.toBase58());
    console.log("   Authority:", walletKeypair.publicKey.toBase58());
    console.log("   LZ Endpoint:", LZ_ENDPOINT.toBase58());

    // Verify account
    const accountInfo = await connection.getAccountInfo(registryPda);
    if (accountInfo) {
      console.log("\n🔍 Verification:");
      console.log("   Account exists: ✅");
      console.log("   Size:", accountInfo.data.length, "bytes");
      console.log("   Owner:", accountInfo.owner.toBase58());
    }
  } catch (err: any) {
    console.error("\n❌ Error:", err.message);
    if (err.logs) {
      console.log("\n📋 Program Logs:");
      err.logs.forEach((log: string) => console.log("  ", log));
    }
    process.exit(1);
  }
}

initialize().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
