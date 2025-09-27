import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0', // Eagle Vault V2
    wlfiToken: process.env.WLFI_ETHEREUM!,
    usd1Token: process.env.USD1_ETHEREUM!
};

// Charm Finance mainnet addresses (need to verify these)
const CHARM_ADDRESSES = {
    // AlphaProVault Factory - need to find the real address
    factory: "0x0000000000000000000000000000000000000000", // PLACEHOLDER - need real address
};

const POOL_CONFIG = {
    address: "0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d",
    fee: 10000, // 1% fee tier (from our pool check)
    maxSupply: ethers.parseEther("10000000") // 10M max supply
};

async function main() {
    console.log("🚀 DEPLOYING REAL CHARM STRATEGY");
    console.log("=================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏛️ Target Vault: ${ETHEREUM_CONTRACTS.vault}`);
    console.log(`🪙 WLFI: ${ETHEREUM_CONTRACTS.wlfiToken}`);
    console.log(`🪙 USD1: ${ETHEREUM_CONTRACTS.usd1Token}`);
    console.log(`🎯 Pool: ${POOL_CONFIG.address} (${POOL_CONFIG.fee/10000}% fee)`);
    
    // Check if we can connect to the existing vault
    const vaultAbi = [
        "function owner() external view returns (address)",
        "function name() external view returns (string)"
    ];
    
    const vault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, vaultAbi, deployer);
    
    try {
        const vaultName = await vault.name();
        const vaultOwner = await vault.owner();
        console.log(`📛 Vault Name: ${vaultName}`);
        console.log(`👑 Vault Owner: ${vaultOwner}`);
        
        if (vaultOwner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("⚠️  WARNING: You're not the vault owner. Strategy deployment might fail.");
            console.log(`Expected: ${deployer.address}`);
            console.log(`Actual: ${vaultOwner}`);
        }
    } catch (error: any) {
        console.log(`❌ Error reading vault: ${error.message}`);
        console.log("🤔 This might not be the correct vault address or network.");
        return;
    }
    
    // For now, let's deploy with a mock/placeholder factory
    // We can update this when we find the real Charm factory address
    console.log("\n⚠️  USING PLACEHOLDER CHARM FACTORY");
    console.log("We need to find the real Charm Finance AlphaProVault factory address");
    console.log("For now, deploying with placeholder to test the deployment process\n");
    
    console.log("🏗️  Deploying CharmAlphaVaultStrategy...");
    
    const CharmStrategy = await ethers.getContractFactory("CharmAlphaVaultStrategy");
    
    // Deploy with minimal gas to start
    const strategy = await CharmStrategy.deploy(
        ETHEREUM_CONTRACTS.vault,
        "0x0000000000000000000000000000000000000001", // Placeholder factory
        ETHEREUM_CONTRACTS.wlfiToken,
        ETHEREUM_CONTRACTS.usd1Token,
        deployer.address,
        {
            gasLimit: 3000000, // 3M gas limit
            maxFeePerGas: ethers.parseUnits("20", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")
        }
    );
    
    await strategy.waitForDeployment();
    const strategyAddress = await strategy.getAddress();
    
    console.log(`✅ CharmAlphaVaultStrategy deployed: ${strategyAddress}`);
    
    console.log("\n📋 NEXT STEPS:");
    console.log("1. Find real Charm Finance AlphaProVault factory address");
    console.log("2. Deploy strategy with real factory");
    console.log("3. Initialize strategy with WLFI/USD1 pool");
    console.log("4. Add strategy to Eagle Vault");
    console.log("5. Test LayerZero deposits");
    
    console.log("\n🔗 ETHERSCAN:");
    console.log(`https://etherscan.io/address/${strategyAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
