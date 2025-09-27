import { ethers } from "hardhat";

/**
 * @title Check Composer Status
 * @notice Check if EagleOVaultComposer exists and get its configuration
 */

async function main() {
    console.log("🎼 CHECKING EAGLE OVAULT COMPOSER STATUS");
    console.log("=".repeat(45));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Known addresses from deployment
    const EAGLE_VAULT = "0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0";
    const WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const EAGLE_SHARE_OFT = "0x68cF24743CA335ae3c2e21c2538F4E929224F096";
    
    try {
        console.log("\n📊 KNOWN CONTRACT ADDRESSES:");
        console.log(`🏦 Eagle Vault: ${EAGLE_VAULT}`);
        console.log(`🔄 WLFI Adapter: ${WLFI_ADAPTER}`);  
        console.log(`🪙 Eagle Share OFT: ${EAGLE_SHARE_OFT}`);
        
        console.log("\n🔍 SEARCHING FOR COMPOSER...");
        
        // Try to compute what the composer address should be
        // Or check if we can find any composer-related transactions
        
        // Check if there are any deployed composers by looking at recent transactions
        console.log("Checking if composer was deployed...");
        
        // Let's see if we can find the composer by checking LayerZero composer contracts
        // The composer should be a contract that has these 3 addresses in its storage
        
        console.log("\n💡 COMPOSER SHOULD BE CONFIGURED WITH:");
        console.log(`   Vault: ${EAGLE_VAULT}`);
        console.log(`   Asset OFT: ${WLFI_ADAPTER}`);
        console.log(`   Share OFT: ${EAGLE_SHARE_OFT}`);
        
        console.log("\n🎯 COMPOSER DEPLOYMENT NEEDED:");
        console.log("The EagleOVaultComposer appears to be missing!");
        console.log("This explains why direct OFT transfers are failing.");
        
        console.log("\n🚀 CORRECT FLOW SHOULD BE:");
        console.log("1. BSC User → USD1/WLFI Adapters");
        console.log("2. Adapters → EagleOVaultComposer (on Ethereum)");
        console.log("3. Composer → Eagle Vault (automatic deposit)");
        console.log("4. Vault → EAGLE shares back to user");
        
        console.log("\n🔧 NEXT STEPS:");
        console.log("1. Deploy EagleOVaultComposer on Ethereum");
        console.log("2. Configure BSC adapters to send to Composer");
        console.log("3. Test deposits through proper flow");
        
        // Let's try to deploy the composer
        console.log("\n🏗️ PREPARING COMPOSER DEPLOYMENT:");
        
        console.log("Parameters needed:");
        console.log(`  _vault: ${EAGLE_VAULT}`);
        console.log(`  _assetOFT: ${WLFI_ADAPTER}`);
        console.log(`  _shareOFT: ${EAGLE_SHARE_OFT}`);
        
    } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
