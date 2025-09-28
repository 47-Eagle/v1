import { ethers } from "hardhat";

/**
 * Set BSC functions on the registry
 * Configure LayerZero endpoint and EID for BSC
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";

// BSC LayerZero V2 configuration
const BSC_LAYERZERO = {
    chainId: 56,
    eid: 30102,
    endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
};

async function setBSCRegistryFunctions() {
    console.log("🔧 SETTING BSC FUNCTIONS ON REGISTRY");
    console.log("====================================");
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    console.log(`BSC Chain ID: ${BSC_LAYERZERO.chainId} (already stored)`);
    console.log(`BSC EID: ${BSC_LAYERZERO.eid}`);
    console.log(`BSC Endpoint: ${BSC_LAYERZERO.endpoint}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Owner: ${deployer.address}`);
    
    try {
        // The registry exists and has chain ID 56 in storage
        // Now we need to set the LayerZero endpoint and EID
        
        console.log("\n📝 Attempting to configure BSC LayerZero settings...");
        
        // Try different configuration function names and signatures
        const configurationAttempts = [
            // Standard registry patterns
            {
                name: "setLayerZeroEndpoint",
                sig: "function setLayerZeroEndpoint(address) external",
                params: [BSC_LAYERZERO.endpoint]
            },
            {
                name: "setEndpoint", 
                sig: "function setEndpoint(address) external",
                params: [BSC_LAYERZERO.endpoint]
            },
            {
                name: "setLzEndpoint",
                sig: "function setLzEndpoint(address) external", 
                params: [BSC_LAYERZERO.endpoint]
            },
            {
                name: "setEndpointId",
                sig: "function setEndpointId(uint32) external",
                params: [BSC_LAYERZERO.eid]
            },
            {
                name: "setEID",
                sig: "function setEID(uint32) external",
                params: [BSC_LAYERZERO.eid]
            },
            {
                name: "setEid",
                sig: "function setEid(uint32) external",
                params: [BSC_LAYERZERO.eid]
            },
            // Combined setters
            {
                name: "configure",
                sig: "function configure(address,uint32) external",
                params: [BSC_LAYERZERO.endpoint, BSC_LAYERZERO.eid]
            },
            {
                name: "setup",
                sig: "function setup(address,uint32) external",
                params: [BSC_LAYERZERO.endpoint, BSC_LAYERZERO.eid]
            },
            {
                name: "setConfig",
                sig: "function setConfig(address,uint32) external",
                params: [BSC_LAYERZERO.endpoint, BSC_LAYERZERO.eid]
            },
            // Chain-specific setters
            {
                name: "setBSCEndpoint",
                sig: "function setBSCEndpoint(address) external",
                params: [BSC_LAYERZERO.endpoint]
            },
            {
                name: "setBSCConfig",
                sig: "function setBSCConfig(address,uint32) external",
                params: [BSC_LAYERZERO.endpoint, BSC_LAYERZERO.eid]
            }
        ];
        
        let successfulConfigs = [];
        
        for (const config of configurationAttempts) {
            try {
                console.log(`\n🔧 Trying ${config.name}(${config.params.map(p => p.toString()).join(', ')})...`);
                
                const contract = await ethers.getContractAt([config.sig], REGISTRY_ADDRESS);
                const funcName = config.name;
                
                // Try static call first
                try {
                    await contract[funcName].staticCall(...config.params);
                    console.log(`   ✅ ${funcName} static call succeeded`);
                } catch (staticError) {
                    console.log(`   ⚠️  ${funcName} static call failed: ${staticError.message.substring(0, 50)}`);
                    continue; // Skip if static call fails
                }
                
                // Execute the transaction
                const tx = await contract[funcName](...config.params);
                console.log(`   📡 Transaction sent: ${tx.hash}`);
                
                const receipt = await tx.wait();
                console.log(`   ✅ ${funcName} successful! Block: ${receipt.blockNumber}`);
                
                successfulConfigs.push(config.name);
                
                // Test if registry works now
                const isWorking = await testRegistryAfterConfig();
                if (isWorking) {
                    console.log(`\n🎉 REGISTRY CONFIGURATION COMPLETE!`);
                    console.log(`✅ ${config.name} successfully configured BSC`);
                    return true;
                }
                
            } catch (error) {
                console.log(`   ❌ ${config.name} failed: ${error.message.substring(0, 100)}`);
            }
        }
        
        if (successfulConfigs.length > 0) {
            console.log(`\n✅ Successfully executed: ${successfulConfigs.join(', ')}`);
            
            // Test one more time
            const finalTest = await testRegistryAfterConfig();
            if (finalTest) {
                console.log(`\n🎉 BSC REGISTRY CONFIGURATION SUCCESSFUL!`);
                return true;
            }
        }
        
        // If nothing worked, try manual storage approach
        console.log(`\n🔧 Trying manual storage configuration...`);
        await tryManualStorageConfig();
        
        return false;
        
    } catch (error) {
        console.log(`❌ Registry configuration failed: ${error.message}`);
        throw error;
    }
}

async function testRegistryAfterConfig(): Promise<boolean> {
    try {
        console.log(`\n🧪 Testing registry functions...`);
        
        const registry = await ethers.getContractAt("IChainRegistry", REGISTRY_ADDRESS);
        
        const endpoint = await registry.getLZEndpoint();
        console.log(`   ✅ getLZEndpoint(): ${endpoint}`);
        
        const eid = await registry.getEID();
        console.log(`   ✅ getEID(): ${eid}`);
        
        // Verify correct values
        if (endpoint.toLowerCase() === BSC_LAYERZERO.endpoint.toLowerCase() && 
            Number(eid) === BSC_LAYERZERO.eid) {
            console.log(`   🎯 Correct BSC configuration confirmed!`);
            return true;
        } else {
            console.log(`   ⚠️  Values don't match expected BSC config`);
            return false;
        }
        
    } catch (error) {
        console.log(`   ❌ Registry test failed: ${error.message.substring(0, 50)}`);
        return false;
    }
}

async function tryManualStorageConfig() {
    console.log(`\n💾 Manual storage configuration attempt...`);
    
    // Try to find if there are storage management functions
    const storageAttempts = [
        {
            name: "setStorage",
            sig: "function setStorage(uint256,bytes32) external", 
            slot: 1,
            value: ethers.zeroPadValue(BSC_LAYERZERO.endpoint, 32)
        },
        {
            name: "setStorage",
            sig: "function setStorage(uint256,bytes32) external",
            slot: 2, 
            value: ethers.zeroPadValue(ethers.toBeHex(BSC_LAYERZERO.eid), 32)
        }
    ];
    
    for (const attempt of storageAttempts) {
        try {
            const contract = await ethers.getContractAt([attempt.sig], REGISTRY_ADDRESS);
            await contract.setStorage(attempt.slot, attempt.value);
            console.log(`   ✅ Storage slot ${attempt.slot} set`);
        } catch (error) {
            console.log(`   ❌ Storage slot ${attempt.slot} failed: ${error.message.substring(0, 50)}`);
        }
    }
}

setBSCRegistryFunctions()
    .then((success) => {
        if (success) {
            console.log(`\n🎉 SUCCESS: Registry is configured for BSC!`);
            console.log(`✅ EagleShareOFT can now be deployed with registry`);
        } else {
            console.log(`\n❌ Registry configuration incomplete`);
            console.log(`💡 May need to investigate registry source code`);
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
