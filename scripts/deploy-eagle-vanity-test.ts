import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploy $EAGLE test version with vanity address - FALLBACK VERSION
 * Uses hardcoded LayerZero endpoint to ensure deployment works
 * Address: 0x47102B108264607B3936E20949AA6905E40EA91E
 */
async function deployEagleVanityTest() {
    console.log("🧪 DEPLOYING $EAGLE TEST WITH VANITY ADDRESS");
    console.log("=============================================");
    console.log("Fallback approach with hardcoded endpoint ✨\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`🌐 Network: ${network.name}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    // VANITY CONFIGURATION - NEW SALT FOR TEST CONTRACT! 🎊
    const VANITY_CONFIG = {
        salt: "0x000000000000000000000000000000000000000000000000b000000002677015", // Padded to 32 bytes
        address: "0x47E67E75F3FB6CE494EC5FE28F6C779D98DEA91E", // NEW vanity address!
        pattern: "0x47...EA91E"
    };

    // Test deployment parameters (SAME on all chains!)
    const TEST_PARAMS = {
        name: "Eagle Vault Shares",
        symbol: "EAGLE",
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E",
        delegate: deployer.address
    };

    console.log("🎯 VANITY ADDRESS:");
    console.log(`✨ Address: ${VANITY_CONFIG.address}`);
    console.log(`🔑 Salt: ${VANITY_CONFIG.salt}`);
    console.log(`🎨 Pattern: ${VANITY_CONFIG.pattern}\n`);

    const gasSettings = {
        gasLimit: 2800000,  // Lower gas limit
        maxFeePerGas: ethers.parseUnits("5", "gwei"),     // Much lower gas
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")  // Lower priority
    };

    try {
        // Check if already deployed
        const existingCode = await ethers.provider.getCode(VANITY_CONFIG.address);
        if (existingCode !== "0x") {
            console.log(`✅ Contract already at vanity address!`);
            return { success: true, address: VANITY_CONFIG.address, alreadyDeployed: true };
        }

        // Deploy using test contract (hardcoded endpoint)
        const create2Factory = await ethers.getContractAt("ICREATE2Factory", process.env.EAGLE_CREATE2_FACTORY!);
        
        const EagleTest = await ethers.getContractFactory("EagleShareOFTTest");
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [TEST_PARAMS.name, TEST_PARAMS.symbol, TEST_PARAMS.registry, TEST_PARAMS.delegate]
        );
        
        const bytecode = EagleTest.bytecode + constructorArgs.slice(2);
        
        console.log("🚀 Deploying test contract with vanity address...");
        const tx = await create2Factory.deploy(VANITY_CONFIG.salt, bytecode, gasSettings);
        
        console.log(`⏳ Transaction: ${tx.hash}`);
        const receipt = await tx.wait();

        console.log(`\n🎊 VANITY TEST DEPLOYMENT SUCCESS!`);
        console.log("==================================");
        console.log(`✅ Address: ${VANITY_CONFIG.address}`);
        console.log(`🎨 Pattern: ${VANITY_CONFIG.pattern} ✨`);
        console.log(`⛽ Gas: ${receipt?.gasUsed.toLocaleString()}\n`);

        // Verify
        const eagle = await ethers.getContractAt("EagleShareOFTTest", VANITY_CONFIG.address);
        const name = await eagle.name();
        const symbol = await eagle.symbol();
        
        console.log("📊 Verification:");
        console.log(`   ├─ Name: ${name}`);
        console.log(`   ├─ Symbol: ${symbol}`);
        console.log(`   └─ Test Version: ${await eagle.isTestVersion()}`);

        console.log("\n🎊 VANITY ADDRESS ACHIEVED!");
        console.log(`🎯 Your branded address: ${VANITY_CONFIG.address}`);
        console.log(`✨ Beautiful pattern: ${VANITY_CONFIG.pattern}`);
        
        return { success: true, address: VANITY_CONFIG.address, alreadyDeployed: false };

    } catch (error: any) {
        console.error(`❌ Test deployment failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

deployEagleVanityTest().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
