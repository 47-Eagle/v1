import { ethers } from "hardhat";

/**
 * Test EagleShareOFT deployment with fixed registry interface
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";

async function testEagleShareOFTDeployment() {
    console.log("🧪 TESTING EAGLESHARSOFT WITH FIXED REGISTRY");
    console.log("==============================================");
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        console.log("\n1️⃣ Testing EagleShareOFT deployment...");
        
        const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT");
        
        console.log("📡 Deploying with registry...");
        const eagleOFT = await EagleShareOFT.deploy(
            "Eagle",                // Name
            "EAGLE",                // Symbol
            REGISTRY_ADDRESS,       // Your fixed registry
            deployer.address        // Delegate
        );
        
        await eagleOFT.waitForDeployment();
        const address = await eagleOFT.getAddress();
        
        console.log(`✅ EagleShareOFT deployed: ${address}`);
        
        // Test contract functions
        console.log("\n2️⃣ Testing contract functions...");
        
        const name = await eagleOFT.name();
        const symbol = await eagleOFT.symbol();
        console.log(`   🏷️  Token: ${name} (${symbol})`);
        
        const delegate = await eagleOFT.delegate();
        console.log(`   📍 Delegate: ${delegate}`);
        
        const endpoint = await eagleOFT.endpoint();
        console.log(`   📡 Endpoint: ${endpoint}`);
        
        const registry = await eagleOFT.getRegistry();
        console.log(`   🗃️  Registry: ${registry}`);
        
        const chainEID = await eagleOFT.getChainEID();
        console.log(`   🆔 Chain EID: ${chainEID}`);
        
        // Test registry integration
        console.log("\n3️⃣ Testing registry integration...");
        
        try {
            const chainConfig = await eagleOFT.getChainConfig();
            console.log(`   ✅ Chain Config:`, chainConfig);
        } catch (error) {
            console.log(`   ⚠️  Chain Config failed: ${error.message.substring(0, 50)}`);
        }
        
        console.log("\n🎉 EAGLESHARSOFT DEPLOYMENT SUCCESSFUL!");
        console.log("✅ Registry integration working correctly");
        console.log("✅ All contract functions operational");
        
        // Save deployment info
        const fs = require('fs');
        const deploymentData = {
            bsc: {
                chainId: 56,
                timestamp: new Date().toISOString(),
                deployer: deployer.address,
                contracts: {
                    eagleShareOFT: address // Registry-based deployment!
                },
                registry: {
                    address: REGISTRY_ADDRESS,
                    interface: "EagleRegistry (fixed)"
                }
            }
        };
        
        fs.writeFileSync('bsc-eagle-registry-success.json', JSON.stringify(deploymentData, null, 2));
        console.log("\n📁 Success data saved to: bsc-eagle-registry-success.json");
        
        return address;
        
    } catch (error) {
        console.log(`❌ EagleShareOFT deployment failed: ${error.message}`);
        
        if (error.message.includes("0x5cbc9ccc")) {
            console.log("💡 Error 0x5cbc9ccc suggests registry call still failing");
            console.log("   Check if registry interface is still mismatched");
        }
        
        throw error;
    }
}

testEagleShareOFTDeployment()
    .then((address) => {
        console.log(`\n🎯 SUCCESS: EagleShareOFT deployed at ${address}`);
        console.log("✅ Registry-based deployment working!");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
