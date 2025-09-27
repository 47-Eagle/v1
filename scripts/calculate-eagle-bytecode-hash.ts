import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Calculate the exact bytecode hash for EagleShareOFT to use with vanity generator
 * This needs to match EXACTLY what will be deployed
 */
async function calculateEagleBytecodeHash() {
    console.log("🔨 CALCULATING EAGLE BYTECODE HASH");
    console.log("==================================");
    console.log("For vanity address generation with CREATE2\n");

    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}\n`);

    // Standard parameters (same as prediction script)
    const STANDARD_PARAMS = {
        name: "Eagle Vault Shares",
        symbol: "EAGLE", 
        delegate: deployer.address
    };

    // We'll calculate for Ethereum first (other chains will be different due to different LZ endpoints)
    const ETHEREUM_LZ_ENDPOINT = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    
    console.log("📋 Parameters:");
    console.log(`   ├─ Name: "${STANDARD_PARAMS.name}"`);
    console.log(`   ├─ Symbol: "${STANDARD_PARAMS.symbol}"`);
    console.log(`   ├─ LZ Endpoint: ${ETHEREUM_LZ_ENDPOINT}`);
    console.log(`   └─ Delegate: ${STANDARD_PARAMS.delegate}\n`);

    try {
        // Get EagleShareOFT contract factory
        const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT");
        
        // Encode constructor parameters
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [STANDARD_PARAMS.name, STANDARD_PARAMS.symbol, ETHEREUM_LZ_ENDPOINT, STANDARD_PARAMS.delegate]
        );
        
        // Create full bytecode (contract bytecode + constructor args)
        const fullBytecode = EagleShareOFT.bytecode + constructorArgs.slice(2);
        const bytecodeHash = ethers.keccak256(fullBytecode);
        
        console.log("🔍 BYTECODE ANALYSIS:");
        console.log(`   ├─ Contract Bytecode Length: ${EagleShareOFT.bytecode.length / 2 - 1} bytes`);
        console.log(`   ├─ Constructor Args Length: ${constructorArgs.slice(2).length / 2} bytes`);
        console.log(`   ├─ Full Bytecode Length: ${fullBytecode.length / 2 - 1} bytes`);
        console.log(`   └─ Bytecode Hash: ${bytecodeHash}\n`);
        
        console.log("🎯 VANITY GENERATOR COMMAND:");
        console.log("===========================");
        console.log("cd vanity-generator");
        console.log(`cargo run --release -- \\`);
        console.log(`  --factory "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE" \\`);
        console.log(`  --bytecode-hash "${bytecodeHash}" \\`);
        console.log(`  --prefix "4747" \\`);
        console.log(`  --suffix "EA91E" \\`);
        console.log(`  --threads 8\n`);
        
        console.log("⚠️  IMPORTANT NOTE:");
        console.log("==================");
        console.log("This bytecode hash is for ETHEREUM with your specific deployer address.");
        console.log("Each chain will have a different bytecode hash due to different LayerZero endpoints.");
        console.log("The vanity address will only work if you use the SAME constructor parameters");
        console.log("on ALL chains (which means same delegate address).\n");
        
        console.log("🔧 FOR UNIVERSAL VANITY ADDRESS:");
        console.log("================================");
        console.log("The vanity salt found will work on ALL chains if you use:");
        console.log(`1. Same factory address: 0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE`);
        console.log(`2. Same deployer/delegate: ${deployer.address}`);
        console.log(`3. Same token name/symbol: ${STANDARD_PARAMS.name} (${STANDARD_PARAMS.symbol})`);
        console.log(`4. Chain-specific LayerZero endpoints`);
        
        // Also calculate for other major chains to verify
        console.log("\n🌐 BYTECODE HASHES FOR ALL CHAINS:");
        console.log("==================================");
        
        const chains = [
            { name: "Ethereum", endpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2! },
            { name: "BSC", endpoint: process.env.BSC_LZ_ENDPOINT_V2! },
            { name: "Arbitrum", endpoint: process.env.ARBITRUM_LZ_ENDPOINT_V2! },
            { name: "Base", endpoint: process.env.BASE_LZ_ENDPOINT_V2! },
            { name: "Avalanche", endpoint: process.env.AVALANCHE_LZ_ENDPOINT_V2! }
        ];
        
        const bytecodeHashes: {[key: string]: string} = {};
        
        for (const chain of chains) {
            if (!chain.endpoint) {
                console.log(`❌ ${chain.name}: Missing endpoint`);
                continue;
            }
            
            const chainConstructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
                ["string", "string", "address", "address"],
                [STANDARD_PARAMS.name, STANDARD_PARAMS.symbol, chain.endpoint, STANDARD_PARAMS.delegate]
            );
            
            const chainFullBytecode = EagleShareOFT.bytecode + chainConstructorArgs.slice(2);
            const chainBytecodeHash = ethers.keccak256(chainFullBytecode);
            
            bytecodeHashes[chain.name] = chainBytecodeHash;
            console.log(`${chain.name}: ${chainBytecodeHash}`);
        }
        
        // Check if all hashes are different (they should be due to different endpoints)
        const uniqueHashes = [...new Set(Object.values(bytecodeHashes))];
        console.log(`\n📊 Analysis: ${uniqueHashes.length} unique bytecode hashes`);
        
        if (uniqueHashes.length > 1) {
            console.log("⚠️  Each chain has different bytecode due to different LayerZero endpoints");
            console.log("This means we need to find a salt that works for the SPECIFIC chain you want");
            console.log("to optimize for, or find one that works well across multiple chains.");
        }
        
        return {
            ethereum: bytecodeHashes.Ethereum,
            allHashes: bytecodeHashes,
            parameters: STANDARD_PARAMS,
            factory: process.env.EAGLE_CREATE2_FACTORY!
        };

    } catch (error: any) {
        console.error(`❌ Failed to calculate bytecode hash: ${error.message}`);
        return null;
    }
}

calculateEagleBytecodeHash().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
