import { ethers } from "hardhat";

/**
 * Discover the actual interface of the deployed registry contract
 * Instead of assuming it matches IChainRegistry.sol
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";

async function discoverRegistryInterface() {
    console.log("🔍 DISCOVERING ACTUAL REGISTRY INTERFACE");
    console.log("=======================================");
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    
    try {
        // Get the bytecode and look for function selectors
        const bytecode = await ethers.provider.getCode(REGISTRY_ADDRESS);
        console.log(`Bytecode length: ${bytecode.length} characters`);
        
        // Extract function selectors from bytecode
        console.log("\n🔍 Analyzing bytecode for function selectors...");
        
        // Look for PUSH4 instructions (0x63) followed by 4-byte selectors
        const selectors = new Set();
        for (let i = 0; i < bytecode.length - 8; i += 2) {
            if (bytecode.substr(i, 2) === '63') {
                const selector = '0x' + bytecode.substr(i + 2, 8);
                if (selector.length === 10) {
                    selectors.add(selector);
                }
            }
        }
        
        console.log(`Found ${selectors.size} potential function selectors`);
        
        // Common function selectors we know
        const knownSelectors = {
            "0x8da5cb5b": "owner()",
            "0x715018a6": "renounceOwnership()",
            "0xf2fde38b": "transferOwnership(address)",
            "0x8129fc1c": "initialize()",
            "0x158ef93e": "initialized()",
            
            // Registry-like functions
            "0xa6f2ae3a": "getEndpoint()",
            "0x123c5c1c": "getLZEndpoint()", 
            "0x3ccee869": "getEID()",
            "0x35e62d4d": "getChainInfo()",
            
            // Possible setters based on your registry
            "0x1b2ef1ca": "setEndpoint(address)",
            "0x87654321": "configure(address,uint32)",
            "0x4f2c5b1e": "setChainInfo(uint256,uint32,address,bool)",
        };
        
        console.log("\n🎯 Checking known function selectors:");
        const foundFunctions = [];
        
        for (const [selector, signature] of Object.entries(knownSelectors)) {
            if (selectors.has(selector)) {
                console.log(`✅ Found: ${signature} (${selector})`);
                foundFunctions.push({ selector, signature });
            } else {
                console.log(`❌ Not found: ${signature} (${selector})`);
            }
        }
        
        // Test the functions we found
        console.log("\n🧪 Testing discovered functions:");
        
        for (const func of foundFunctions) {
            try {
                const result = await ethers.provider.call({
                    to: REGISTRY_ADDRESS,
                    data: func.selector
                });
                
                if (result !== "0x") {
                    console.log(`✅ ${func.signature}: ${result}`);
                } else {
                    console.log(`⚠️  ${func.signature}: empty result`);
                }
            } catch (error) {
                console.log(`❌ ${func.signature}: ${error.message.substring(0, 50)}`);
            }
        }
        
        // Try to reverse engineer from the EagleShareOFT error
        console.log("\n🔍 Analyzing EagleShareOFT error 0x5cbc9ccc...");
        
        // This error happens in the constructor when calling _getEndpointFromRegistry
        // Let's see what that function is trying to call
        const eagleShareOFTBytecode = await (await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT")).bytecode;
        
        // Look for the getLZEndpoint call in EagleShareOFT bytecode
        console.log("EagleShareOFT tries to call getLZEndpoint() -> 0x123c5c1c");
        
        // Test this specific call
        try {
            const result = await ethers.provider.call({
                to: REGISTRY_ADDRESS,
                data: "0x123c5c1c" // getLZEndpoint()
            });
            console.log(`Registry getLZEndpoint() result: ${result}`);
        } catch (error) {
            console.log(`Registry getLZEndpoint() error: ${error.message}`);
        }
        
        // Maybe the registry expects a different calling pattern
        console.log("\n🔧 Testing alternative calling patterns...");
        
        // Test with msg.sender context (maybe registry checks caller)
        const [deployer] = await ethers.getSigners();
        
        try {
            const result = await ethers.provider.call({
                to: REGISTRY_ADDRESS,
                from: deployer.address,
                data: "0x123c5c1c" // getLZEndpoint()
            });
            console.log(`Registry getLZEndpoint() with sender: ${result}`);
        } catch (error) {
            console.log(`Registry getLZEndpoint() with sender error: ${error.message}`);
        }
        
        // Check if registry has been initialized
        console.log("\n🏁 Checking initialization status...");
        
        const initSelectors = ["0x158ef93e", "0x392e53cd", "0x037f983a"];
        for (const sel of initSelectors) {
            try {
                const result = await ethers.provider.call({
                    to: REGISTRY_ADDRESS,
                    data: sel
                });
                console.log(`Selector ${sel}: ${result}`);
            } catch (error) {
                console.log(`Selector ${sel}: reverted`);
            }
        }
        
    } catch (error) {
        console.log(`❌ Discovery failed: ${error.message}`);
        throw error;
    }
}

discoverRegistryInterface()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
