import { ethers } from "hardhat";

/**
 * Calculate bytecode hash for current EagleShareOFT contract
 * This hash is needed to generate new vanity salt for 0x47...EA91E
 */

// Constructor arguments (same as production deployment)
const CONSTRUCTOR_ARGS = {
    name: "Eagle",
    symbol: "EAGLE",
    registry: "0x472656c76f45e8a8a63fffd32ab5888898eea91e", 
    delegate: "0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
};

const CREATE2_FACTORY = "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE";

async function calculateCurrentBytecodeHash() {
    console.log("🧮 CALCULATING CURRENT EAGLESHARSOFT BYTECODE HASH");
    console.log("==================================================");
    console.log("📝 This hash is needed for vanity salt generation");
    
    try {
        console.log("\n1️⃣ Getting contract factory...");
        
        const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT");
        console.log("   ✅ Contract factory loaded");
        
        console.log("\n2️⃣ Building deployment transaction...");
        console.log(`   Constructor args:`);
        console.log(`     name: "${CONSTRUCTOR_ARGS.name}"`);
        console.log(`     symbol: "${CONSTRUCTOR_ARGS.symbol}"`);
        console.log(`     registry: ${CONSTRUCTOR_ARGS.registry}`);
        console.log(`     delegate: ${CONSTRUCTOR_ARGS.delegate}`);
        
        // Get deployment transaction with exact constructor arguments
        const deployTx = await EagleShareOFT.getDeployTransaction(
            CONSTRUCTOR_ARGS.name,
            CONSTRUCTOR_ARGS.symbol,
            CONSTRUCTOR_ARGS.registry,
            CONSTRUCTOR_ARGS.delegate
        );
        
        if (!deployTx.data) {
            throw new Error("Failed to get deployment transaction data");
        }
        
        console.log(`   📦 Bytecode length: ${deployTx.data.length} characters`);
        console.log(`   📦 Bytecode (first 100): ${deployTx.data.substring(0, 100)}...`);
        
        console.log("\n3️⃣ Calculating bytecode hash...");
        
        // Calculate keccak256 hash of the complete bytecode (contract + constructor)
        const bytecodeHash = ethers.keccak256(deployTx.data);
        
        console.log(`   🔐 Bytecode Hash: ${bytecodeHash}`);
        
        console.log("\n4️⃣ CREATE2 factory information...");
        console.log(`   🏭 Factory: ${CREATE2_FACTORY}`);
        console.log(`   📐 Formula: keccak256(0xff + factory + salt + bytecodeHash)`);
        
        console.log("\n5️⃣ Testing with old salt...");
        const OLD_SALT = "0xe0000000023e5f2f000000000000000000000000000000000000000000000000";
        
        const testAddress = ethers.getCreate2Address(
            CREATE2_FACTORY,
            OLD_SALT,
            bytecodeHash
        );
        
        console.log(`   🧂 Old salt: ${OLD_SALT}`);
        console.log(`   📍 Predicted address: ${testAddress}`);
        console.log(`   🎯 Target pattern: 0x47...EA91E`);
        
        const addressLower = testAddress.toLowerCase();
        const matches = addressLower.startsWith('0x47') && addressLower.endsWith('ea91e');
        console.log(`   ${matches ? '✅' : '❌'} Vanity pattern match: ${matches}`);
        
        console.log("\n6️⃣ VANITY GENERATION DATA:");
        console.log("================================================");
        console.log(`Factory Address: ${CREATE2_FACTORY}`);
        console.log(`Bytecode Hash: ${bytecodeHash}`);
        console.log(`Target Pattern: 0x47...EA91E`);
        console.log(`Current Salt: ${OLD_SALT} (${matches ? 'WORKS' : 'NEEDS UPDATE'})`);
        
        if (!matches) {
            console.log("\n💡 TO GENERATE NEW VANITY SALT:");
            console.log("   Use this bytecode hash in your Rust vanity generator:");
            console.log(`   cargo run ${bytecodeHash.slice(2)} ${CREATE2_FACTORY.slice(2)} 47 EA91E`);
            console.log("");
            console.log("   Or if using a different vanity tool:");
            console.log("   - Factory: " + CREATE2_FACTORY);
            console.log("   - Bytecode Hash: " + bytecodeHash);
            console.log("   - Prefix: 0x47");
            console.log("   - Suffix: EA91E");
        }
        
        // Save the data for reference
        const fs = require('fs');
        const vanityData = {
            timestamp: new Date().toISOString(),
            contract: "EagleShareOFT",
            factory: CREATE2_FACTORY,
            bytecodeHash: bytecodeHash,
            constructorArgs: CONSTRUCTOR_ARGS,
            targetPattern: {
                prefix: "0x47",
                suffix: "EA91E"
            },
            oldSalt: OLD_SALT,
            oldSaltWorks: matches,
            vanityCommand: `cargo run ${bytecodeHash.slice(2)} ${CREATE2_FACTORY.slice(2)} 47 EA91E`
        };
        
        fs.writeFileSync('eagle-vanity-data.json', JSON.stringify(vanityData, null, 2));
        console.log("\n📁 Vanity generation data saved to: eagle-vanity-data.json");
        
        return {
            bytecodeHash,
            factory: CREATE2_FACTORY,
            oldSaltWorks: matches,
            vanityCommand: `cargo run ${bytecodeHash.slice(2)} ${CREATE2_FACTORY.slice(2)} 47 EA91E`
        };
        
    } catch (error) {
        console.log(`❌ Bytecode hash calculation failed: ${error.message}`);
        throw error;
    }
}

calculateCurrentBytecodeHash()
    .then((result) => {
        console.log("\n🎯 BYTECODE HASH CALCULATION COMPLETE!");
        console.log(`Hash: ${result.bytecodeHash}`);
        console.log(`Old salt works: ${result.oldSaltWorks}`);
        if (!result.oldSaltWorks) {
            console.log(`Vanity command: ${result.vanityCommand}`);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
