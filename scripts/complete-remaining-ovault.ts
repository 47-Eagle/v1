import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    wlfiToken: process.env.WLFI_ETHEREUM!,
    lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
};

// Use existing deployed WLFI Asset Adapter
const EXISTING_WLFI_ADAPTER = '0x1E41331Fff44243D3554aC9c88D10C8A584D4DD6';

async function completeRemainingOVault() {
    console.log("🔧 COMPLETING REMAINING OVAULT COMPONENTS");
    console.log("=========================================");
    console.log("Using existing WLFI Asset Adapter, deploying missing pieces\n");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🔄 Existing WLFI Adapter: ${EXISTING_WLFI_ADAPTER}`);
    
    const deployedContracts: any = {
        wlfiAssetAdapter: EXISTING_WLFI_ADAPTER
    };
    
    try {
        // Verify existing WLFI adapter
        console.log("\n🔍 Verifying existing WLFI Asset Adapter...");
        const wlfiAdapter = await ethers.getContractAt("WLFIOVaultAdapter", EXISTING_WLFI_ADAPTER);
        const wrappedToken = await wlfiAdapter.token();
        console.log(`Wraps token: ${wrappedToken}`);
        console.log(`Expected:    ${ETHEREUM_CONTRACTS.wlfiToken}`);
        console.log(`Valid: ${wrappedToken.toLowerCase() === ETHEREUM_CONTRACTS.wlfiToken.toLowerCase() ? '✅' : '❌'}`);
        
        if (wrappedToken.toLowerCase() !== ETHEREUM_CONTRACTS.wlfiToken.toLowerCase()) {
            throw new Error("Existing adapter wraps wrong token");
        }
        
        // Ultra minimal gas settings
        const ultraLowGas = {
            maxFeePerGas: ethers.parseUnits("2.5", "gwei"),    
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei"), 
            gasLimit: 1800000 
        };
        
        console.log("\n⚙️  Ultra-minimal gas settings:");
        console.log(`   Max Fee: 2.5 gwei`);
        console.log(`   Priority: 0.1 gwei`);
        console.log(`   Limit: 1.8M gas`);
        
        // Deploy Share OFT Adapter ONLY
        console.log("\n1️⃣  Deploying Share OFT Adapter...");
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
        
        // Check remaining balance
        let currentBalance = await ethers.provider.getBalance(deployer.address);
        console.log(`💰 Remaining: ${ethers.formatEther(currentBalance)} ETH`);
        
        if (currentBalance < ethers.parseEther("0.005")) {
            console.log("⚠️  Very low ETH - skipping VaultComposerSync for now");
            console.log("💡 VaultComposerSync can be deployed separately later");
            
            console.log("\n📋 PARTIAL SUCCESS!");
            console.log("====================");
            console.log("✅ WLFI Asset Adapter: Working");
            console.log("✅ Share OFT Adapter: Deployed");
            console.log("⏳ VaultComposerSync: Deploy later with more ETH");
            
            return deployedContracts;
        }
        
        console.log("⏳ Waiting 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try to deploy VaultComposerSync with remaining ETH
        console.log("\n2️⃣  Attempting VaultComposerSync deployment...");
        
        // Even more minimal gas for VaultComposerSync
        const extremeLowGas = {
            maxFeePerGas: ethers.parseUnits("2", "gwei"),    
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei"), 
            gasLimit: 2200000 // Slightly higher for composer
        };
        
        const VaultComposerSync = await ethers.getContractFactory("VaultComposerSync");
        const vaultComposer = await VaultComposerSync.deploy(
            ETHEREUM_CONTRACTS.vault,
            deployedContracts.wlfiAssetAdapter,
            deployedContracts.shareOFTAdapter,
            extremeLowGas
        );
        
        await vaultComposer.waitForDeployment();
        deployedContracts.vaultComposer = await vaultComposer.getAddress();
        console.log(`✅ VaultComposerSync: ${deployedContracts.vaultComposer}`);
        
        // Final status
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const totalSpent = balance - finalBalance;
        
        console.log("\n🎊 COMPLETE OVAULT SUCCESS!");
        console.log("===========================");
        console.log(`💸 Total Gas Spent: ${ethers.formatEther(totalSpent)} ETH`);
        console.log(`💰 Final Balance: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\nAll OVault Components:");
        console.log(`WLFI Asset Adapter: ${deployedContracts.wlfiAssetAdapter}`);
        console.log(`Share OFT Adapter:  ${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync:  ${deployedContracts.vaultComposer}`);
        
        return deployedContracts;
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        if (Object.keys(deployedContracts).length > 1) {
            console.log("\n🔍 Deployed so far:");
            console.log(deployedContracts);
            console.log("💡 Can continue from here with more ETH");
        }
        
        return deployedContracts;
    }
}

async function main() {
    const result = await completeRemainingOVault();
    
    if (result && result.shareOFTAdapter) {
        console.log("\n📋 STEP 1 COMPLETE: OVAULT COMPONENTS READY");
        console.log("==========================================");
        console.log("🎯 Next: Deploy CharmAlphaVaultStrategy");
        console.log("🎯 Then: Configure vault strategy");  
        console.log("🎯 Finally: Test full cross-chain flow");
        
        // Generate the configuration
        console.log("\n💾 OVault Configuration:");
        console.log("const ETHEREUM_OVAULT = {");
        console.log(`  vault: '${ETHEREUM_CONTRACTS.vault}',`);
        console.log(`  wlfiAssetAdapter: '${result.wlfiAssetAdapter}',`);
        console.log(`  shareOFTAdapter: '${result.shareOFTAdapter}',`);
        if (result.vaultComposer) {
            console.log(`  vaultComposer: '${result.vaultComposer}',`);
        }
        console.log(`  wlfiToken: '${ETHEREUM_CONTRACTS.wlfiToken}'`);
        console.log("};");
        
    } else {
        console.log("\n⏳ PARTIAL COMPLETION");
        console.log("Need more ETH to finish remaining components");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { completeRemainingOVault };
