import { ethers } from "hardhat";

/**
 * @title Check LayerZero Status
 * @notice Verify current LayerZero configuration and try alternatives
 */

async function main() {
    console.log("🔍 CHECKING LAYERZERO STATUS");
    console.log("=".repeat(35));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const ETHEREUM_EID = 30101;
    
    try {
        console.log("\n📊 CURRENT CONFIGURATION STATUS:");
        
        const usd1Adapter = await ethers.getContractAt([
            "function owner() external view returns (address)",
            "function peers(uint32) external view returns (bytes32)",
            "function endpoint() external view returns (address)"
        ], BSC_USD1_ADAPTER);
        
        const endpoint = await ethers.getContractAt([
            "function getConfig(address,address,uint32,uint32) external view returns (bytes)",
            "function defaultSendLibrary(uint32) external view returns (address)",
            "function defaultReceiveLibrary(uint32) external view returns (address)"
        ], LZ_ENDPOINT);
        
        // Check basic configuration
        const owner = await usd1Adapter.owner();
        const peer = await usd1Adapter.peers(ETHEREUM_EID);
        const endpointAddr = await usd1Adapter.endpoint();
        
        console.log(`👑 Owner: ${owner}`);
        console.log(`🔗 Ethereum peer: ${peer}`);
        console.log(`📡 Endpoint: ${endpointAddr}`);
        console.log(`✅ Is owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
        console.log(`✅ Has peer: ${peer !== "0x" && peer !== ethers.ZeroHash}`);
        
        // Check libraries
        const sendLib = await endpoint.defaultSendLibrary(ETHEREUM_EID);
        const receiveLib = await endpoint.defaultReceiveLibrary(ETHEREUM_EID);
        console.log(`📚 Send library: ${sendLib}`);
        console.log(`📚 Receive library: ${receiveLib}`);
        
        // Try to read current config
        try {
            const currentConfig = await endpoint.getConfig(BSC_USD1_ADAPTER, sendLib, ETHEREUM_EID, 2);
            console.log(`⚙️ Current config length: ${currentConfig.length} bytes`);
        } catch (configError) {
            console.log(`⚠️ Could not read config: ${configError.message}`);
        }
        
        console.log("\n🧪 ALTERNATIVE APPROACHES:");
        console.log("=".repeat(30));
        
        console.log("1. Reset to LayerZero defaults");
        console.log("2. Use LayerZero's built-in DVN selection"); 
        console.log("3. Try different OFT interface");
        console.log("4. Wait for configuration propagation");
        
        // Let's try checking if there are other functions available
        console.log("\n📋 CHECKING AVAILABLE FUNCTIONS:");
        
        try {
            // Try to see if there are other send functions
            const oftAdapter = await ethers.getContractAt([
                "function send(tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes),tuple(address,address),bytes) external payable",
                "function quoteSend(tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes),bool) external view returns (tuple(uint256,uint256))",
                "function sendToken(uint32,bytes32,uint256) external payable",
                "function token() external view returns (address)"
            ], BSC_USD1_ADAPTER);
            
            const tokenAddr = await oftAdapter.token();
            console.log(`🪙 Underlying token: ${tokenAddr}`);
            
            console.log("✅ Available interfaces:");
            console.log("  - send() (complex LayerZero)");
            console.log("  - sendToken() (simple)"); 
            console.log("  - quoteSend() (fee estimation)");
            
        } catch (interfaceError) {
            console.log(`⚠️ Interface check failed: ${interfaceError.message}`);
        }
        
        console.log("\n💡 RECOMMENDATIONS:");
        console.log("=".repeat(20));
        console.log("Since manual DVN config isn't working:");
        console.log("1. Try LayerZero's automatic configuration");
        console.log("2. Check if OFT needs to be re-deployed with proper config");
        console.log("3. Use LayerZero's official tooling (lz:oapp:wire)");
        console.log("4. Contact LayerZero support for V2 configuration issues");
        
        console.log("\n🎯 IMMEDIATE OPTIONS:");
        console.log("- Wait 30+ minutes for config propagation");
        console.log("- Try deposits on a different time/day");
        console.log("- Use LayerZero testnet first to verify setup");
        
    } catch (error: any) {
        console.log(`❌ Status check error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
