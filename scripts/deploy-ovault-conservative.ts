import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    wlfiToken: process.env.ETHEREUM_WLFI_ADDRESS!,
    lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
};

async function deployOVaultConservative() {
    console.log("🏗️  CONSERVATIVE OVAULT DEPLOYMENT (ETHEREUM ONLY)");
    console.log("=================================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.015")) {
        console.log("❌ Insufficient ETH - need at least 0.015 ETH");
        return null;
    }
    
    const deployedContracts: any = {};
    
    try {
        // Conservative gas settings
        const gasSettings = {
            maxFeePerGas: ethers.parseUnits("8", "gwei"), // Lower gas price
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 2500000 // Conservative gas limit
        };
        
        console.log("⚙️  Using conservative gas settings:");
        console.log(`   Max Fee: 8 gwei`);
        console.log(`   Priority Fee: 1 gwei`);
        console.log(`   Gas Limit: 2.5M`);
        
        // Step 1: Deploy WLFI Asset OFT (hub)
        console.log("\n1️⃣  Deploying WLFI Asset OFT...");
        const WLFIOVaultAssetOFT = await ethers.getContractFactory("WLFIOVaultAssetOFT");
        const wlfiAssetOFT = await WLFIOVaultAssetOFT.deploy(
            "WLFI OVault Asset",
            "oWLFI",
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            gasSettings
        );
        
        console.log("⏳ Waiting for WLFI Asset OFT deployment...");
        await wlfiAssetOFT.waitForDeployment();
        deployedContracts.wlfiAssetOFT = await wlfiAssetOFT.getAddress();
        console.log(`✅ WLFI Asset OFT: ${deployedContracts.wlfiAssetOFT}`);
        
        // Wait between deployments to avoid nonce issues
        console.log("⏳ Waiting 10 seconds...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Step 2: Deploy Share OFT Adapter
        console.log("\n2️⃣  Deploying Share OFT Adapter...");
        const EagleShareOFTAdapter = await ethers.getContractFactory("EagleShareOFTAdapter");
        const shareOFTAdapter = await EagleShareOFTAdapter.deploy(
            ETHEREUM_CONTRACTS.vault, // Wrap vault shares
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            gasSettings
        );
        
        console.log("⏳ Waiting for Share OFT Adapter deployment...");
        await shareOFTAdapter.waitForDeployment();
        deployedContracts.shareOFTAdapter = await shareOFTAdapter.getAddress();
        console.log(`✅ Share OFT Adapter: ${deployedContracts.shareOFTAdapter}`);
        
        console.log("⏳ Waiting 10 seconds...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Step 3: Deploy VaultComposerSync
        console.log("\n3️⃣  Deploying VaultComposerSync...");
        const EagleVaultComposerSync = await ethers.getContractFactory("EagleVaultComposerSync");
        const vaultComposer = await EagleVaultComposerSync.deploy(
            ETHEREUM_CONTRACTS.vault,
            deployedContracts.wlfiAssetOFT,
            deployedContracts.shareOFTAdapter,
            {
                ...gasSettings,
                gasLimit: 3000000 // Slightly higher for composer
            }
        );
        
        console.log("⏳ Waiting for VaultComposerSync deployment...");
        await vaultComposer.waitForDeployment();
        deployedContracts.vaultComposer = await vaultComposer.getAddress();
        console.log(`✅ VaultComposerSync: ${deployedContracts.vaultComposer}`);
        
        console.log("\n🎊 ETHEREUM OVAULT HUB DEPLOYED!");
        console.log("================================");
        console.log("Deployed Contracts:");
        console.log(`WLFI Asset OFT:    ${deployedContracts.wlfiAssetOFT}`);
        console.log(`Share OFT Adapter: ${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync: ${deployedContracts.vaultComposer}`);
        
        console.log("\nExisting:");
        console.log(`Eagle Vault V2: ${ETHEREUM_CONTRACTS.vault}`);
        console.log(`WLFI Token:     ${ETHEREUM_CONTRACTS.wlfiToken}`);
        
        console.log("\nEtherscan Links:");
        console.log(`WLFI Asset OFT:    https://etherscan.io/address/${deployedContracts.wlfiAssetOFT}`);
        console.log(`Share OFT Adapter: https://etherscan.io/address/${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync: https://etherscan.io/address/${deployedContracts.vaultComposer}`);
        
        // Check remaining balance
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const spent = balance - finalBalance;
        console.log(`\n💸 Gas Spent: ${ethers.formatEther(spent)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\n📋 NEXT STEPS:");
        console.log("==============");
        console.log("1. Deploy spoke contracts on BSC (need BNB)");
        console.log("2. Configure peer connections");
        console.log("3. Set up DVN configurations");
        console.log("4. Test omnichain deposits");
        
        return deployedContracts;
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
            console.log("💡 Need more ETH or lower gas settings");
        } else if (error.message.includes('nonce')) {
            console.log("💡 Nonce issue - wait and retry");
        } else if (error.message.includes('gas')) {
            console.log("💡 Gas estimation issue - check contract parameters");
        }
        
        // Show any deployed contracts for reference
        if (Object.keys(deployedContracts).length > 0) {
            console.log("\n🔍 Partially deployed contracts:");
            console.log(deployedContracts);
        }
        
        return null;
    }
}

async function main() {
    const result = await deployOVaultConservative();
    
    if (result) {
        console.log("\n🎯 ETHEREUM HUB READY!");
        console.log("======================");
        console.log("✅ LayerZero OVault hub deployed on Ethereum");
        console.log("🔄 Ready for spoke chain deployment (BSC)");
        console.log("💡 Update addresses in configuration scripts");
        
        // Generate configuration template
        console.log("\n📝 Configuration template:");
        console.log("ETHEREUM_OVAULT = {");
        console.log(`  wlfiAssetOFT: '${result.wlfiAssetOFT}',`);
        console.log(`  shareOFTAdapter: '${result.shareOFTAdapter}',`);
        console.log(`  vaultComposer: '${result.vaultComposer}'`);
        console.log("};");
        
    } else {
        console.log("\n❌ DEPLOYMENT FAILED");
        console.log("Check error messages and retry with adjustments");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deployOVaultConservative };
