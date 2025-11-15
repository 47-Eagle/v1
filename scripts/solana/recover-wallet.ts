#!/usr/bin/env tsx

import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";

async function recoverWallet() {
  console.log("🔑 Recover Solana Wallet from Seed Phrase\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  try {
    const seedPhrase = await question(
      "Enter your 12-word seed phrase (or press Ctrl+C to cancel):\n"
    );

    console.log("\n🔄 Validating seed phrase...");

    if (!bip39.validateMnemonic(seedPhrase.trim())) {
      console.error("❌ Invalid seed phrase. Please check and try again.");
      process.exit(1);
    }

    console.log("✅ Seed phrase valid!");

    // Derive keypair from seed phrase
    const seed = await bip39.mnemonicToSeed(seedPhrase.trim());
    const keypair = Keypair.fromSeed(seed.slice(0, 32));

    console.log("\n👛 Wallet Address:", keypair.publicKey.toBase58());

    // Save to ~/.config/solana/id.json
    const configDir = path.join(os.homedir(), ".config", "solana");
    const keypairPath = path.join(configDir, "id.json");

    // Create directory if it doesn't exist
    fs.mkdirSync(configDir, { recursive: true });

    // Write keypair
    fs.writeFileSync(
      keypairPath,
      JSON.stringify(Array.from(keypair.secretKey))
    );

    console.log("💾 Wallet saved to:", keypairPath);
    console.log("\n✅ Wallet recovery complete!");
    console.log("\nNext steps:");
    console.log("  npm run initialize:simple");

    rl.close();
  } catch (err: any) {
    if (err.message === "canceled") {
      console.log("\n❌ Canceled by user");
    } else {
      console.error("\n❌ Error:", err.message);
    }
    rl.close();
    process.exit(1);
  }
}

recoverWallet();

