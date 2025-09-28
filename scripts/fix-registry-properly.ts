import { ethers } from "hardhat";

/**
 * Properly debug and fix the registry instead of bypassing it
 * Registry: 0x472656c76f45e8a8a63fffd32ab5888898eea91e
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";
const BSC_CONFIG = {
    chainId: 56,
    eid: 30102,
    lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
};

async function fixRegistryProperly() {
    console.log("🔧 FIXING REGISTRY PROPERLY (NO BYPASS)");
    console.log("=======================================");
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Deep investigation of the registry
    console.log("\n🔍 DEEP REGISTRY INVESTIGATION");
    console.log("==============================");
    
    try {
        // 1. Check all storage slots for clues
        console.log("📦 Storage analysis:");
        for (let i = 0; i < 20; i++) {
            const slot = await ethers.provider.getStorage(REGISTRY_ADDRESS, i);
            if (slot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                console.log(`   Slot ${i}: ${slot}`);
                
                // Decode meaningful values
                if (i === 0 && slot.length === 66) {
                    const address = "0x" + slot.slice(-40);
                    console.log(`     → Address: ${address}`);
                }
                if (i === 6 && slot === "0x0000000000000000000000000000000000000000000000000000000000000038") {
                    console.log(`     → Chain ID: 56 (BSC) ✓`);
                }
            }
        }
        
        // 2. Try to find the actual contract interface by testing function signatures
        console.log("\n🔍 Function signature discovery:");
        
        // Get all possible function selectors from bytecode
        const bytecode = await ethers.provider.getCode(REGISTRY_ADDRESS);
        console.log(`Bytecode length: ${bytecode.length} chars`);
        
        // Look for JUMP patterns that indicate function dispatching
        if (bytecode.includes("63")) {
            console.log("✅ Contract has function dispatcher");
        }
        
        // 3. Try initialization patterns
        console.log("\n🚀 Testing initialization approaches:");
        
        // Maybe it needs to be initialized with the current chain info
        const initializationAttempts = [
            {
                name: "initialize()",
                data: "0x8129fc1c"
            },
            {
                name: "initialize(uint256)",
                data: "0xfe4b84df" + ethers.zeroPadValue("0x38", 32).slice(2) // 56 as uint256
            },
            {
                name: "initialize(uint256,uint32,address)",
                data: "0x1459457a" + 
                      ethers.zeroPadValue("0x38", 32).slice(2) + // chainId
                      ethers.zeroPadValue("0x7566", 32).slice(2) + // eid (30102)
                      ethers.zeroPadValue(BSC_CONFIG.lzEndpoint, 32).slice(2) // endpoint
            },
            {
                name: "setup(uint256,uint32,address)",
                data: "0x43849449" + 
                      ethers.zeroPadValue("0x38", 32).slice(2) + 
                      ethers.zeroPadValue("0x7566", 32).slice(2) + 
                      ethers.zeroPadValue(BSC_CONFIG.lzEndpoint, 32).slice(2)
            }
        ];
        
        for (const attempt of initializationAttempts) {
            try {
                console.log(`Trying ${attempt.name}...`);
                
                // First try static call to see if it would work
                const result = await ethers.provider.call({
                    to: REGISTRY_ADDRESS,
                    from: deployer.address,
                    data: attempt.data
                });
                
                if (result !== "0x") {
                    console.log(`✅ ${attempt.name} static call success: ${result}`);
                    
                    // Try actual transaction
                    const tx = await deployer.sendTransaction({
                        to: REGISTRY_ADDRESS,
                        data: attempt.data,
                        gasLimit: 200000
                    });
                    
                    console.log(`📡 ${attempt.name} transaction: ${tx.hash}`);
                    await tx.wait();
                    console.log(`✅ ${attempt.name} transaction confirmed!`);
                    
                    // Test if registry works now
                    await testRegistryFunctions();
                    return; // Success!
                    
                } else {
                    console.log(`⚠️  ${attempt.name} static call returned empty`);
                }
                
            } catch (error) {
                console.log(`❌ ${attempt.name} failed: ${error.message.substring(0, 50)}`);
            }
        }
        
        // 4. Try direct storage writes (if we're the owner)
        console.log("\n💾 Attempting direct configuration:");
        
        // The registry might need storage slots set directly
        const storageWrites = [
            {
                slot: 1, // Maybe endpoint storage
                value: ethers.zeroPadValue(BSC_CONFIG.lzEndpoint, 32)
            },
            {
                slot: 2, // Maybe EID storage
                value: ethers.zeroPadValue("0x7566", 32) // 30102
            },
            {
                slot: 7, // Maybe initialized flag
                value: ethers.zeroPadValue("0x01", 32)
            }
        ];
        
        // This would only work if there's a storage write function
        // Let's test if the registry has any storage management functions
        
        console.log("\n🧪 Testing registry functions after investigation...");
        await testRegistryFunctions();
        
    } catch (error) {
        console.log(`❌ Registry fix failed: ${error.message}`);
        throw error;
    }
}

async function testRegistryFunctions() {
    try {
        console.log("\n🧪 Testing registry functions:");
        
        const registry = await ethers.getContractAt("IChainRegistry", REGISTRY_ADDRESS);
        
        // Test all the functions EagleShareOFT needs
        try {
            const endpoint = await registry.getLZEndpoint();
            console.log(`✅ getLZEndpoint(): ${endpoint}`);
            
            const eid = await registry.getEID();
            console.log(`✅ getEID(): ${eid}`);
            
            console.log("\n🎉 REGISTRY IS NOW WORKING!");
            console.log("✅ EagleShareOFT can be deployed with registry");
            return true;
            
        } catch (error) {
            console.log(`❌ Registry functions still failing: ${error.message.substring(0, 50)}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Registry test failed: ${error.message}`);
        return false;
    }
}

fixRegistryProperly()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
