import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Configure the universal registry with chain-specific LayerZero data
 * This enables the registry-based $EAGLE deployment approach
 */
async function configureChainRegistry() {
    console.log("🏛️  CONFIGURING UNIVERSAL CHAIN REGISTRY");
    console.log("========================================");
    console.log("Setting up chain-specific LayerZero data for $EAGLE deployment\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);
    const chainId = Number(network.chainId);

    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);

    // Your universal registry address
    const REGISTRY_ADDRESS = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";
    console.log(`🏛️  Registry: ${REGISTRY_ADDRESS}\n`);

    // Chain configurations for all LayerZero chains
    const CHAIN_CONFIGS = {
        1: { // Ethereum
            eid: 30101,
            lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,
            name: "Ethereum"
        },
        56: { // BSC
            eid: 30102,
            lzEndpoint: process.env.BSC_LZ_ENDPOINT_V2!,
            name: "BSC"
        },
        42161: { // Arbitrum
            eid: 30110,
            lzEndpoint: process.env.ARBITRUM_LZ_ENDPOINT_V2!,
            name: "Arbitrum"
        },
        8453: { // Base
            eid: 30184,
            lzEndpoint: process.env.BASE_LZ_ENDPOINT_V2!,
            name: "Base"
        },
        43114: { // Avalanche
            eid: 30106,
            lzEndpoint: process.env.AVALANCHE_LZ_ENDPOINT_V2!,
            name: "Avalanche"
        }
    };

    const currentConfig = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS];
    if (!currentConfig) {
        console.error(`❌ Chain ID ${chainId} not supported`);
        return;
    }

    console.log("📋 Current Chain Configuration:");
    console.log(`   ├─ Name: ${currentConfig.name}`);
    console.log(`   ├─ Chain ID: ${chainId}`);
    console.log(`   ├─ EID: ${currentConfig.eid}`);
    console.log(`   └─ LZ Endpoint: ${currentConfig.lzEndpoint}\n`);

    const gasSettings = {
        gasLimit: 200000,
        maxFeePerGas: ethers.parseUnits("10", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
    };

    console.log(`⚙️  Gas Settings:`);
    console.log(`   ├─ Max Fee: ${ethers.formatUnits(gasSettings.maxFeePerGas, "gwei")} gwei`);
    console.log(`   ├─ Priority: ${ethers.formatUnits(gasSettings.maxPriorityFeePerGas, "gwei")} gwei`);
    console.log(`   └─ Limit: ${gasSettings.gasLimit / 1000}K gas\n`);

    try {
        // Connect to registry
        console.log("🔍 Connecting to registry...");
        const registry = await ethers.getContractAt("IChainRegistry", REGISTRY_ADDRESS);

        // Check current configuration
        console.log("📊 Checking current registry state...");
        let currentInfo;
        try {
            currentInfo = await registry.getChainInfo();
            console.log(`✅ Current config found:`);
            console.log(`   ├─ Chain ID: ${currentInfo.chainId}`);
            console.log(`   ├─ EID: ${currentInfo.eid}`);
            console.log(`   ├─ LZ Endpoint: ${currentInfo.lzEndpoint}`);
            console.log(`   └─ Active: ${currentInfo.active}\n`);

            if (currentInfo.active && currentInfo.chainId.toString() === chainId.toString()) {
                console.log("✅ Registry already properly configured for this chain!");
                return { configured: true, updated: false };
            }
        } catch (error) {
            console.log("📝 No current configuration found, will create new...\n");
        }

        // Set chain configuration
        console.log("🔧 Configuring registry for current chain...");
        console.log(`Setting: chainId=${chainId}, eid=${currentConfig.eid}, endpoint=${currentConfig.lzEndpoint}`);

        const tx = await registry.setChainInfo(
            chainId,
            currentConfig.eid,
            currentConfig.lzEndpoint,
            true, // active
            gasSettings
        );

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`✅ Configuration confirmed!`);
        console.log(`   ├─ Gas Used: ${receipt?.gasUsed.toLocaleString()}`);
        console.log(`   └─ Block: ${receipt?.blockNumber}\n`);

        // Verify configuration
        console.log("🔍 Verifying new configuration...");
        const verifyInfo = await registry.getChainInfo();
        console.log(`📋 Verified Configuration:`);
        console.log(`   ├─ Chain ID: ${verifyInfo.chainId}`);
        console.log(`   ├─ EID: ${verifyInfo.eid}`);
        console.log(`   ├─ LZ Endpoint: ${verifyInfo.lzEndpoint}`);
        console.log(`   └─ Active: ${verifyInfo.active}`);

        const isSupported = await registry.isChainSupported(chainId);
        console.log(`   └─ Chain Supported: ${isSupported ? '✅' : '❌'}\n`);

        if (!isSupported) {
            throw new Error("Chain configuration verification failed");
        }

        console.log("🎊 REGISTRY CONFIGURATION SUCCESS!");
        console.log(`✅ ${currentConfig.name} (${chainId}) configured in registry`);
        console.log(`✅ Ready for $EAGLE deployment with universal addresses!`);

        return { configured: true, updated: true };

    } catch (error: any) {
        console.error(`❌ Registry configuration failed: ${error.message}`);

        if (error.message.includes("Ownable")) {
            console.log("\n💡 SOLUTION: Make sure you own the registry contract");
            console.log(`   Registry owner should be: ${deployer.address}`);
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("\n💡 SOLUTION: Add more ETH for gas");
        } else if (error.message.includes("execution reverted")) {
            console.log("\n💡 POSSIBLE ISSUES:");
            console.log("   - Registry contract not deployed at this address");
            console.log("   - Deployer not authorized to configure registry");
            console.log("   - Invalid LayerZero endpoint address");
        }

        throw error;
    }
}

// Utility function to configure all chains
async function showAllChainConfigurations() {
    console.log("🌐 ALL LAYERZERO CHAIN CONFIGURATIONS");
    console.log("====================================");
    console.log("Use these commands to configure registry on each chain:\n");

    const chains = [
        { name: "Ethereum", id: 1, network: "ethereum" },
        { name: "BSC", id: 56, network: "bsc" },
        { name: "Arbitrum", id: 42161, network: "arbitrum" },
        { name: "Base", id: 8453, network: "base" },
        { name: "Avalanche", id: 43114, network: "avalanche" }
    ];

    for (const chain of chains) {
        console.log(`# Configure ${chain.name}`);
        console.log(`npx hardhat run scripts/configure-chain-registry.ts --network ${chain.network}`);
        console.log();
    }

    console.log("After configuring all chains, deploy $EAGLE with:");
    console.log("npx hardhat run scripts/deploy-eagle-universal.ts --network <chain>");
}

// Command line argument handling
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    showAllChainConfigurations();
    process.exit(0);
} else if (args.includes('--show-all')) {
    showAllChainConfigurations();
    process.exit(0);
}

// Execute configuration
if (require.main === module) {
    configureChainRegistry().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { configureChainRegistry };
