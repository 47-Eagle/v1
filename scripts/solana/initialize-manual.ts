#!/usr/bin/env tsx

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const PROGRAM_ID = new PublicKey("7wSrZXHF6BguZ1qwkXdZcNf3qyV2MPNvcztQLwrh9qPJ");
const DEVNET_RPC = "https://api.devnet.solana.com";
const LZ_ENDPOINT = new PublicKey("76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6");

// Calculate Anchor discriminator for "global:initialize"
function getInstructionDiscriminator(name: string): Buffer {
  const preimage = `global:${name}`;
  const hash = sha256(Buffer.from(preimage));
  return Buffer.from(hash.slice(0, 8));
}

async function initialize() {
  console.log("🚀 Eagle Registry Solana - Manual Initialization\n");

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

  // Create connection
  const connection = new Connection(DEVNET_RPC, "confirmed");
  
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL");

  if (balance === 0) {
    console.log("\n⚠️  No SOL! Run: npm run airdrop");
    process.exit(1);
  }

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
      console.log("   Owner:", accountInfo.owner.toBase58());
      return;
    }
  } catch (err) {
    console.log("\n⚠️  Registry not yet initialized");
  }

  console.log("\n🔧 Building initialize instruction...");

  // Build instruction data
  const discriminator = getInstructionDiscriminator("initialize");
  const lzEndpointBuffer = LZ_ENDPOINT.toBuffer();
  const data = Buffer.concat([discriminator, lzEndpointBuffer]);

  console.log("📦 Instruction discriminator:", discriminator.toString("hex"));
  console.log("📦 Full instruction data:", data.toString("hex"));

  // Create instruction
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: registryPda, isSigner: false, isWritable: true },
      { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  console.log("\n📤 Sending transaction...");

  try {
    const tx = new Transaction().add(instruction);
    tx.feePayer = walletKeypair.publicKey;
    
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signature = await connection.sendTransaction(tx, [walletKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log("🔍 Signature:", signature);
    console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    console.log("\n⏳ Waiting for confirmation...");
    const confirmation = await connection.confirmTransaction(signature, "confirmed");

    if (confirmation.value.err) {
      console.error("\n❌ Transaction failed:", confirmation.value.err);
      process.exit(1);
    }

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

