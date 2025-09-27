import { ethers } from "hardhat";

/**
 * @title Debug LayerZero Configuration
 * @notice Check all LayerZero configuration parameters
 */

async function main() {
    console.log("🔍 DEBUGGING LAYERZERO CONFIGURATION");
    console.log("=".repeat(50));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const ETHEREUM_EID = 30101;
    
    try {
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        
        console.log("\n📊 BASIC CONTRACT INFO:");
        console.log("=".repeat(30));
        
        const owner = await usd1Adapter.owner();
        const token = await usd1Adapter.token();
        const endpoint = await usd1Adapter.endpoint();
        
        console.log(`👑 Owner: ${owner}`);
        console.log(`🪙 Token: ${token}`);  
        console.log(`🌐 Endpoint: ${endpoint}`);
        console.log(`🔑 Caller: ${signer.address}`);
        console.log(`🎯 Is Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
        
        console.log("\n📊 PEER CONFIGURATION:");
        console.log("=".repeat(30));
        
        const peer = await usd1Adapter.peers(ETHEREUM_EID);
        console.log(`🔗 Ethereum Peer: ${peer}`);
        
        if (peer === "0x" || peer === ethers.ZeroHash) {
            console.log("❌ No peer set for Ethereum!");
            return;
        }
        
        // Check if we can access LayerZero endpoint functions
        const lzEndpoint = await ethers.getContractAt("ILayerZeroEndpointV2", endpoint);
        
        console.log("\n📊 LAYERZERO ENDPOINT INFO:");
        console.log("=".repeat(30));
        
        // Try to get some endpoint info
        try {
            const eid = await lzEndpoint.eid();
            console.log(`📍 Endpoint ID: ${eid}`);
        } catch (error) {
            console.log("⚠️  Could not get endpoint ID");
        }
        
        console.log("\n📊 DELEGATE AND CONFIG:");
        console.log("=".repeat(30));
        
        try {
            const delegate = await usd1Adapter.delegates(signer.address);
            console.log(`🎭 Delegate: ${delegate}`);
        } catch (error) {
            console.log("⚠️  No delegates function or not accessible");
        }
        
        // Check if we need to set enforced options
        console.log("\n📊 CHECKING ENFORCED OPTIONS:");
        console.log("=".repeat(30));
        
        try {
            const enforcedOptions = await usd1Adapter.enforcedOptions(ETHEREUM_EID, 1); // 1 = SEND message type
            console.log(`⚙️ Enforced Options: ${enforcedOptions}`);
        } catch (error) {
            console.log("⚠️  Could not get enforced options");
        }
        
        // Try a very simple operation - check if contract is paused or has any restrictions
        console.log("\n📊 CONTRACT STATE:");
        console.log("=".repeat(30));
        
        try {
            // Try to call a simple view function
            const tokenBalance = await usd1Adapter.balanceOf(signer.address);
            console.log(`💰 OFT Balance: ${ethers.formatUnits(tokenBalance, 18)}`);
        } catch (error) {
            console.log("⚠️  Could not get OFT balance");
        }
        
        // Check the underlying token allowance and balance
        const usd1Token = await ethers.getContractAt("IERC20", token);
        const balance = await usd1Token.balanceOf(signer.address);
        const allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        
        console.log(`💰 USD1 Balance: ${ethers.formatUnits(balance, 18)}`);
        console.log(`🔓 USD1 Allowance: ${ethers.formatUnits(allowance, 18)}`);
        
        // Try to decode the error 0x6592671c
        console.log("\n📊 ERROR CODE ANALYSIS:");
        console.log("=".repeat(30));
        console.log("Error code: 0x6592671c");
        console.log("This might be: InvalidDelegate, NoPeer, or LayerZero config issue");
        
        // Check if there are any missing LayerZero configurations
        console.log("\n🔧 SUGGESTED FIXES:");
        console.log("=".repeat(20));
        console.log("1. Verify peer is properly set ✅");
        console.log("2. Check if enforced options need to be set");
        console.log("3. Verify delegate permissions");
        console.log("4. Check LayerZero endpoint configuration");
        
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
