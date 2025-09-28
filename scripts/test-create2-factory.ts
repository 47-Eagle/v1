import { ethers } from "hardhat";

/**
 * Test CREATE2 Factory Functionality
 */

const CREATE2_FACTORY = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";

async function testFactory() {
    console.log("🧪 TESTING CREATE2 FACTORY");
    console.log("===========================");
    
    const [deployer] = await ethers.getSigners();
    
    console.log(`📍 Deployer: ${deployer.address}`);
    console.log(`📍 Factory: ${CREATE2_FACTORY}\n`);
    
    // Check if factory exists
    const factoryCode = await ethers.provider.getCode(CREATE2_FACTORY);
    if (factoryCode === "0x") {
        throw new Error("Factory not found");
    }
    console.log("✅ Factory contract exists");
    
    // Try to get factory interface
    const factory = await ethers.getContractAt("ICREATE2Factory", CREATE2_FACTORY);
    
    try {
        const owner = await factory.owner();
        console.log(`✅ Factory owner: ${owner}`);
        
        const isAuthorized = await factory.isAuthorized(deployer.address);
        console.log(`✅ Deployer authorized: ${isAuthorized}`);
        
        if (!isAuthorized) {
            console.log("❌ Deployer not authorized to use factory");
            console.log("   This is likely why deployment is failing");
            
            if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                console.log("   But you are the owner, so there might be another issue");
            } else {
                console.log("   You need authorization from the owner:", owner);
            }
            return;
        }
        
    } catch (error) {
        console.log(`❌ Error calling factory methods: ${error}`);
        console.log("   Factory interface might not match");
        return;
    }
    
    // Test with a simple contract deployment
    console.log("\n🧪 Testing simple contract deployment...");
    
    try {
        // Use MockERC20 as a test
        const TestContract = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
        
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string"],
            ["Test Token", "TEST"]
        );
        
        const fullBytecode = ethers.concat([
            TestContract.bytecode,
            constructorArgs
        ]);
        
        console.log(`   Bytecode length: ${fullBytecode.length / 2 - 1} bytes`);
        
        const testSalt = "0x0000000000000000000000000000000000000000000000000000000000001234";
        console.log(`   Test salt: ${testSalt}`);
        
        // Calculate predicted address
        const bytecodeHash = ethers.keccak256(fullBytecode);
        const predictedAddress = ethers.getCreate2Address(
            CREATE2_FACTORY,
            testSalt,
            bytecodeHash
        );
        console.log(`   Predicted address: ${predictedAddress}`);
        
        // Check if already exists
        const existingCode = await ethers.provider.getCode(predictedAddress);
        if (existingCode !== "0x") {
            console.log("   ⚠️ Address already has contract, trying different salt");
            const altSalt = "0x0000000000000000000000000000000000000000000000000000000000005678";
            const altPredicted = ethers.getCreate2Address(CREATE2_FACTORY, altSalt, bytecodeHash);
            const altExisting = await ethers.provider.getCode(altPredicted);
            
            if (altExisting !== "0x") {
                console.log("   ⚠️ Multiple salts have existing contracts");
                return;
            }
            
            // Use alt salt
            console.log(`   Using alternative salt: ${altSalt}`);
            console.log(`   Alternative address: ${altPredicted}`);
            
            const deployTx = await factory.deploy(altSalt, fullBytecode);
            const receipt = await deployTx.wait();
            
            console.log(`   ✅ Test deployment successful!`);
            console.log(`   Transaction: ${receipt?.hash}`);
            console.log(`   Address: ${altPredicted}`);
            
        } else {
            // Deploy with original salt
            const deployTx = await factory.deploy(testSalt, fullBytecode);
            const receipt = await deployTx.wait();
            
            console.log(`   ✅ Test deployment successful!`);
            console.log(`   Transaction: ${receipt?.hash}`);
            console.log(`   Address: ${predictedAddress}`);
        }
        
        console.log("\n🎉 CREATE2 FACTORY IS WORKING!");
        console.log("   The issue might be with the specific contract or salt");
        
    } catch (error) {
        console.error(`❌ Test deployment failed: ${error}`);
        
        if (error.toString().includes("execution reverted")) {
            console.log("\n🔍 Possible reasons for revert:");
            console.log("   1. Salt already used for different bytecode");
            console.log("   2. Contract constructor is failing");
            console.log("   3. Bytecode too large");
            console.log("   4. Factory has additional restrictions");
        }
    }
}

testFactory()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Factory test failed:", error);
        process.exit(1);
    });
