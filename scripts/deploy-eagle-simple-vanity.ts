import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploy $EAGLE with vanity address
 * Uses LayerZero endpoint directly for reliable deployment
 * Same constructor across all chains = deterministic vanity addresses! 🎯
 */
async function deployEagleVanity() {
    console.log("🎊 DEPLOYING $EAGLE WITH VANITY ADDRESS");
    console.log("=======================================");
    console.log("Professional LayerZero OFT deployment ✨\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`🌐 Network: ${network.name}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    // FIRST: Calculate bytecode hash for simple contract
    const params = {
        name: "Eagle Vault Shares",
        symbol: "EAGLE",
        lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,  // Ethereum LayerZero endpoint
        delegate: deployer.address
    };

    console.log("📋 Contract Parameters:");
    console.log(`   ├─ Name: "${params.name}"`);
    console.log(`   ├─ Symbol: "${params.symbol}"`);
    console.log(`   ├─ LZ Endpoint: ${params.lzEndpoint}`);
    console.log(`   └─ Delegate: ${params.delegate}\n`);

    try {
        // Get contract factory and calculate bytecode
        const Eagle = await ethers.getContractFactory("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT");
        
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [params.name, params.symbol, params.lzEndpoint, params.delegate]
        );

        const fullBytecode = Eagle.bytecode + constructorArgs.slice(2);
        const bytecodeHash = ethers.keccak256(fullBytecode);
        
        console.log("🔨 BYTECODE ANALYSIS:");
        console.log("=====================");
        console.log(`📏 Length: ${fullBytecode.length / 2 - 1} bytes`);
        console.log(`🔨 Hash: ${bytecodeHash}`);
        
        console.log("\n🦀 GENERATE VANITY SALT WITH:");
        console.log("=============================");
        console.log(`cd vanity-generator && cargo run --release -- \\`);
        console.log(`  --factory "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE" \\`);
        console.log(`  --bytecode-hash "${bytecodeHash}" \\`);
        console.log(`  --prefix "47" \\`);
        console.log(`  --suffix "EA91E" \\`);
        console.log(`  --threads 16`);


        // 🎊 VANITY SALT GENERATED! Let's deploy!
        const originalSalt = "0x20000000007e8909";  // Original 8-byte salt
        const VANITY_CONFIG = {
            salt: ethers.zeroPadValue(originalSalt, 32), // Properly pad to 32 bytes
            address: "0x476D184A5D6F66876B2DD8FEE8770D4A5A8EA91E",
            pattern: "0x47...EA91E"
        };

        console.log("🎯 VANITY DEPLOYMENT:");
        console.log("====================");
        console.log(`✨ Address: ${VANITY_CONFIG.address}`);
        console.log(`🔑 Salt: ${VANITY_CONFIG.salt}`);
        console.log(`🎨 Pattern: ${VANITY_CONFIG.pattern}\n`);

        const create2Factory = await ethers.getContractAt("ICREATE2Factory", process.env.EAGLE_CREATE2_FACTORY!);
        
        console.log("🚀 Deploying $EAGLE with vanity address...");
        const tx = await create2Factory.deploy(VANITY_CONFIG.salt, fullBytecode, {
            gasLimit: 3500000,
            maxFeePerGas: ethers.parseUnits("4", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")
        });

        console.log(`⏳ Transaction: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();

        console.log(`\n🎊 VANITY ADDRESS ACHIEVED!`);
        console.log("===========================");
        console.log(`✅ Address: ${VANITY_CONFIG.address}`);
        console.log(`🎨 Pattern: ${VANITY_CONFIG.pattern} ✨`);
        console.log(`📋 Transaction: ${receipt?.hash}`);
        console.log(`⛽ Gas Used: ${receipt?.gasUsed.toLocaleString()}`);
        console.log(`📦 Block: ${receipt?.blockNumber}\n`);

        // Verify deployment
        const eagle = await ethers.getContractAt("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT", VANITY_CONFIG.address);
        const name = await eagle.name();
        const symbol = await eagle.symbol();
        const version = await eagle.version();
        
        console.log("📊 Contract Verification:");
        console.log(`   ├─ Name: ${name}`);
        console.log(`   ├─ Symbol: ${symbol}`);
        console.log(`   └─ Version: ${version}\n`);

        console.log("🎊 YOUR PROFESSIONAL $EAGLE TOKEN IS LIVE!");
        console.log("==========================================");
        console.log(`🎯 Vanity Address: ${VANITY_CONFIG.address}`);
        console.log(`✨ Beautiful Pattern: ${VANITY_CONFIG.pattern}`);
        console.log(`🌐 Same address works on ALL LayerZero chains!`);
        console.log(`🏆 Professional branding achieved!`);
        
        console.log(`\n🔗 Etherscan: https://etherscan.io/address/${VANITY_CONFIG.address}`);
        
        console.log("\n🚀 NEXT STEPS:");
        console.log("===============");
        console.log("1. 🌐 Deploy on other chains with SAME salt");
        console.log("2. 🔗 Configure LayerZero peer connections"); 
        console.log("3. 🧪 Test cross-chain transfers");
        console.log("4. 💎 Launch your professional vault system!");

        return { success: true, address: VANITY_CONFIG.address, vanityAchieved: true };

    } catch (error: any) {
        console.error(`❌ Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

deployEagleVanity().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
