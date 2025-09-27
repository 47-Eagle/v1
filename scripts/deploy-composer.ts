import { ethers } from "hardhat";

/**
 * @title Deploy EagleOVaultComposer
 * @notice Deploy the missing composer to enable proper cross-chain vault operations
 */

async function main() {
    console.log("🚀 DEPLOYING EAGLE OVAULT COMPOSER");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${signer.address}`);
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(signer.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    if (ethBalance < ethers.parseEther("0.002")) {
        console.log("❌ Insufficient ETH for deployment");
        return;
    }
    
    // Known contract addresses
    const EAGLE_VAULT = "0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0";
    const WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const EAGLE_SHARE_OFT = "0x68cF24743CA335ae3c2e21c2538F4E929224F096";
    
    try {
        console.log("\n📋 DEPLOYMENT PARAMETERS:");
        console.log(`🏦 Vault: ${EAGLE_VAULT}`);
        console.log(`🔄 Asset OFT (WLFI): ${WLFI_ADAPTER}`);
        console.log(`🪙 Share OFT (EAGLE): ${EAGLE_SHARE_OFT}`);
        
        // Get gas settings
        const feeData = await ethers.provider.getFeeData();
        const gasSettings = {
            maxFeePerGas: feeData.maxFeePerGas!,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
            gasLimit: 2000000
        };
        
        console.log(`⛽ Gas settings: ${ethers.formatUnits(gasSettings.maxFeePerGas, "gwei")} gwei`);
        
        // Deploy the composer
        console.log("\n🏗️ DEPLOYING COMPOSER...");
        
        const EagleOVaultComposer = await ethers.getContractFactory("EagleOVaultComposer");
        const composer = await EagleOVaultComposer.deploy(
            EAGLE_VAULT,
            WLFI_ADAPTER,
            EAGLE_SHARE_OFT,
            gasSettings
        );
        
        console.log(`📄 Deployment TX: ${composer.deploymentTransaction()?.hash}`);
        console.log("⏳ Waiting for deployment...");
        
        await composer.waitForDeployment();
        const composerAddress = await composer.getAddress();
        
        console.log("\n🎉 COMPOSER DEPLOYED SUCCESSFULLY!");
        console.log("=".repeat(45));
        console.log(`📍 EagleOVaultComposer: ${composerAddress}`);
        
        // Verify deployment
        console.log("\n✅ VERIFYING DEPLOYMENT:");
        const vault = await composer.getVault();
        const assetOFT = await composer.getAssetOFT();
        const shareOFT = await composer.getShareOFT();
        
        console.log(`🏦 Configured Vault: ${vault}`);
        console.log(`🔄 Configured Asset OFT: ${assetOFT}`);
        console.log(`🪙 Configured Share OFT: ${shareOFT}`);
        
        const vaultMatch = vault.toLowerCase() === EAGLE_VAULT.toLowerCase();
        const assetMatch = assetOFT.toLowerCase() === WLFI_ADAPTER.toLowerCase();
        const shareMatch = shareOFT.toLowerCase() === EAGLE_SHARE_OFT.toLowerCase();
        
        console.log(`✅ Vault match: ${vaultMatch}`);
        console.log(`✅ Asset OFT match: ${assetMatch}`);
        console.log(`✅ Share OFT match: ${shareMatch}`);
        
        if (vaultMatch && assetMatch && shareMatch) {
            console.log("\n🎊 COMPOSER FULLY CONFIGURED!");
            
            console.log("\n🔧 NEXT STEPS:");
            console.log("1. Configure BSC adapters to send to this composer");
            console.log("2. Set composer address as the peer destination");
            console.log("3. Test deposits through proper flow");
            
            console.log("\n📋 COMPOSER CONTRACT:");
            console.log(`Address: ${composerAddress}`);
            console.log(`Etherscan: https://etherscan.io/address/${composerAddress}`);
            
            // Calculate final cost
            const finalBalance = await ethers.provider.getBalance(signer.address);
            const deploymentCost = ethBalance - finalBalance;
            console.log(`💸 Deployment cost: ${ethers.formatEther(deploymentCost)} ETH`);
            
        } else {
            console.log("❌ Configuration mismatch - check deployment");
        }
        
    } catch (error: any) {
        console.log(`❌ Deployment error: ${error.message}`);
        if (error.data) {
            console.log(`📄 Error data: ${error.data}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
