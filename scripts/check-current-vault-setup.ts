import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    charmStrategy: '0xB5589Af4b2CE5dcE27c757b18144e6D6848C45dF',
};

const POOL_ADDRESS = "0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d";

// Basic ERC4626 vault ABI
const vaultAbi = [
    "function name() external view returns (string)",
    "function totalAssets() external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function getStrategies() external view returns (address[], uint256[])",
    "function asset() external view returns (address)",
    "function needsRebalance() external view returns (bool)"
];

// Basic strategy ABI
const strategyAbi = [
    "function isInitialized() external view returns (bool)",
    "function getTotalAmounts() external view returns (uint256, uint256)",
    "function vault() external view returns (address)"
];

async function main() {
    console.log("🔍 CHECKING CURRENT VAULT SETUP");
    console.log("===============================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Signer: ${deployer.address}`);
    
    const vault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, vaultAbi, deployer);
    
    try {
        console.log("\n🏛️ EAGLE VAULT V2 STATUS:");
        const vaultName = await vault.name();
        const totalAssets = await vault.totalAssets();
        const totalSupply = await vault.totalSupply();
        const assetAddress = await vault.asset();
        
        console.log(`📛 Name: ${vaultName}`);
        console.log(`💰 Total Assets: ${ethers.formatEther(totalAssets)} tokens`);
        console.log(`🎫 Total Supply: ${ethers.formatEther(totalSupply)} shares`);
        console.log(`🎯 Primary Asset: ${assetAddress}`);
        
        // Check if it has strategy support
        try {
            const [strategies, weights] = await vault.getStrategies();
            console.log(`\n🧩 STRATEGIES (${strategies.length}):`);
            
            if (strategies.length === 0) {
                console.log("❌ No strategies configured - this explains the LayerZero failures!");
                console.log("💡 The vault needs strategy integration to handle deposits properly.");
            } else {
                for (let i = 0; i < strategies.length; i++) {
                    console.log(`${i + 1}. ${strategies[i]} (weight: ${Number(weights[i])/100}%)`);
                }
            }
            
            const needsRebalance = await vault.needsRebalance();
            console.log(`⚖️  Needs Rebalance: ${needsRebalance}`);
            
        } catch (strategyError: any) {
            console.log("❌ This vault doesn't support strategies yet!");
            console.log("💡 We need to deploy EagleOVaultV2 with strategy support.");
        }
        
    } catch (vaultError: any) {
        console.log(`❌ Vault error: ${vaultError.message}`);
    }
    
    // Check charm strategy
    try {
        console.log("\n🔮 CHARM STRATEGY STATUS:");
        const strategy = new ethers.Contract(ETHEREUM_CONTRACTS.charmStrategy, strategyAbi, deployer);
        
        const isInitialized = await strategy.isInitialized();
        const [wlfiAmount, usd1Amount] = await strategy.getTotalAmounts();
        const vaultAddress = await strategy.vault();
        
        console.log(`🚀 Initialized: ${isInitialized ? '✅' : '❌'}`);
        console.log(`💰 WLFI Managed: ${ethers.formatEther(wlfiAmount)}`);
        console.log(`💰 USD1 Managed: ${ethers.formatEther(usd1Amount)}`);
        console.log(`🏛️ Connected Vault: ${vaultAddress}`);
        
        if (!isInitialized) {
            console.log("\n💡 CHARM STRATEGY NEEDS INITIALIZATION!");
            console.log(`📋 Pool to use: ${POOL_ADDRESS} (WLFI/USD1)`);
        }
        
    } catch (strategyError: any) {
        console.log(`❌ Strategy error: ${strategyError.message}`);
        console.log("💡 Charm strategy might not be properly deployed.");
    }
    
    console.log("\n🎯 DIAGNOSIS:");
    console.log("- Pool ✅: Contains exactly WLFI/USD1 pair");
    console.log("- Vault ?: Need to check strategy support");
    console.log("- Strategy ?: Need to check initialization");
    console.log("- Composer ❌: Missing (confirmed earlier)");
    
    console.log("\n💡 LIKELY FIX:");
    console.log("1. Initialize Charm strategy with the WLFI/USD1 pool");
    console.log("2. Add strategy to vault with proper allocation");
    console.log("3. Deploy composer for cross-chain flow");
    console.log("4. Then LayerZero deposits should work!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
