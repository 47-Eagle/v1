import { ethers } from "hardhat";

/**
 * Complete BSC deployment with direct endpoint (no registry)
 * Deploy EagleShareOFTDirect to finish the BSC setup
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
};

async function completeBSCDeployment() {
    console.log("🚀 COMPLETING BSC DEPLOYMENT");
    console.log("============================");
    console.log("✅ WLFIAdapter: Already deployed");
    console.log("✅ USD1Adapter: Already deployed");  
    console.log("🎯 Now deploying: EagleShareOFTDirect");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB`);
    
    // Read existing deployment addresses
    const fs = require('fs');
    let existingAddresses: any = {};
    try {
        const addressFile = 'bsc-deployment.json';
        if (fs.existsSync(addressFile)) {
            existingAddresses = JSON.parse(fs.readFileSync(addressFile, 'utf8'));
            console.log("📂 Loaded existing BSC addresses");
        }
    } catch (error) {
        console.log("⚠️  No existing addresses found, starting fresh");
    }
    
    try {
        // Deploy EagleShareOFTDirect (bypasses registry issues)
        console.log(`\n🦅 EagleShareOFTDirect (Direct endpoint)...`);
        const EagleShareOFTDirect = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFTDirect.sol:EagleShareOFTDirect");
        
        const eagleOFT = await EagleShareOFTDirect.deploy(
            "Eagle",                 // Name
            "EAGLE",                 // Symbol
            BSC_CONFIG.endpointV2,   // LayerZero endpoint (direct)
            deployer.address         // Delegate
        );
        
        await eagleOFT.waitForDeployment();
        const eagleAddress = await eagleOFT.getAddress();
        
        console.log(`   ✅ EagleShareOFTDirect: ${eagleAddress}`);
        
        // Verify delegate is set correctly
        try {
            const delegate = await eagleOFT.delegate();
            console.log(`   📍 Delegate: ${delegate}`);
            
            const endpoint = await eagleOFT.getEndpoint();
            console.log(`   📡 Endpoint: ${endpoint}`);
            
            // Test basic OFT functions
            const name = await eagleOFT.name();
            const symbol = await eagleOFT.symbol();
            console.log(`   🏷️  Token: ${name} (${symbol})`);
            
        } catch (error) {
            console.log(`   ⚠️  Verification failed: ${error.message}`);
        }
        
        // Update deployment file
        const deploymentData = {
            bsc: {
                chainId: BSC_CONFIG.chainId,
                timestamp: new Date().toISOString(),
                deployer: deployer.address,
                contracts: {
                    ...existingAddresses.bsc?.contracts,
                    eagleShareOFTDirect: eagleAddress,
                },
                tokens: REAL_TOKENS,
                layerzero: {
                    endpoint: BSC_CONFIG.endpointV2,
                    eid: BSC_CONFIG.eid
                }
            }
        };
        
        fs.writeFileSync('bsc-deployment-complete.json', JSON.stringify(deploymentData, null, 2));
        
        console.log(`\n🎉 BSC DEPLOYMENT COMPLETE!`);
        console.log(`📁 Addresses saved to: bsc-deployment-complete.json`);
        
        console.log(`\n📋 COMPLETE BSC DEPLOYMENT:`);
        console.log(`   🦅 EagleShareOFTDirect: ${eagleAddress}`);
        console.log(`   💰 WLFIAdapter: ${existingAddresses.bsc?.contracts?.wlfiAdapter || 'Deploy first'}`);
        console.log(`   💰 USD1Adapter: ${existingAddresses.bsc?.contracts?.usd1Adapter || 'Deploy first'}`);
        
        console.log(`\n✅ READY FOR NEXT STEPS:`);
        console.log(`   1. Deploy matching contracts on Ethereum`);
        console.log(`   2. Configure LayerZero peer connections`);
        console.log(`   3. Test cross-chain transfers`);
        console.log(`   4. Add CREATE2 vanity addresses later`);
        
        return eagleAddress;
        
    } catch (error) {
        console.log(`❌ BSC completion failed: ${error.message}`);
        throw error;
    }
}

completeBSCDeployment()
    .then((address) => {
        console.log(`\n🎯 EagleShareOFTDirect deployed at: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
