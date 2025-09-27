import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',      // Eagle Vault V2
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',  // Asset OFT (primary)
    shareOFTAdapter: '0x68cF24743CA335ae3c2e21c2538F4E929224F096'  // Share OFT Adapter
};

async function main() {
    console.log("🚀 DEPLOYING OVAULT COMPOSER (VaultComposerSync)");
    console.log("=================================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏛️ Vault: ${ETHEREUM_CONTRACTS.vault}`);
    console.log(`💎 Asset OFT (WLFI): ${ETHEREUM_CONTRACTS.wlfiAdapter}`);
    console.log(`📈 Share OFT Adapter: ${ETHEREUM_CONTRACTS.shareOFTAdapter}`);
    
    if (balance < ethers.parseEther("0.003")) {
        console.log("❌ Insufficient ETH for deployment");
        return;
    }
    
    try {
        console.log("\n🏗️  Deploying EagleOVaultComposer (VaultComposerSync)...");
        
        const EagleOVaultComposer = await ethers.getContractFactory("EagleOVaultComposer");
        
        // Deploy with the OVault pattern:
        // constructor(vault, assetOFT, shareOFT)
        const composer = await EagleOVaultComposer.deploy(
            ETHEREUM_CONTRACTS.vault,           // ERC4626 vault
            ETHEREUM_CONTRACTS.wlfiAdapter,     // Asset OFT (WLFI primary)
            ETHEREUM_CONTRACTS.shareOFTAdapter, // Share OFT Adapter
            {
                gasLimit: 2000000, // 2M gas limit
                maxFeePerGas: ethers.parseUnits("8", "gwei"), 
                maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei")
            }
        );
        
        console.log("⏳ Waiting for deployment...");
        await composer.waitForDeployment();
        
        const composerAddress = await composer.getAddress();
        console.log(`✅ EagleOVaultComposer deployed: ${composerAddress}`);
        
        // Verify deployment by calling view functions
        try {
            // These should be available from VaultComposerSync
            const linkedVault = await composer.VAULT();
            const linkedAssetOFT = await composer.ASSET_OFT();
            const linkedShareOFT = await composer.SHARE_OFT();
            
            console.log(`✅ Vault linked: ${linkedVault}`);
            console.log(`✅ Asset OFT linked: ${linkedAssetOFT}`);
            console.log(`✅ Share OFT linked: ${linkedShareOFT}`);
        } catch (viewError: any) {
            console.log(`⚠️  Could not verify linking: ${viewError.message}`);
        }
        
        console.log("\n🎯 OVAULT ARCHITECTURE COMPLETE!");
        console.log("=================================");
        console.log(`✅ Asset OFT (WLFI): ${ETHEREUM_CONTRACTS.wlfiAdapter}`);
        console.log(`✅ ERC4626 Vault: ${ETHEREUM_CONTRACTS.vault}`);
        console.log(`✅ Share OFT Adapter: ${ETHEREUM_CONTRACTS.shareOFTAdapter}`);
        console.log(`✅ VaultComposerSync: ${composerAddress}`);
        console.log(`✅ Share OFT (Spoke): Already deployed`);
        
        console.log("\n🔗 ETHERSCAN:");
        console.log(`https://etherscan.io/address/${composerAddress}`);
        
        console.log("\n💡 NEXT STEPS:");
        console.log("1. Configure BSC adapters to send compose messages to this composer");
        console.log("2. Test cross-chain deposits via LayerZero horizontal composability");
        console.log("3. Your $20 deposits should now work through the proper OVault flow!");
        
        console.log("\n📚 ARCHITECTURE PATTERN:");
        console.log("BSC USD1 → LayerZero → ETH USD1 Adapter → lzCompose() → Composer");
        console.log("→ vault.deposit() → shares → LayerZero → BSC (complete!)");
        
    } catch (error: any) {
        console.log(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes("revert")) {
            console.log("💡 Constructor validation failed - check contract parameters");
        } else if (error.message.includes("gas")) {
            console.log("💡 Try increasing gas limit or waiting for lower gas prices");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
