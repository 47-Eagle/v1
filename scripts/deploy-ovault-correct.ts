import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0', // EagleOVaultV2
    wlfiToken: process.env.WLFI_ETHEREUM!, // Existing WLFI ERC20
    lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
};

async function deployCorrectOVault() {
    console.log("🏗️  CORRECT LAYERZERO OVAULT DEPLOYMENT");
    console.log("=====================================");
    console.log("Following LayerZero VaultComposerSync requirements:");
    console.log("- Asset OFT Adapter wraps existing WLFI token");
    console.log("- Share OFT Adapter wraps vault itself");
    console.log("- VaultComposerSync validates these relationships\n");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏛️ Vault: ${ETHEREUM_CONTRACTS.vault}`);
    console.log(`🪙 WLFI Token: ${ETHEREUM_CONTRACTS.wlfiToken}`);
    
    if (balance < ethers.parseEther("0.015")) {
        console.log("❌ Insufficient ETH - need at least 0.015 ETH");
        return null;
    }
    
    const deployedContracts: any = {};
    
    try {
        // Conservative gas settings
        const gasSettings = {
            maxFeePerGas: ethers.parseUnits("8", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 2500000
        };
        
        console.log("⚙️  Using conservative gas settings (8 gwei)");
        
        // Step 1: Deploy WLFI Asset OFT Adapter (wraps existing WLFI token)
        console.log("\n1️⃣  Deploying WLFI Asset OFT Adapter...");
        const WLFIOVaultAdapter = await ethers.getContractFactory("WLFIOVaultAdapter");
        const wlfiAssetAdapter = await WLFIOVaultAdapter.deploy(
            ETHEREUM_CONTRACTS.wlfiToken, // Wrap existing WLFI token
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            gasSettings
        );
        
        console.log("⏳ Waiting for WLFI Asset Adapter deployment...");
        await wlfiAssetAdapter.waitForDeployment();
        deployedContracts.wlfiAssetAdapter = await wlfiAssetAdapter.getAddress();
        console.log(`✅ WLFI Asset Adapter: ${deployedContracts.wlfiAssetAdapter}`);
        
        console.log("⏳ Waiting 10 seconds...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Step 2: Deploy Share OFT Adapter (wraps vault itself)
        console.log("\n2️⃣  Deploying Share OFT Adapter...");
        const EagleOVaultShareAdapter = await ethers.getContractFactory("EagleOVaultShareAdapter");
        const shareOFTAdapter = await EagleOVaultShareAdapter.deploy(
            ETHEREUM_CONTRACTS.vault, // Wrap vault shares (vault itself)
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
        
        // Step 3: Validate requirements before deploying VaultComposerSync
        console.log("\n🔍 Validating OVault requirements...");
        
        // Check that WLFI adapter wraps the correct token
        const wlfiAdapterContract = await ethers.getContractAt("WLFIOVaultAdapter", deployedContracts.wlfiAssetAdapter);
        const wrappedWLFI = await wlfiAdapterContract.token();
        console.log(`WLFI Adapter wraps: ${wrappedWLFI}`);
        console.log(`Expected WLFI:      ${ETHEREUM_CONTRACTS.wlfiToken}`);
        console.log(`WLFI Match: ${wrappedWLFI.toLowerCase() === ETHEREUM_CONTRACTS.wlfiToken.toLowerCase() ? '✅' : '❌'}`);
        
        // Check that Share adapter wraps the vault
        const shareAdapterContract = await ethers.getContractAt("EagleOVaultShareAdapter", deployedContracts.shareOFTAdapter);
        const wrappedVault = await shareAdapterContract.token();
        console.log(`Share Adapter wraps: ${wrappedVault}`);
        console.log(`Expected Vault:      ${ETHEREUM_CONTRACTS.vault}`);
        console.log(`Vault Match: ${wrappedVault.toLowerCase() === ETHEREUM_CONTRACTS.vault.toLowerCase() ? '✅' : '❌'}`);
        
        // Check vault's underlying asset
        const vault = await ethers.getContractAt("IERC4626", ETHEREUM_CONTRACTS.vault);
        const vaultAsset = await vault.asset();
        console.log(`Vault Asset:    ${vaultAsset}`);
        console.log(`Expected WLFI:  ${ETHEREUM_CONTRACTS.wlfiToken}`);
        console.log(`Asset Match: ${vaultAsset.toLowerCase() === ETHEREUM_CONTRACTS.wlfiToken.toLowerCase() ? '✅' : '❌'}`);
        
        if (wrappedWLFI.toLowerCase() !== ETHEREUM_CONTRACTS.wlfiToken.toLowerCase()) {
            throw new Error("WLFI Adapter doesn't wrap correct token");
        }
        if (wrappedVault.toLowerCase() !== ETHEREUM_CONTRACTS.vault.toLowerCase()) {
            throw new Error("Share Adapter doesn't wrap vault");
        }
        if (vaultAsset.toLowerCase() !== ETHEREUM_CONTRACTS.wlfiToken.toLowerCase()) {
            throw new Error("Vault asset is not WLFI");
        }
        
        console.log("✅ All requirements validated!");
        
        // Step 4: Deploy VaultComposerSync
        console.log("\n3️⃣  Deploying LayerZero VaultComposerSync...");
        const VaultComposerSync = await ethers.getContractFactory("VaultComposerSync");
        const vaultComposer = await VaultComposerSync.deploy(
            ETHEREUM_CONTRACTS.vault,           // ERC4626 vault
            deployedContracts.wlfiAssetAdapter, // Asset OFT Adapter
            deployedContracts.shareOFTAdapter,  // Share OFT Adapter
            {
                ...gasSettings,
                gasLimit: 3000000 // Higher for composer
            }
        );
        
        console.log("⏳ Waiting for VaultComposerSync deployment...");
        await vaultComposer.waitForDeployment();
        deployedContracts.vaultComposer = await vaultComposer.getAddress();
        console.log(`✅ VaultComposerSync: ${deployedContracts.vaultComposer}`);
        
        console.log("\n🎊 LAYERZERO OVAULT HUB DEPLOYED!");
        console.log("=================================");
        console.log("✅ All contracts follow LayerZero specifications");
        console.log("✅ VaultComposerSync validates all relationships");
        console.log("✅ Ready for spoke chain deployment and configuration");
        
        console.log("\nDeployed Contracts:");
        console.log(`WLFI Asset Adapter: ${deployedContracts.wlfiAssetAdapter}`);
        console.log(`Share OFT Adapter:  ${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync:  ${deployedContracts.vaultComposer}`);
        
        console.log("\nEtherscan Links:");
        console.log(`WLFI Asset Adapter: https://etherscan.io/address/${deployedContracts.wlfiAssetAdapter}`);
        console.log(`Share OFT Adapter:  https://etherscan.io/address/${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync:  https://etherscan.io/address/${deployedContracts.vaultComposer}`);
        
        // Check remaining balance
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const spent = balance - finalBalance;
        console.log(`\n💸 Gas Spent: ${ethers.formatEther(spent)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\n📋 NEXT STEPS:");
        console.log("==============");
        console.log("1. Deploy spoke OFTs on BSC (WLFI OFT + Share OFT)");
        console.log("2. Configure peer connections hub ↔ spoke");
        console.log("3. Set up DVN configurations");
        console.log("4. Test omnichain deposits via VaultComposerSync");
        
        return deployedContracts;
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
            console.log("💡 Need more ETH for deployment");
        } else if (error.message.includes('ShareTokenNotVault')) {
            console.log("💡 Share OFT Adapter must wrap the vault itself");
        } else if (error.message.includes('AssetTokenNotVaultAsset')) {
            console.log("💡 Asset OFT Adapter must wrap the vault's underlying asset");
        }
        
        // Show any deployed contracts
        if (Object.keys(deployedContracts).length > 0) {
            console.log("\n🔍 Deployed contracts:");
            console.log(deployedContracts);
        }
        
        return null;
    }
}

async function main() {
    const result = await deployCorrectOVault();
    
    if (result) {
        console.log("\n🎯 OVAULT HUB READY!");
        console.log("====================");
        console.log("✅ LayerZero OVault correctly deployed");
        console.log("✅ Follows all VaultComposerSync requirements");
        console.log("🔄 Ready for BSC spoke deployment");
    } else {
        console.log("\n❌ DEPLOYMENT FAILED");
        console.log("Review requirements and retry");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
