import { ethers } from "hardhat";

/**
 * Configure the REAL registry using the actual ABI
 * Registry: 0x472656c76f45e8a8a63fffd32ab5888898eea91e
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";

// BSC Configuration
const BSC_CONFIG = {
    chainId: 56,
    eid: 30102,
    endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    name: "BSC",
    wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    symbol: "WBNB"
};

// Real registry ABI (from user)
const REAL_REGISTRY_ABI = [
    "function owner() external view returns (address)",
    "function getCurrentChainId() external view returns (uint16)",
    "function getLayerZeroEndpoint(uint16 _chainId) external view returns (address)",
    "function getEidForChainId(uint256 _chainId) external view returns (uint32)",
    "function isChainSupported(uint16 _chainId) external view returns (bool)",
    "function setLayerZeroEndpoint(uint16 _chainId, address _endpoint) external",
    "function setChainIdToEid(uint256 _chainId, uint32 _eid) external",
    "function registerChain(uint16 _chainId, string _chainName, address _wrappedNativeToken, string _wrappedNativeSymbol, bool _isActive) external",
    "function setChainStatus(uint16 _chainId, bool _isActive) external"
];

async function configureRealRegistry() {
    console.log("🔧 CONFIGURING REAL REGISTRY WITH ACTUAL ABI");
    console.log("============================================");
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    console.log(`BSC Chain ID: ${BSC_CONFIG.chainId} (uint16)`);
    console.log(`BSC EID: ${BSC_CONFIG.eid}`);
    console.log(`BSC Endpoint: ${BSC_CONFIG.endpoint}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Connect to registry with real ABI
        const registry = await ethers.getContractAt(REAL_REGISTRY_ABI, REGISTRY_ADDRESS);
        
        // Check current state
        console.log("\n🔍 Current Registry State:");
        
        const owner = await registry.owner();
        console.log(`   Owner: ${owner}`);
        
        const currentChainId = await registry.getCurrentChainId();
        console.log(`   Current Chain ID: ${currentChainId}`);
        
        const isSupported = await registry.isChainSupported(BSC_CONFIG.chainId);
        console.log(`   BSC Supported: ${isSupported}`);
        
        if (isSupported) {
            try {
                const endpoint = await registry.getLayerZeroEndpoint(BSC_CONFIG.chainId);
                console.log(`   BSC Endpoint: ${endpoint}`);
            } catch (e) {
                console.log(`   BSC Endpoint: Not set`);
            }
            
            try {
                const eid = await registry.getEidForChainId(BSC_CONFIG.chainId);
                console.log(`   BSC EID: ${eid}`);
            } catch (e) {
                console.log(`   BSC EID: Not set`);
            }
        }
        
        // Configure BSC
        console.log("\n🚀 Configuring BSC on Registry:");
        
        // 1. Register BSC chain if not already registered
        if (!isSupported) {
            console.log("\n1️⃣ Registering BSC chain...");
            const registerTx = await registry.registerChain(
                BSC_CONFIG.chainId,
                BSC_CONFIG.name,
                BSC_CONFIG.wrappedNative,
                BSC_CONFIG.symbol,
                true // isActive
            );
            await registerTx.wait();
            console.log(`   ✅ BSC chain registered: ${registerTx.hash}`);
        } else {
            console.log("   ✅ BSC chain already registered");
        }
        
        // 2. Set LayerZero endpoint
        console.log("\n2️⃣ Setting LayerZero endpoint...");
        const endpointTx = await registry.setLayerZeroEndpoint(
            BSC_CONFIG.chainId,
            BSC_CONFIG.endpoint
        );
        await endpointTx.wait();
        console.log(`   ✅ BSC endpoint set: ${endpointTx.hash}`);
        
        // 3. Set Chain ID to EID mapping
        console.log("\n3️⃣ Setting Chain ID to EID mapping...");
        const eidTx = await registry.setChainIdToEid(
            BSC_CONFIG.chainId,
            BSC_CONFIG.eid
        );
        await eidTx.wait();
        console.log(`   ✅ BSC EID mapping set: ${eidTx.hash}`);
        
        // 4. Verify configuration
        console.log("\n✅ VERIFICATION:");
        
        const finalEndpoint = await registry.getLayerZeroEndpoint(BSC_CONFIG.chainId);
        console.log(`   BSC Endpoint: ${finalEndpoint}`);
        
        const finalEid = await registry.getEidForChainId(BSC_CONFIG.chainId);
        console.log(`   BSC EID: ${finalEid}`);
        
        if (finalEndpoint.toLowerCase() === BSC_CONFIG.endpoint.toLowerCase() && 
            Number(finalEid) === BSC_CONFIG.eid) {
            console.log("\n🎉 BSC REGISTRY CONFIGURATION SUCCESSFUL!");
            console.log("✅ Registry is now properly configured for BSC");
            
            // Test if EagleShareOFT can work now
            console.log("\n🧪 Testing EagleShareOFT compatibility...");
            await testEagleShareOFTCompatibility();
            
        } else {
            console.log("\n❌ Configuration verification failed");
        }
        
    } catch (error) {
        console.log(`❌ Registry configuration failed: ${error.message}`);
        throw error;
    }
}

async function testEagleShareOFTCompatibility() {
    try {
        // The issue is that EagleShareOFT expects different function signatures
        // We need to update the interface, but let's test what we have
        
        console.log("   🔧 EagleShareOFT expects:");
        console.log("      - getLZEndpoint() -> but registry has getLayerZeroEndpoint(uint16)");  
        console.log("      - getEID() -> but registry has getEidForChainId(uint256)");
        
        console.log("\n   💡 SOLUTION: Update IChainRegistry.sol interface to match real registry");
        console.log("      OR create adapter functions in the registry contract");
        
    } catch (error) {
        console.log(`   ❌ Compatibility test failed: ${error.message}`);
    }
}

configureRealRegistry()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
