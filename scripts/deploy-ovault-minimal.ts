import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    wlfiToken: process.env.WLFI_ETHEREUM!,
    lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
};

async function deployMinimalOVault() {
    console.log("⚡ MINIMAL OVAULT DEPLOYMENT (ULTRA LOW GAS)");
    console.log("===========================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    
    const deployedContracts: any = {};
    
    try {
        // Ultra minimal gas settings
        const ultraLowGas = {
            maxFeePerGas: ethers.parseUnits("3", "gwei"),    // Super low
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei"), // Minimal priority
            gasLimit: 2000000 // Conservative limit
        };
        
        console.log("⚙️  Ultra-low gas settings:");
        console.log(`   Max Fee: 3 gwei`);
        console.log(`   Priority: 0.1 gwei`);
        console.log(`   Limit: 2M gas`);
        
        // Deploy WLFI Asset Adapter with minimal gas
        console.log("\n1️⃣  Deploying WLFI Asset Adapter (minimal gas)...");
        const WLFIOVaultAdapter = await ethers.getContractFactory("WLFIOVaultAdapter");
        const wlfiAssetAdapter = await WLFIOVaultAdapter.deploy(
            ETHEREUM_CONTRACTS.wlfiToken,
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            ultraLowGas
        );
        
        await wlfiAssetAdapter.waitForDeployment();
        deployedContracts.wlfiAssetAdapter = await wlfiAssetAdapter.getAddress();
        console.log(`✅ WLFI Asset Adapter: ${deployedContracts.wlfiAssetAdapter}`);
        
        // Check balance after first deployment
        let currentBalance = await ethers.provider.getBalance(deployer.address);
        console.log(`💰 Remaining: ${ethers.formatEther(currentBalance)} ETH`);
        
        if (currentBalance < ethers.parseEther("0.008")) {
            console.log("⚠️  Low on ETH - deploying Share Adapter with even lower gas");
            ultraLowGas.maxFeePerGas = ethers.parseUnits("2", "gwei");
            ultraLowGas.gasLimit = 1800000;
        }
        
        console.log("⏳ Waiting 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Deploy Share OFT Adapter with minimal gas
        console.log("\n2️⃣  Deploying Share OFT Adapter (minimal gas)...");
        const EagleOVaultShareAdapter = await ethers.getContractFactory("EagleOVaultShareAdapter");
        const shareOFTAdapter = await EagleOVaultShareAdapter.deploy(
            ETHEREUM_CONTRACTS.vault,
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            ultraLowGas
        );
        
        await shareOFTAdapter.waitForDeployment();
        deployedContracts.shareOFTAdapter = await shareOFTAdapter.getAddress();
        console.log(`✅ Share OFT Adapter: ${deployedContracts.shareOFTAdapter}`);
        
        // Check balance again
        currentBalance = await ethers.provider.getBalance(deployer.address);
        console.log(`💰 Remaining: ${ethers.formatEther(currentBalance)} ETH`);
        
        if (currentBalance < ethers.parseEther("0.006")) {
            console.log("⚠️  Very low on ETH - VaultComposerSync with ultra-minimal gas");
            ultraLowGas.maxFeePerGas = ethers.parseUnits("2", "gwei");
            ultraLowGas.gasLimit = 2200000; // Slightly higher for composer
        }
        
        console.log("⏳ Waiting 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Deploy VaultComposerSync with minimal gas
        console.log("\n3️⃣  Deploying VaultComposerSync (minimal gas)...");
        const VaultComposerSync = await ethers.getContractFactory("VaultComposerSync");
        const vaultComposer = await VaultComposerSync.deploy(
            ETHEREUM_CONTRACTS.vault,
            deployedContracts.wlfiAssetAdapter,
            deployedContracts.shareOFTAdapter,
            ultraLowGas
        );
        
        await vaultComposer.waitForDeployment();
        deployedContracts.vaultComposer = await vaultComposer.getAddress();
        console.log(`✅ VaultComposerSync: ${deployedContracts.vaultComposer}`);
        
        // Final balance check
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const totalSpent = balance - finalBalance;
        
        console.log("\n🎊 OVAULT DEPLOYMENT COMPLETE!");
        console.log("==============================");
        console.log(`💸 Total Gas Spent: ${ethers.formatEther(totalSpent)} ETH`);
        console.log(`💰 Final Balance: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\nDeployed Contracts:");
        console.log(`WLFI Asset Adapter: ${deployedContracts.wlfiAssetAdapter}`);
        console.log(`Share OFT Adapter:  ${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync:  ${deployedContracts.vaultComposer}`);
        
        console.log("\nEtherscan Links:");
        console.log(`WLFI Asset Adapter: https://etherscan.io/address/${deployedContracts.wlfiAssetAdapter}`);
        console.log(`Share OFT Adapter:  https://etherscan.io/address/${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync:  https://etherscan.io/address/${deployedContracts.vaultComposer}`);
        
        console.log("\n🎯 SUCCESS! LayerZero OVault Hub Deployed!");
        console.log("==========================================");
        console.log("✅ All 3 core contracts deployed");
        console.log("✅ Following LayerZero specification");
        console.log("🔄 Ready for Charm Finance integration");
        
        return deployedContracts;
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
            console.log("💡 Need more ETH - try with even lower gas settings");
        }
        
        if (Object.keys(deployedContracts).length > 0) {
            console.log("\n🔍 Partially deployed contracts:");
            console.log(deployedContracts);
        }
        
        return null;
    }
}

async function main() {
    const result = await deployMinimalOVault();
    
    if (result) {
        console.log("\n📋 READY FOR NEXT STEPS:");
        console.log("========================");
        console.log("1. ✅ LayerZero OVault Hub deployed");
        console.log("2. 🔄 Deploy CharmAlphaVaultStrategy");
        console.log("3. 🔧 Configure vault to use Charm strategy");
        console.log("4. 🧪 Test full cross-chain flow");
        
        // Save deployment info
        console.log("\n💾 Deployment Configuration:");
        console.log("ETHEREUM_OVAULT = {");
        console.log(`  wlfiAssetAdapter: '${result.wlfiAssetAdapter}',`);
        console.log(`  shareOFTAdapter: '${result.shareOFTAdapter}',`);
        console.log(`  vaultComposer: '${result.vaultComposer}',`);
        console.log(`  vault: '${ETHEREUM_CONTRACTS.vault}'`);
        console.log("};");
        
    } else {
        console.log("\n❌ DEPLOYMENT INCOMPLETE");
        console.log("May need additional ETH for completion");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deployMinimalOVault };
