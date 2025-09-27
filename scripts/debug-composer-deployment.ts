import { ethers } from "hardhat";

/**
 * @title Debug Composer Deployment
 * @notice Debug why the composer deployment failed and try simpler approach
 */

async function main() {
    console.log("🔍 DEBUGGING COMPOSER DEPLOYMENT");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Contract addresses to verify
    const EAGLE_VAULT = "0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0";
    const WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const EAGLE_SHARE_OFT = "0x68cF24743CA335ae3c2e21c2538F4E929224F096";
    const FAILED_COMPOSER = "0x3B345A60dD30e0774d2EB4d4e63BC093BD7Ebd1c";
    
    try {
        console.log("\n📋 VERIFYING CONTRACT ADDRESSES:");
        
        // Check if all the constructor parameters are valid contracts
        const vaultCode = await ethers.provider.getCode(EAGLE_VAULT);
        const wlfiCode = await ethers.provider.getCode(WLFI_ADAPTER);
        const shareCode = await ethers.provider.getCode(EAGLE_SHARE_OFT);
        
        console.log(`🏦 Eagle Vault exists: ${vaultCode !== "0x"}`);
        console.log(`🔄 WLFI Adapter exists: ${wlfiCode !== "0x"}`);
        console.log(`🪙 Share OFT exists: ${shareCode !== "0x"}`);
        
        if (vaultCode === "0x" || wlfiCode === "0x" || shareCode === "0x") {
            console.log("❌ One or more constructor parameters point to non-existent contracts");
            return;
        }
        
        // Check what's at the failed deployment address
        const failedCode = await ethers.provider.getCode(FAILED_COMPOSER);
        console.log(`💥 Failed deployment has code: ${failedCode !== "0x"}`);
        
        // The issue might be with the VaultComposerSync base contract
        // Let's try a different approach - deploy a minimal version first
        
        console.log("\n🎯 ALTERNATIVE APPROACH:");
        console.log("Instead of complex composer, let's configure direct transfers");
        console.log("BSC adapters should send directly to Ethereum adapters");
        console.log("Then Ethereum adapters automatically interact with vault");
        
        // Check if Ethereum adapters are configured to interact with the vault
        const wlfiAdapter = await ethers.getContractAt([
            "function token() external view returns (address)",
            "function owner() external view returns (address)"
        ], WLFI_ADAPTER);
        
        const wlfiToken = await wlfiAdapter.token();
        const wlfiOwner = await wlfiAdapter.owner();
        
        console.log(`\n🔍 WLFI ADAPTER ANALYSIS:`);
        console.log(`Token: ${wlfiToken}`);
        console.log(`Owner: ${wlfiOwner}`);
        
        // Check if this is the real WLFI token
        const REAL_WLFI = "0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6";
        console.log(`Is real WLFI: ${wlfiToken.toLowerCase() === REAL_WLFI.toLowerCase()}`);
        
        console.log("\n💡 REALIZATION:");
        console.log("The Ethereum WLFI adapter wraps the REAL WLFI token");
        console.log("When users send from BSC → Ethereum adapter,");  
        console.log("The Ethereum adapter should mint wrapped WLFI");
        console.log("Users can then manually deposit wrapped WLFI to vault");
        
        console.log("\n🔧 SIMPLIFIED FLOW:");
        console.log("1. BSC User → BSC USD1/WLFI Adapter");
        console.log("2. BSC Adapter → Ethereum USD1/WLFI Adapter");
        console.log("3. Ethereum Adapter mints wrapped tokens to user");
        console.log("4. User manually deposits to Eagle Vault");
        console.log("5. Vault mints EAGLE shares to user");
        
        console.log("\n🚀 TEST THIS FLOW:");
        console.log("Configure BSC adapters to send to Ethereum adapters");
        console.log("Test if wrapped tokens are received on Ethereum");
        console.log("Then manually test vault deposit");
        
        // Now let's configure the peer connections properly
        console.log("\n🔗 CONFIGURING CORRECT PEER CONNECTIONS:");
        console.log("BSC USD1 → Ethereum USD1 Adapter");
        console.log("BSC WLFI → Ethereum WLFI Adapter");
        
    } catch (error: any) {
        console.log(`❌ Debug error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
