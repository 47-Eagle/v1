/**
 * LayerZero Configuration for EAGLE OFT
 * Official endpoint IDs and program addresses
 */

import { PublicKey } from "@solana/web3.js";

/**
 * LayerZero Endpoint IDs (EIDs)
 * Source: https://docs.layerzero.network/v2/deployments/chains/solana
 */
export const LAYERZERO_EIDS = {
  // Solana
  SOLANA_MAINNET: 30168,
  SOLANA_DEVNET: 40168,
  
  // Ethereum
  ETHEREUM_MAINNET: 30101,
  ETHEREUM_SEPOLIA: 40161,
  
  // Other popular chains (for future expansion)
  ARBITRUM: 30110,
  OPTIMISM: 30111,
  BASE: 30184,
  POLYGON: 30109,
  BSC: 30102,
  AVALANCHE: 30106,
} as const;

/**
 * LayerZero Endpoint Program IDs on Solana
 * Note: These will be imported from @layerzerolabs/lz-solana-sdk-v2
 * Keeping as constants for reference
 */
export const LAYERZERO_ENDPOINTS = {
  // Mainnet endpoint (to be confirmed from SDK)
  MAINNET: new PublicKey("76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6"),
  
  // Devnet endpoint (to be confirmed from SDK)
  DEVNET: new PublicKey("76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6"),
} as const;

/**
 * Get endpoint for cluster
 */
export function getEndpointForCluster(cluster: "mainnet-beta" | "devnet" | "testnet"): PublicKey {
  switch (cluster) {
    case "mainnet-beta":
      return LAYERZERO_ENDPOINTS.MAINNET;
    case "devnet":
    case "testnet":
      return LAYERZERO_ENDPOINTS.DEVNET;
    default:
      throw new Error(`Unsupported cluster: ${cluster}`);
  }
}

/**
 * Get EID for Solana cluster
 */
export function getSolanaEid(cluster: "mainnet-beta" | "devnet" | "testnet"): number {
  switch (cluster) {
    case "mainnet-beta":
      return LAYERZERO_EIDS.SOLANA_MAINNET;
    case "devnet":
    case "testnet":
      return LAYERZERO_EIDS.SOLANA_DEVNET;
    default:
      throw new Error(`Unsupported cluster: ${cluster}`);
  }
}

/**
 * Get EID for Ethereum network
 */
export function getEthereumEid(network: "mainnet" | "sepolia"): number {
  switch (network) {
    case "mainnet":
      return LAYERZERO_EIDS.ETHEREUM_MAINNET;
    case "sepolia":
      return LAYERZERO_EIDS.ETHEREUM_SEPOLIA;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * DVN Configuration
 * Decentralized Verifier Networks that validate cross-chain messages
 */
export interface DVNConfig {
  name: string;
  address: PublicKey;
  requiredConfirmations: number;
  enabled: boolean;
}

/**
 * Recommended DVN setup for production
 * Best practice: Use at least 2 DVNs with 2-of-2 verification
 */
export const RECOMMENDED_DVNS = {
  MAINNET: [
    {
      name: "LayerZero Labs",
      address: new PublicKey("TBD_FROM_LAYERZERO_DOCS"),
      requiredConfirmations: 15,
      enabled: true,
    },
    {
      name: "ChainLink",
      address: new PublicKey("TBD_FROM_LAYERZERO_DOCS"),
      requiredConfirmations: 15,
      enabled: true,
    },
  ],
  DEVNET: [
    {
      name: "LayerZero Labs (Devnet)",
      address: new PublicKey("TBD_FROM_LAYERZERO_DOCS"),
      requiredConfirmations: 1,
      enabled: true,
    },
  ],
} as const;

/**
 * Executor Configuration
 * Executors deliver messages to destination chains
 */
export interface ExecutorConfig {
  address: PublicKey;
  maxMessageSize: number;
  gasLimit: number;
}

/**
 * Default executor settings
 */
export const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  address: new PublicKey("TBD_FROM_LAYERZERO_DOCS"),
  maxMessageSize: 1024, // bytes
  gasLimit: 200_000, // gas units for Ethereum side
};

/**
 * Message encoding/decoding utilities
 */
export class OftMessage {
  static encode(msgType: number, to: Uint8Array, amount: bigint): Uint8Array {
    const buffer = new Uint8Array(1 + 32 + 8);
    buffer[0] = msgType;
    buffer.set(to, 1);
    const view = new DataView(buffer.buffer);
    view.setBigUint64(33, amount, false); // big-endian
    return buffer;
  }

  static decode(message: Uint8Array): { msgType: number; to: Uint8Array; amount: bigint } {
    if (message.length < 41) {
      throw new Error("Invalid message length");
    }
    
    const msgType = message[0];
    const to = message.slice(1, 33);
    const view = new DataView(message.buffer, message.byteOffset);
    const amount = view.getBigUint64(33, false); // big-endian
    
    return { msgType, to, amount };
  }
}

/**
 * Fee estimation utilities
 */
export class FeeEstimator {
  /**
   * Estimate LayerZero messaging fee
   * @param srcEid Source endpoint ID
   * @param dstEid Destination endpoint ID
   * @param messageSize Size of message in bytes
   * @returns Estimated fee in lamports
   */
  static async estimate(
    srcEid: number,
    dstEid: number,
    messageSize: number
  ): Promise<{ nativeFee: number; lzTokenFee: number }> {
    // Rough estimates based on LayerZero docs
    // In production, call LayerZero endpoint's quote function
    
    const baseFee = 2_000_000; // 0.002 SOL base fee
    const perByteFee = 1000; // Fee per byte
    const dvnFee = 1_000_000; // DVN verification fee
    
    const nativeFee = baseFee + (messageSize * perByteFee) + dvnFee;
    const lzTokenFee = 0; // Not using LZ token for payment
    
    return { nativeFee, lzTokenFee };
  }
}

/**
 * Decimal conversion utilities
 * Ethereum: 18 decimals
 * Solana: 9 decimals
 */
export class DecimalConverter {
  static readonly ETH_DECIMALS = 18;
  static readonly SOL_DECIMALS = 9;
  static readonly CONVERSION_FACTOR = 10n ** 9n;

  /**
   * Convert from Ethereum (18 decimals) to Solana (9 decimals)
   */
  static ethToSol(amount: bigint): bigint {
    return amount / this.CONVERSION_FACTOR;
  }

  /**
   * Convert from Solana (9 decimals) to Ethereum (18 decimals)
   */
  static solToEth(amount: bigint): bigint {
    return amount * this.CONVERSION_FACTOR;
  }

  /**
   * Validate converted amount
   */
  static validateConversion(
    originalAmount: bigint,
    convertedAmount: bigint,
    direction: "eth-to-sol" | "sol-to-eth"
  ): boolean {
    if (direction === "eth-to-sol") {
      const reconverted = this.solToEth(convertedAmount);
      // Allow for rounding down (loss of precision in last 9 digits)
      return reconverted <= originalAmount && originalAmount - reconverted < this.CONVERSION_FACTOR;
    } else {
      const reconverted = this.ethToSol(convertedAmount);
      return reconverted === originalAmount;
    }
  }
}

/**
 * Helper to convert Ethereum address to bytes32 for Solana
 */
export function ethereumAddressToBytes32(address: string): Uint8Array {
  // Remove 0x prefix
  const hex = address.replace("0x", "");
  
  // Pad to 64 characters (32 bytes)
  const padded = hex.padStart(64, "0");
  
  // Convert to bytes
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.substr(i * 2, 2), 16);
  }
  
  return bytes;
}

/**
 * Helper to convert Solana address to bytes32 for Ethereum
 */
export function solanaAddressToBytes32(address: PublicKey): Uint8Array {
  return address.toBytes();
}

/**
 * Configuration summary
 */
export function getConfigSummary(cluster: "mainnet-beta" | "devnet") {
  return {
    cluster,
    solanaEid: getSolanaEid(cluster),
    endpoint: getEndpointForCluster(cluster),
    dvns: cluster === "mainnet-beta" ? RECOMMENDED_DVNS.MAINNET : RECOMMENDED_DVNS.DEVNET,
    executor: DEFAULT_EXECUTOR_CONFIG,
  };
}

