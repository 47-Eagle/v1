import { ethers } from "hardhat";
import { EagleShareOFT } from "../typechain-types";

/**
 * Deployment script for EagleShareOFT across multiple chains
 * 
 * Chain Configuration:
 * - Ethereum (Main): Has vault, wrapper, full functionality
 * - Arbitrum/Base/etc: Remote chains, receive bridged EAGLE
 */

// LayerZero Endpoint Addresses (V2)
const LZ_ENDPOINTS = {
  ethereum: "0x1a44076050125825900e736c501f859c50fE728c",
  arbitrum: "0x1a44076050125825900e736c501f859c50fE728c",
  base: "0x1a44076050125825900e736c501f859c50fE728c",
  optimism: "0x1a44076050125825900e736c501f859c50fE728c",
  polygon: "0x1a44076050125825900e736c501f859c50fE728c",
};

// LayerZero Chain IDs (Endpoint IDs - V2)
const LZ_CHAIN_IDS = {
  ethereum: 30101,
  arbitrum: 30110,
  base: 30184,
  optimism: 30111,
  polygon: 30109,
};

interface DeploymentConfig {
  name: string;
  symbol: string;
  lzEndpoint: string;
  delegate: string; // Admin address
  vaultAddress?: string; // Only on main chain
  wrapperAddress?: string; // Only on main chain
  wlfiAddress?: string;
}

async function deployOnChain(config: DeploymentConfig): Promise<string> {
  console.log(`\n📦 Deploying EagleShareOFT on ${config.name}...`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  // Deploy EagleShareOFT
  const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
  const eagle = await EagleShareOFT.deploy(
    config.name,
    config.symbol,
    config.lzEndpoint,
    config.delegate
  );
  
  await eagle.waitForDeployment();
  const address = await eagle.getAddress();
  
  console.log(`✅ EagleShareOFT deployed at: ${address}`);
  
  // Configure vault and wrapper if on main chain
  if (config.vaultAddress) {
    console.log("⚙️  Configuring vault...");
    await eagle.setVault(config.vaultAddress);
  }
  
  if (config.wrapperAddress) {
    console.log("⚙️  Configuring wrapper...");
    await eagle.setVaultWrapper(config.wrapperAddress);
  }
  
  if (config.wlfiAddress) {
    console.log("⚙️  Configuring WLFI token...");
    await eagle.setWLFIToken(config.wlfiAddress);
  }
  
  return address;
}

async function setPeers(
  chainName: string,
  eagleAddress: string,
  peers: Record<string, string>
) {
  console.log(`\n🔗 Setting up peers for ${chainName}...`);
  
  const eagle = await ethers.getContractAt("EagleShareOFT", eagleAddress);
  
  for (const [peerChain, peerAddress] of Object.entries(peers)) {
    if (peerChain === chainName) continue;
    
    const eid = LZ_CHAIN_IDS[peerChain as keyof typeof LZ_CHAIN_IDS];
    console.log(`  Setting peer ${peerChain} (${eid}): ${peerAddress}`);
    
    // Convert address to bytes32
    const peerBytes32 = ethers.zeroPadValue(peerAddress, 32);
    await eagle.setPeer(eid, peerBytes32);
  }
  
  console.log("✅ Peers configured");
}

async function configureSecurity(
  eagleAddress: string,
  config: {
    withdrawalLimits: Record<number, string>; // chainId => daily limit
    trustedChains: number[];
  }
) {
  console.log("\n🔒 Configuring security parameters...");
  
  const eagle = await ethers.getContractAt("EagleShareOFT", eagleAddress);
  
  // Set withdrawal limits
  for (const [chainId, limit] of Object.entries(config.withdrawalLimits)) {
    console.log(`  Setting withdrawal limit for chain ${chainId}: ${limit}`);
    await eagle.setWithdrawalLimit(
      parseInt(chainId),
      ethers.parseEther(limit)
    );
  }
  
  // Set trusted chains
  for (const chainId of config.trustedChains) {
    console.log(`  Trusting chain ${chainId}`);
    await eagle.setTrustedChain(chainId, true);
  }
  
  console.log("✅ Security configured");
}

/**
 * Main deployment flow
 */
async function main() {
  console.log("🦅 EAGLE Share OFT Deployment Script");
  console.log("=====================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`Network: ${network.name} (${chainId})`);
  
  // Example: Deploy on Ethereum (Main Chain)
  if (chainId === 1 || chainId === 11155111) { // Mainnet or Sepolia
    const config: DeploymentConfig = {
      name: "EAGLE Share",
      symbol: "EAGLE",
      lzEndpoint: LZ_ENDPOINTS.ethereum,
      delegate: "YOUR_ADMIN_ADDRESS", // Replace with multisig
      vaultAddress: "YOUR_VAULT_ADDRESS", // EagleOVault address
      wrapperAddress: "YOUR_WRAPPER_ADDRESS", // EagleVaultWrapper address
      wlfiAddress: "YOUR_WLFI_ADDRESS", // WLFI token address
    };
    
    const eagleAddress = await deployOnChain(config);
    
    // Configure security
    await configureSecurity(eagleAddress, {
      withdrawalLimits: {
        [LZ_CHAIN_IDS.arbitrum]: "1000000", // 1M EAGLE daily to Arbitrum
        [LZ_CHAIN_IDS.base]: "500000", // 500K EAGLE daily to Base
        [LZ_CHAIN_IDS.optimism]: "500000",
      },
      trustedChains: [
        LZ_CHAIN_IDS.arbitrum,
        LZ_CHAIN_IDS.base,
        LZ_CHAIN_IDS.optimism,
      ],
    });
    
    console.log("\n✅ Ethereum deployment complete!");
    console.log(`\nNext steps:`);
    console.log(`1. Deploy on remote chains (Arbitrum, Base, etc.)`);
    console.log(`2. Run setPeers() to connect all chains`);
    console.log(`3. Verify contracts on Etherscan`);
  }
  
  // Example: Deploy on Arbitrum (Remote Chain)
  else if (chainId === 42161 || chainId === 421614) { // Arbitrum or Arbitrum Sepolia
    const config: DeploymentConfig = {
      name: "EAGLE Share",
      symbol: "EAGLE",
      lzEndpoint: LZ_ENDPOINTS.arbitrum,
      delegate: "YOUR_ADMIN_ADDRESS", // Same admin as main chain
      wlfiAddress: "YOUR_WLFI_ADDRESS", // If WLFI exists on Arbitrum
      // No vault/wrapper on remote chain initially
    };
    
    const eagleAddress = await deployOnChain(config);
    
    console.log("\n✅ Arbitrum deployment complete!");
    console.log(`\nEAGLE Address: ${eagleAddress}`);
  }
}

/**
 * Helper: Setup complete cross-chain configuration
 * Run this after deploying on all chains
 */
async function setupCrossChain(deployments: Record<string, string>) {
  console.log("\n🌐 Setting up cross-chain configuration...");
  
  // Setup peers for each chain
  for (const [chainName, address] of Object.entries(deployments)) {
    await setPeers(chainName, address, deployments);
  }
  
  console.log("\n✅ Cross-chain setup complete!");
  console.log("\nDeployment Summary:");
  for (const [chain, addr] of Object.entries(deployments)) {
    console.log(`  ${chain}: ${addr}`);
  }
}

// Example usage after all deployments:
// await setupCrossChain({
//   ethereum: "0x...",
//   arbitrum: "0x...",
//   base: "0x...",
//   optimism: "0x...",
// });

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

