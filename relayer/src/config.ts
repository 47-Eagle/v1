import * as dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";

dotenv.config();

export interface RelayerConfig {
  // Ethereum
  ethereumRpc: string;
  ethereumPrivateKey: string;
  ethereumEid: number;
  eagleShareOftAddress: string;

  // Solana
  solanaCluster: "mainnet" | "devnet" | "localnet";
  solanaRpcUrl: string;
  solanaProgramId: PublicKey;
  solanaMint: PublicKey | null;
  solanaWalletPath: string;
  solanaEid: number;

  // Rate limiting
  maxMintPerTx: bigint;
  maxOperationsPerDay: number;
  cooldownSeconds: number;

  // Monitoring
  discordWebhookUrl?: string;
  alertLowBalanceSol: number;
  alertLowBalanceEth: number;

  // Logging
  logLevel: string;
  logFile: string;

  // Database
  userMappingsFile: string;
}

export function loadConfig(): RelayerConfig {
  const config: RelayerConfig = {
    // Ethereum
    ethereumRpc: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || "",
    ethereumEid: parseInt(process.env.ETHEREUM_EID || "30101"),
    eagleShareOftAddress:
      process.env.EAGLE_SHARE_OFT_ADDRESS || "0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E",

    // Solana
    solanaCluster: (process.env.SOLANA_CLUSTER || "devnet") as any,
    solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    solanaProgramId: new PublicKey(
      process.env.SOLANA_PROGRAM_ID || "11111111111111111111111111111112"
    ),
    solanaMint: process.env.SOLANA_MINT ? new PublicKey(process.env.SOLANA_MINT) : null,
    solanaWalletPath: process.env.SOLANA_WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`,
    solanaEid: parseInt(process.env.SOLANA_EID || "30168"),

    // Rate limiting
    maxMintPerTx: BigInt(process.env.MAX_MINT_PER_TX || "1000000000000000000000000"),
    maxOperationsPerDay: parseInt(process.env.MAX_OPERATIONS_PER_DAY || "1000"),
    cooldownSeconds: parseInt(process.env.COOLDOWN_SECONDS || "60"),

    // Monitoring
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    alertLowBalanceSol: parseFloat(process.env.ALERT_LOW_BALANCE_SOL || "0.1"),
    alertLowBalanceEth: parseFloat(process.env.ALERT_LOW_BALANCE_ETH || "0.01"),

    // Logging
    logLevel: process.env.LOG_LEVEL || "info",
    logFile: process.env.LOG_FILE || "./logs/relayer.log",

    // Database
    userMappingsFile: process.env.USER_MAPPINGS_FILE || "./user-mappings.json",
  };

  // Validate required fields
  if (!config.ethereumPrivateKey) {
    throw new Error("ETHEREUM_PRIVATE_KEY is required in .env file");
  }

  if (!config.solanaMint) {
    console.warn("⚠️  SOLANA_MINT not set. Relayer will not be able to mint tokens.");
  }

  return config;
}

export function validateConfig(config: RelayerConfig): void {
  // Check Ethereum configuration
  if (!config.ethereumRpc.startsWith("http")) {
    throw new Error("Invalid ETHEREUM_RPC_URL");
  }

  if (!config.eagleShareOftAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error("Invalid EAGLE_SHARE_OFT_ADDRESS");
  }

  // Check Solana configuration
  if (!["mainnet", "devnet", "localnet"].includes(config.solanaCluster)) {
    throw new Error("Invalid SOLANA_CLUSTER. Must be mainnet, devnet, or localnet");
  }

  // Check rate limiting
  if (config.maxOperationsPerDay < 1) {
    throw new Error("MAX_OPERATIONS_PER_DAY must be at least 1");
  }

  if (config.cooldownSeconds < 0) {
    throw new Error("COOLDOWN_SECONDS must be non-negative");
  }

  console.log("✅ Configuration validated");
}

