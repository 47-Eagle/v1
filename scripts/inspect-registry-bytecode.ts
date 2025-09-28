import { ethers } from "hardhat";

/**
 * Inspect registry contract to understand its actual interface
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";

async function inspectRegistry() {
    console.log("🔍 INSPECTING REGISTRY CONTRACT");
    console.log("================================");
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    
    try {
        // Get contract bytecode
        const bytecode = await ethers.provider.getCode(REGISTRY_ADDRESS);
        console.log(`Bytecode size: ${bytecode.length} characters`);
        console.log(`Bytecode (first 100 chars): ${bytecode.substring(0, 100)}...`);
        
        // Try common function selectors
        const commonSelectors = [
            // Standard functions
            { name: "owner()", selector: "0x8da5cb5b" },
            { name: "initialize()", selector: "0x8129fc1c" },
            { name: "initialized()", selector: "0x158ef93e" },
            
            // Registry-like functions
            { name: "getChainInfo()", selector: "0x35e62d4d" },
            { name: "getLZEndpoint()", selector: "0x123c5c1c" },
            { name: "getEID()", selector: "0x3ccee869" },
            { name: "setChainInfo(uint256,uint32,address,bool)", selector: "0x4f2c5b1e" },
            
            // Common registry patterns
            { name: "register(uint256,uint32,address)", selector: "0x7b103999" },
            { name: "addChain(uint256,address)", selector: "0x12345678" },
            { name: "configureChain(uint256,uint32,address)", selector: "0x87654321" },
        ];
        
        console.log("\n🔍 Testing function selectors...");
        
        for (const func of commonSelectors) {
            try {
                const data = func.selector + "0".repeat(64); // Pad with zeros
                const result = await ethers.provider.call({
                    to: REGISTRY_ADDRESS,
                    data: data
                });
                
                if (result !== "0x") {
                    console.log(`✅ ${func.name}: ${result}`);
                } else {
                    console.log(`⚠️  ${func.name}: empty response`);
                }
            } catch (error) {
                console.log(`❌ ${func.name}: ${error.message.substring(0, 100)}`);
            }
        }
        
        // Try to get storage slots
        console.log("\n🔍 Checking storage slots...");
        for (let i = 0; i < 10; i++) {
            try {
                const slot = await ethers.provider.getStorage(REGISTRY_ADDRESS, i);
                if (slot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    console.log(`Storage slot ${i}: ${slot}`);
                }
            } catch (error) {
                console.log(`Error reading slot ${i}: ${error.message}`);
            }
        }
        
        // Check if it's a proxy
        console.log("\n🔍 Checking if it's a proxy contract...");
        try {
            // Standard proxy storage slot for implementation
            const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
            const implementation = await ethers.provider.getStorage(REGISTRY_ADDRESS, implSlot);
            if (implementation !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                console.log(`📡 Proxy implementation: 0x${implementation.slice(-40)}`);
                
                // Try to inspect the implementation
                const implAddress = "0x" + implementation.slice(-40);
                const implBytecode = await ethers.provider.getCode(implAddress);
                console.log(`Implementation bytecode size: ${implBytecode.length} characters`);
            } else {
                console.log("Not a standard EIP-1967 proxy");
            }
        } catch (error) {
            console.log("Error checking proxy:", error.message);
        }
        
        // Try different initialization patterns
        console.log("\n🔧 Testing initialization patterns...");
        
        const [deployer] = await ethers.getSigners();
        
        try {
            // Try empty initialize call
            const initData = "0x8129fc1c"; // initialize()
            const gasEstimate = await ethers.provider.estimateGas({
                to: REGISTRY_ADDRESS,
                from: deployer.address,
                data: initData
            });
            console.log(`✅ initialize() gas estimate: ${gasEstimate}`);
            
            // Could be ready to initialize
            console.log("💡 Registry may need initialization first!");
            
        } catch (error) {
            console.log(`❌ initialize() failed: ${error.message.substring(0, 100)}`);
        }
        
    } catch (error) {
        console.log(`❌ Inspection failed: ${error.message}`);
    }
}

inspectRegistry()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
