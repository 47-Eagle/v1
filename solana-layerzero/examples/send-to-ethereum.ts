/**
 * Example: Send EAGLE tokens from Solana to Ethereum via LayerZero
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { LayerZeroClient } from "../src/layerzero-client";
import { LAYERZERO_EIDS } from "../src/layerzero-config";
import * as fs from "fs";

async function main() {
  console.log("🚀 Sending EAGLE from Solana to Ethereum via LayerZero\n");

  // Configuration
  const CLUSTER = process.env.CLUSTER || "devnet";
  const RPC_URL = CLUSTER === "mainnet-beta" 
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";

  // Load wallet
  const walletPath = process.env.SOLANA_WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
  const wallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("📍 Configuration:");
  console.log("   Cluster:", CLUSTER);
  console.log("   RPC:", RPC_URL);
  console.log("   Wallet:", wallet.publicKey.toBase58());

  // Setup connection and client
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Load program ID from deployment
  const deployment = JSON.parse(
    fs.readFileSync("./deployment-devnet.json", "utf-8")
  );
  const programId = new PublicKey(deployment.programId);
  const mintAddress = new PublicKey(deployment.mint);

  console.log("   Program:", programId.toBase58());
  console.log("   Mint:", mintAddress.toBase58());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("   SOL Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.01 * 1e9) {
    console.error("❌ Insufficient SOL balance. Need at least 0.01 SOL for gas.");
    process.exit(1);
  }

  // Initialize LayerZero client
  const lzClient = new LayerZeroClient(
    connection,
    wallet,
    programId,
    CLUSTER as "mainnet-beta" | "devnet"
  );

  // Get user's token account
  const userTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    wallet.publicKey
  );

  console.log("📊 Bridge Details:");
  
  // Amount to send (e.g., 10 EAGLE with 9 decimals)
  const amountToSend = 10_000_000_000n; // 10 EAGLE
  console.log("   Amount:", Number(amountToSend) / 1e9, "EAGLE");

  // Ethereum recipient address
  const ethereumRecipient = process.env.ETHEREUM_RECIPIENT || "0x0000000000000000000000000000000000000000";
  console.log("   To (Ethereum):", ethereumRecipient);

  // Destination EID (Ethereum)
  const dstEid = CLUSTER === "mainnet-beta" 
    ? LAYERZERO_EIDS.ETHEREUM_MAINNET 
    : LAYERZERO_EIDS.ETHEREUM_SEPOLIA;
  console.log("   Destination EID:", dstEid);

  // Quote fee
  console.log("\n💰 Quoting LayerZero fee...");
  
  const fee = await lzClient.quoteSend({
    dstEid,
    toAddress: ethereumRecipient,
    amountLD: amountToSend,
    minAmountLD: amountToSend * 95n / 100n, // 5% slippage
  });

  console.log("   Native Fee:", fee.nativeFee / 1e9, "SOL");
  console.log("   LZ Token Fee:", fee.lzTokenFee);
  console.log("   Total:", fee.nativeFee / 1e9, "SOL");

  // Confirm
  console.log("\n⚠️  About to send cross-chain transaction!");
  console.log("   This will burn", Number(amountToSend) / 1e9, "EAGLE on Solana");
  console.log("   And mint", Number(amountToSend) / 1e9, "EAGLE on Ethereum");
  console.log("   Fee:", fee.nativeFee / 1e9, "SOL");

  // In production, add confirmation prompt here
  if (process.env.SKIP_CONFIRM !== "true") {
    console.log("\n⏸️  Skipping send (set SKIP_CONFIRM=true to execute)");
    return;
  }

  // Send!
  console.log("\n🚀 Sending...");
  
  try {
    const receipt = await lzClient.send(
      {
        dstEid,
        toAddress: ethereumRecipient,
        amountLD: amountToSend,
        minAmountLD: amountToSend * 95n / 100n,
      },
      userTokenAccount
    );

    console.log("\n✅ Transaction successful!");
    console.log("   Signature:", receipt.signature);
    console.log("   GUID:", Buffer.from(receipt.guid).toString("hex"));
    console.log("   Nonce:", receipt.nonce);

    console.log("\n🔗 Explorer:");
    if (CLUSTER === "devnet") {
      console.log("   https://explorer.solana.com/tx/" + receipt.signature + "?cluster=devnet");
    } else {
      console.log("   https://explorer.solana.com/tx/" + receipt.signature);
    }

    console.log("\n⏳ Message is being verified by DVNs...");
    console.log("   This typically takes 1-5 minutes");
    console.log("   Once verified, the executor will deliver to Ethereum");
    console.log("   Track on LayerZero Scan: https://layerzeroscan.com");

  } catch (error: any) {
    console.error("\n❌ Transaction failed:", error.message);
    if (error.logs) {
      console.error("\nProgram logs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

