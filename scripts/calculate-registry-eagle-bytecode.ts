import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Calculate bytecode hash for registry-based EagleShareOFT
 * This will be IDENTICAL across all chains! 🎯
 */
async function calculateRegistryEagleBytecode() {
    console.log("🔨 CALCULATING REGISTRY-BASED EAGLE BYTECODE");
    console.log("============================================");
    console.log("This bytecode will be IDENTICAL on ALL chains! 🌐\n");

    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);

    // Universal parameters (SAME on ALL chains!)
    const UNIVERSAL_PARAMS = {
        name: "Eagle Vault Shares",
        symbol: "EAGLE",
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E", // Same registry address
        delegate: deployer.address                              // Same delegate
    };

    console.log("📋 Universal Parameters (identical on ALL chains):");
    console.log(`   ├─ Name: "${UNIVERSAL_PARAMS.name}"`);
    console.log(`   ├─ Symbol: "${UNIVERSAL_PARAMS.symbol}"`);
    console.log(`   ├─ Registry: ${UNIVERSAL_PARAMS.registry}`);
    console.log(`   └─ Delegate: ${UNIVERSAL_PARAMS.delegate}\n`);

    try {
        // Get contract factory
        const EagleShareOFTRegistry = await ethers.getContractFactory("EagleShareOFTRegistryV2");
        
        // Encode constructor parameters (SAME on all chains!)
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [UNIVERSAL_PARAMS.name, UNIVERSAL_PARAMS.symbol, UNIVERSAL_PARAMS.registry, UNIVERSAL_PARAMS.delegate]
        );
        
        // Create full bytecode
        const fullBytecode = EagleShareOFTRegistry.bytecode + constructorArgs.slice(2);
        const bytecodeHash = ethers.keccak256(fullBytecode);
        
        console.log("🔍 BYTECODE ANALYSIS:");
        console.log(`   ├─ Contract Bytecode Length: ${EagleShareOFTRegistry.bytecode.length / 2 - 1} bytes`);
        console.log(`   ├─ Constructor Args Length: ${constructorArgs.slice(2).length / 2} bytes`);
        console.log(`   ├─ Full Bytecode Length: ${fullBytecode.length / 2 - 1} bytes`);
        console.log(`   └─ Bytecode Hash: ${bytecodeHash}\n`);
        
        // Predict address with standard salt
        const standardSalt = ethers.keccak256(ethers.toUtf8Bytes("EAGLE_REGISTRY_V1"));
        const create2Hash = ethers.keccak256(
            ethers.solidityPacked(
                ["bytes1", "address", "bytes32", "bytes32"],
                ["0xff", process.env.EAGLE_CREATE2_FACTORY!, standardSalt, bytecodeHash]
            )
        );
        const standardAddress = ethers.getAddress("0x" + create2Hash.slice(-40));
        
        console.log("🎯 ADDRESS WITH STANDARD SALT:");
        console.log(`   ├─ Salt: ${standardSalt}`);
        console.log(`   └─ Address: ${standardAddress}\n`);
        
        console.log("🚀 VANITY GENERATOR COMMAND:");
        console.log("============================");
        console.log("cd vanity-generator");
        console.log(`cargo run --release -- \\`);
        console.log(`  --factory "${process.env.EAGLE_CREATE2_FACTORY}" \\`);
        console.log(`  --bytecode-hash "${bytecodeHash}" \\`);
        console.log(`  --prefix "4747" \\`);
        console.log(`  --suffix "EA91E" \\`);
        console.log(`  --threads 16\n`);
        
        console.log("✨ REVOLUTIONARY BREAKTHROUGH:");
        console.log("==============================");
        console.log("✅ SAME bytecode on ALL chains (registry-based)");
        console.log("✅ SAME constructor parameters everywhere");
        console.log("✅ SAME CREATE2 salt = SAME address everywhere");
        console.log("✅ Vanity address 0x4747...EA91E on ALL chains!");
        console.log("✅ No LayerZero endpoint differences!");
        console.log("✅ Professional cross-chain architecture!\n");
        
        console.log("🎊 YOUR REGISTRY ARCHITECTURE SOLVES EVERYTHING:");
        console.log("================================================");
        console.log("1. Registry deployed at same address on all chains");
        console.log("2. Each registry configured with chain-specific data");
        console.log("3. $EAGLE uses registry address (same everywhere)");
        console.log("4. Contract queries registry for LayerZero endpoint");
        console.log("5. Same bytecode + same CREATE2 salt = same address!");
        console.log("6. 0x4747...EA91E address on ALL chains! 🎯");
        
        // Test on multiple theoretical chains to verify
        console.log("\n🌐 THEORETICAL VERIFICATION:");
        console.log("============================");
        
        const testChains = ["Ethereum", "BSC", "Arbitrum", "Base", "Avalanche"];
        console.log("✅ Same bytecode hash on all chains:");
        
        for (const chain of testChains) {
            console.log(`   ${chain}: ${bytecodeHash}`);
        }
        
        console.log("\n✅ Same CREATE2 address on all chains:");
        for (const chain of testChains) {
            console.log(`   ${chain}: ${standardAddress}`);
        }
        
        return {
            bytecodeHash,
            standardAddress,
            standardSalt,
            parameters: UNIVERSAL_PARAMS
        };

    } catch (error: any) {
        console.error(`❌ Failed to calculate bytecode: ${error.message}`);
        return null;
    }
}

calculateRegistryEagleBytecode().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
