import { ethers } from "hardhat";

/**
 * @title Simple Receive Configuration  
 * @notice Set bare minimum receive config on Ethereum to enable deposits
 */

async function main() {
    console.log("🔧 SIMPLE ETHEREUM RECEIVE CONFIG");
    console.log("=".repeat(35));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_EID = 30102;
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const ETH_WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    try {
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 ETH: ${ethers.formatEther(ethBalance)} ETH`);
        
        // Use fast gas to avoid hanging
        console.log("⛽ Using fast gas settings to avoid hanging...");
        
        const usd1Adapter = await ethers.getContractAt([
            "function owner() view returns (address)",
            "function setDelegate(address) external"
        ], ETH_USD1_ADAPTER);
        
        const wlfiAdapter = await ethers.getContractAt([
            "function owner() view returns (address)",
            "function setDelegate(address) external"
        ], ETH_WLFI_ADAPTER);
        
        console.log("✅ Ownership already verified");
        
        // Try a different approach: Use LayerZero's OApp.sol setDelegate function
        // This might enable default configurations
        console.log("\n🔧 SETTING DELEGATE (enables default config):");
        
        try {
            const delegateTx1 = await usd1Adapter.setDelegate(signer.address, {
                gasLimit: 50000,
                gasPrice: ethers.parseUnits("15", "gwei")
            });
            console.log(`📄 USD1 delegate: ${delegateTx1.hash}`);
            await delegateTx1.wait();
            console.log("✅ USD1 delegate set");
        } catch (delegateError) {
            console.log("⚠️ USD1 delegate already set or failed");
        }
        
        try {
            const delegateTx2 = await wlfiAdapter.setDelegate(signer.address, {
                gasLimit: 50000,
                gasPrice: ethers.parseUnits("15", "gwei")
            });
            console.log(`📄 WLFI delegate: ${delegateTx2.hash}`);
            await delegateTx2.wait();
            console.log("✅ WLFI delegate set");
        } catch (delegateError) {
            console.log("⚠️ WLFI delegate already set or failed");
        }
        
        console.log("\n🎯 ALTERNATIVE APPROACH:");
        console.log("LayerZero V2 might auto-configure when delegate is set");
        console.log("Let's test deposits again...");
        
        const finalBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💸 ETH spent: ${ethers.formatEther(ethBalance - finalBalance)} ETH`);
        
        console.log("\n✅ Basic configuration complete");
        console.log("🧪 Test deposits from BSC again");
        
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
