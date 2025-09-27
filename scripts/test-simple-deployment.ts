import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Simple test deployment to debug the CREATE2 factory issue
 */
async function testSimpleDeployment() {
    console.log("🧪 TESTING CREATE2 FACTORY DEPLOYMENT");
    console.log("====================================");

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    try {
        // Test 1: Try deploying a very simple contract first
        console.log("🧪 Test 1: Simple Contract Deployment");
        console.log("====================================");
        
        // Use a simple test salt
        const testSalt = ethers.keccak256(ethers.toUtf8Bytes("test123"));
        console.log(`🔑 Test Salt: ${testSalt}`);

        const factory = await ethers.getContractAt("ICREATE2Factory", process.env.EAGLE_CREATE2_FACTORY!);
        
        // Try to get a very simple contract (just to test the factory)
        const SimpleStorage = await ethers.getContractFactory("EagleShareOFTTest");  // Use existing contract
        
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            ["Test", "TEST", process.env.ETHEREUM_LZ_ENDPOINT_V2!, deployer.address]
        );
        
        const bytecode = SimpleStorage.bytecode + constructorArgs.slice(2);
        console.log(`📏 Bytecode Length: ${bytecode.length / 2 - 1} bytes`);

        // Predict address first
        const predictedAddress = ethers.getCreate2Address(
            process.env.EAGLE_CREATE2_FACTORY!,
            testSalt,
            ethers.keccak256(bytecode)
        );
        
        console.log(`🎯 Predicted Address: ${predictedAddress}`);
        
        // Check if already deployed
        const existingCode = await ethers.provider.getCode(predictedAddress);
        if (existingCode !== "0x") {
            console.log("⚠️ Test contract already deployed at predicted address");
            return { success: true, alreadyDeployed: true };
        }

        console.log("🚀 Attempting deployment...");
        const tx = await factory.deploy(testSalt, bytecode, {
            gasLimit: 2500000,  // Lower gas limit
            maxFeePerGas: ethers.parseUnits("2", "gwei"),      // Ultra-low gas
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei")  // Minimal priority
        });

        console.log(`⏳ Transaction: ${tx.hash}`);
        const receipt = await tx.wait();
        
        console.log(`✅ TEST DEPLOYMENT SUCCESS!`);
        console.log(`📍 Address: ${predictedAddress}`);
        console.log(`⛽ Gas Used: ${receipt?.gasUsed.toLocaleString()}`);
        
        return { success: true, testAddress: predictedAddress };

    } catch (error: any) {
        console.error(`❌ Test failed: ${error.message}`);
        
        if (error.message.includes("already deployed") || error.message.includes("salt")) {
            console.log("💡 Salt might already be used - this is common with CREATE2");
        } else if (error.message.includes("insufficient funds")) {
            console.log("💡 Need more ETH for gas");
        } else if (error.message.includes("owner") || error.message.includes("permission")) {
            console.log("💡 Factory might have ownership restrictions");
        }
        
        return { success: false, error: error.message };
    }
}

testSimpleDeployment().catch(console.error);
