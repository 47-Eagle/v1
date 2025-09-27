import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Calculate bytecode hash for EagleShareOFTTest contract
 */
async function calculateTestBytecodeHash() {
    console.log("🔨 CALCULATING TEST CONTRACT BYTECODE HASH");
    console.log("==========================================");

    const [deployer] = await ethers.getSigners();
    
    // Test contract parameters (identical to deployment script)
    const params = {
        name: "Eagle Vault Shares",
        symbol: "EAGLE", 
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E",
        delegate: deployer.address
    };

    console.log("📋 Contract Parameters:");
    console.log(`   ├─ Name: "${params.name}"`);
    console.log(`   ├─ Symbol: "${params.symbol}"`);
    console.log(`   ├─ Registry: ${params.registry}`);
    console.log(`   └─ Delegate: ${params.delegate}\n`);

    try {
        // Get test contract factory and bytecode
        const EagleTest = await ethers.getContractFactory("EagleShareOFTTest");
        
        // Encode constructor arguments
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [params.name, params.symbol, params.registry, params.delegate]
        );

        // Combine bytecode + constructor args
        const fullBytecode = EagleTest.bytecode + constructorArgs.slice(2);
        
        // Calculate hash
        const bytecodeHash = ethers.keccak256(fullBytecode);
        
        console.log("📊 BYTECODE ANALYSIS:");
        console.log("=====================");
        console.log(`📦 Base Bytecode: ${EagleTest.bytecode.slice(0, 20)}...${EagleTest.bytecode.slice(-20)}`);
        console.log(`📝 Constructor Args: ${constructorArgs.slice(0, 20)}...${constructorArgs.slice(-20)}`);
        console.log(`📏 Full Length: ${fullBytecode.length / 2 - 1} bytes`);
        console.log(`🔨 BYTECODE HASH: ${bytecodeHash}`);
        
        console.log("\n🦀 RUST VANITY GENERATOR COMMAND:");
        console.log("=================================");
        console.log(`cd /home/akitav2/eagle-ovault-clean/vanity-generator && cargo run --release -- \\`);
        console.log(`  --factory "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE" \\`);
        console.log(`  --bytecode-hash "${bytecodeHash}" \\`);
        console.log(`  --prefix "47" \\`);
        console.log(`  --suffix "EA91E" \\`);
        console.log(`  --threads 16`);
        
        return { 
            success: true, 
            bytecodeHash,
            fullBytecode: fullBytecode.length / 2 - 1
        };

    } catch (error: any) {
        console.error(`❌ Failed to calculate bytecode hash: ${error.message}`);
        return { success: false, error: error.message };
    }
}

calculateTestBytecodeHash().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
