import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F', // Primary asset (WLFI)
    shareOFT: '0x68cF24743CA335ae3c2e21c2538F4E929224F096'
};

async function main() {
    console.log("🚀 DEPLOYING EAGLE OVAULT COMPOSER");
    console.log("==================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏛️ Vault: ${ETHEREUM_CONTRACTS.vault}`);
    console.log(`🔄 Asset OFT: ${ETHEREUM_CONTRACTS.wlfiAdapter}`);
    console.log(`📈 Share OFT: ${ETHEREUM_CONTRACTS.shareOFT}`);
    
    if (balance < ethers.parseEther("0.003")) {
        console.log("❌ Insufficient ETH for deployment");
        return;
    }
    
    try {
        console.log("\n🏗️  Deploying EagleOVaultComposer...");
        
        const EagleOVaultComposer = await ethers.getContractFactory("EagleOVaultComposer");
        
        const composer = await EagleOVaultComposer.deploy(
            ETHEREUM_CONTRACTS.vault,
            ETHEREUM_CONTRACTS.wlfiAdapter, // Using WLFI as primary asset OFT (matches vault.asset())
            ETHEREUM_CONTRACTS.shareOFT,
            {
                gasLimit: 1500000, // 1.5M gas limit (reduced)
                maxFeePerGas: ethers.parseUnits("5", "gwei"), // Very low gas
                maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei") // Minimal priority
            }
        );
        
        console.log("⏳ Waiting for deployment...");
        await composer.waitForDeployment();
        
        const composerAddress = await composer.getAddress();
        console.log(`✅ EagleOVaultComposer deployed: ${composerAddress}`);
        
        // Verify deployment by calling a view function
        try {
            // Assuming it has a vault() function
            const linkedVault = await composer.vault();
            console.log(`✅ Linked to vault: ${linkedVault}`);
        } catch (viewError: any) {
            console.log(`⚠️  Could not verify linking: ${viewError.message}`);
        }
        
        console.log("\n📋 DEPLOYMENT SUCCESS!");
        console.log("====================");
        console.log(`Composer: ${composerAddress}`);
        console.log(`Vault: ${ETHEREUM_CONTRACTS.vault}`);
        console.log(`Asset OFT: ${ETHEREUM_CONTRACTS.wlfiAdapter}`);
        console.log(`Share OFT: ${ETHEREUM_CONTRACTS.shareOFT}`);
        
        console.log("\n🔗 ETHERSCAN:");
        console.log(`https://etherscan.io/address/${composerAddress}`);
        
        console.log("\n💡 NEXT STEPS:");
        console.log("1. Configure BSC adapters to send to this composer");
        console.log("2. Test LayerZero deposits again");
        console.log("3. The composer should handle cross-chain deposit flow");
        
    } catch (error: any) {
        console.log(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes("revert")) {
            console.log("💡 Constructor validation failed");
            console.log("🔧 Check constructor parameters are valid");
        } else if (error.message.includes("gas")) {
            console.log("💡 Insufficient gas for deployment");
            console.log("🔧 Increase gas limit or lower complexity");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
