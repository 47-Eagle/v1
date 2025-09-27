import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// BSC configuration
const BSC_CONTRACTS = {
    wlfiToken: process.env.BSC_WLFI_ADDRESS!, // Underlying WLFI token
    lzEndpoint: process.env.BNB_LZ_ENDPOINT_V2!
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function deployOVaultSpoke() {
    console.log("🏗️  DEPLOYING LAYERZERO OVAULT SPOKE (BSC)");
    console.log("==========================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 BNB Balance: ${ethers.formatEther(balance)} BNB`);
    console.log(`🪙 WLFI Token: ${BSC_CONTRACTS.wlfiToken}`);
    console.log(`📡 LZ Endpoint: ${BSC_CONTRACTS.lzEndpoint}`);
    
    if (balance < ethers.parseEther("0.01")) {
        console.log("❌ Insufficient BNB for OVault spoke deployment");
        console.log("💡 Need at least 0.01 BNB for gas fees");
        return;
    }
    
    const deployedContracts: any = {};
    
    try {
        // Step 1: Deploy WLFI Asset OFT (spoke side)
        console.log("\n1️⃣  Deploying WLFI Asset OFT (Spoke)...");
        const WLFIAssetOFT = await ethers.getContractFactory("WLFIAssetOFT");
        const wlfiAssetOFT = await WLFIAssetOFT.deploy(
            "WLFI Asset OFT",
            "WLFI",
            BSC_CONTRACTS.lzEndpoint,
            deployer.address,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 3000000
            }
        );
        await wlfiAssetOFT.waitForDeployment();
        deployedContracts.wlfiAssetOFT = await wlfiAssetOFT.getAddress();
        console.log(`✅ WLFI Asset OFT: ${deployedContracts.wlfiAssetOFT}`);
        
        // Step 2: Deploy Share OFT (represents vault shares on BSC)
        console.log("\n2️⃣  Deploying Share OFT...");
        const ShareOFT = await ethers.getContractFactory("EagleShareOFT");
        const shareOFT = await ShareOFT.deploy(
            "Eagle Vault Shares",
            "eVault",
            BSC_CONTRACTS.lzEndpoint,
            deployer.address,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 3000000
            }
        );
        await shareOFT.waitForDeployment();
        deployedContracts.shareOFT = await shareOFT.getAddress();
        console.log(`✅ Share OFT: ${deployedContracts.shareOFT}`);
        
        console.log("\n🎊 OVAULT SPOKE DEPLOYMENT COMPLETE!");
        console.log("===================================");
        console.log("Deployed Contracts:");
        console.log(`WLFI Asset OFT: ${deployedContracts.wlfiAssetOFT}`);
        console.log(`Share OFT: ${deployedContracts.shareOFT}`);
        
        console.log("\nExisting:");
        console.log(`WLFI Token: ${BSC_CONTRACTS.wlfiToken}`);
        
        console.log("\nBSCScan Links:");
        console.log(`WLFI Asset OFT: https://bscscan.com/address/${deployedContracts.wlfiAssetOFT}`);
        console.log(`Share OFT: https://bscscan.com/address/${deployedContracts.shareOFT}`);
        
        console.log("\n📋 NEXT STEPS:");
        console.log("==============");
        console.log("1. Configure peer connections between hub and spoke");
        console.log("2. Set enforced options for compose messages");
        console.log("3. Test omnichain deposits");
        
        // Save deployment addresses
        const deploymentData = {
            network: 'bsc',
            chainId: 56,
            contracts: deployedContracts,
            existing: BSC_CONTRACTS,
            timestamp: new Date().toISOString()
        };
        
        console.log("\n💾 Deployment data:");
        console.log(JSON.stringify(deploymentData, null, 2));
        
        return deployedContracts;
        
    } catch (error: any) {
        console.error(`❌ Spoke deployment failed: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
            console.log("💡 Need more BNB for deployment");
        } else if (error.message.includes('constructor')) {
            console.log("💡 Constructor parameter issue - check contract addresses");
        }
        
        return null;
    }
}

async function main() {
    const result = await deployOVaultSpoke();
    
    if (result) {
        console.log("\n🚀 Ready to configure OVault connections!");
        console.log("Run: npx hardhat run scripts/configure-ovault-peers.ts --network ethereum");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deployOVaultSpoke };
