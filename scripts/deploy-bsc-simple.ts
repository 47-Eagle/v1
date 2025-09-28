import { ethers } from "hardhat";

/**
 * QUICK BSC DEPLOYMENT - Bypass registry issues
 * Deploy Eagle Vault on BSC using direct endpoints
 */

// Real tokens from .env
const REAL_TOKENS = {
    WLFI: process.env.WLFI_BSC!,
    USD1: process.env.USD1_BSC!,
};

// BSC LayerZero configuration
const BSC_CONFIG = {
    chainId: 56,
    eid: 30102,
    endpointV2: "0x1a44076050125825900e736c501f859c50fE728c",
    sendLibrary: "0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE",
    receiveLibrary: "0xB217266c3A98C8B2709Ee26836C98cf12f6cCEC1",
};

async function deployBSCContracts() {
    console.log("🚀 QUICK BSC DEPLOYMENT (No Registry)");
    console.log("====================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB`);
    console.log(`🪙 WLFI Token: ${REAL_TOKENS.WLFI}`);
    console.log(`🪙 USD1 Token: ${REAL_TOKENS.USD1}`);
    
    const deployedAddresses: Record<string, string> = {};
    
    try {
        // Skip EagleShareOFT for now - registry issue
        console.log(`\n🔧 Deploying Adapters (these will work with your existing tokens)...`);
        
        // 2. Deploy WLFIAdapter (wrap existing WLFI)
        console.log(`\n2️⃣ WLFIAdapter (${REAL_TOKENS.WLFI})...`);
        const WLFIAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/WLFIAdapter.sol:WLFIAdapter");
        const wlfiAdapter = await WLFIAdapter.deploy(
            REAL_TOKENS.WLFI,        // Your existing WLFI token
            BSC_CONFIG.endpointV2,   // LayerZero endpoint
            deployer.address         // Delegate
        );
        await wlfiAdapter.waitForDeployment();
        deployedAddresses.wlfiAdapter = await wlfiAdapter.getAddress();
        console.log(`   ✅ WLFIAdapter: ${deployedAddresses.wlfiAdapter}`);
        
        // 3. Deploy USD1Adapter (wrap existing USD1)
        console.log(`\n3️⃣ USD1Adapter (${REAL_TOKENS.USD1})...`);
        const USD1Adapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/USD1Adapter.sol:USD1Adapter");
        const usd1Adapter = await USD1Adapter.deploy(
            REAL_TOKENS.USD1,        // Your existing USD1 token
            BSC_CONFIG.endpointV2,   // LayerZero endpoint
            deployer.address         // Delegate
        );
        await usd1Adapter.waitForDeployment();
        deployedAddresses.usd1Adapter = await usd1Adapter.getAddress();
        console.log(`   ✅ USD1Adapter: ${deployedAddresses.usd1Adapter}`);
        
        // Save addresses
        const fs = require('fs');
        const addressFile = 'bsc-deployment.json';
        const deploymentData = {
            bsc: {
                chainId: BSC_CONFIG.chainId,
                timestamp: new Date().toISOString(),
                deployer: deployer.address,
                contracts: deployedAddresses,
                tokens: REAL_TOKENS
            }
        };
        
        fs.writeFileSync(addressFile, JSON.stringify(deploymentData, null, 2));
        
        console.log(`\n✅ BSC DEPLOYMENT SUCCESSFUL!`);
        console.log(`📁 Addresses saved to: ${addressFile}`);
        console.log(`\n📋 DEPLOYED CONTRACTS:`);
        console.log(`   WLFIAdapter: ${deployedAddresses.wlfiAdapter}`);
        console.log(`   USD1Adapter: ${deployedAddresses.usd1Adapter}`);
        
        console.log(`\n📝 NEXT STEPS:`);
        console.log(`   1. Fix registry configuration for BSC`);
        console.log(`   2. Deploy EagleShareOFT with registry`);
        console.log(`   3. Configure cross-chain peers`);
        
    } catch (error) {
        console.log(`❌ BSC deployment failed: ${error.message}`);
        throw error;
    }
}


deployBSCContracts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
