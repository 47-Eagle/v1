import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Configure your registry using the correct function signature
 * Based on inspection, your registry has registerChain function
 */
async function configureRegistryCorrect() {
    console.log("🏛️  CONFIGURING REGISTRY (CORRECT METHOD)");
    console.log("=========================================");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`🏛️  Registry: 0x472656c76f45E8a8a63FffD32aB5888898EeA91E\n`);

    // Your registry address
    const REGISTRY_ADDRESS = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";

    // Chain configuration for Ethereum
    const CHAIN_CONFIG = {
        chainId: 1,
        eid: 30101,
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c"
    };

    console.log("📋 Configuration:");
    console.log(`   ├─ Chain ID: ${CHAIN_CONFIG.chainId}`);
    console.log(`   ├─ EID: ${CHAIN_CONFIG.eid}`);
    console.log(`   └─ LZ Endpoint: ${CHAIN_CONFIG.lzEndpoint}\n`);

    try {
        // Create contract interface based on what we found
        const registryABI = [
            "function owner() external view returns (address)",
            "function registerChain(uint256 chainId, uint32 eid, address endpoint) external",
            "function chains(uint256 chainId) external view returns (uint32, address, bool)",
            "function getChainInfo() external view returns (uint256, uint32, address, bool)"
        ];

        const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, deployer);

        // Verify ownership
        const owner = await registry.owner();
        console.log(`✅ Contract owner: ${owner}`);
        console.log(`✅ You are owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}\n`);

        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            throw new Error("You are not the owner of this registry");
        }

        // Try to read existing chain info first
        console.log("🔍 Checking existing chain configuration...");
        try {
            const chainInfo = await registry.chains(CHAIN_CONFIG.chainId);
            console.log(`Current config: EID=${chainInfo[0]}, Endpoint=${chainInfo[1]}, Active=${chainInfo[2]}`);
            
            if (chainInfo[2] && chainInfo[1] === CHAIN_CONFIG.lzEndpoint) {
                console.log("✅ Chain already properly configured!");
                return { success: true, alreadyConfigured: true };
            }
        } catch (error) {
            console.log("📝 No existing configuration found");
        }

        // Register the chain
        console.log("\n🔧 Registering chain configuration...");
        
        const gasSettings = {
            gasLimit: 150000,
            maxFeePerGas: ethers.parseUnits("15", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        };

        console.log(`⚙️  Gas settings: ${ethers.formatUnits(gasSettings.maxFeePerGas, "gwei")} gwei max\n`);

        const tx = await registry.registerChain(
            CHAIN_CONFIG.chainId,
            CHAIN_CONFIG.eid,
            CHAIN_CONFIG.lzEndpoint,
            gasSettings
        );

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed!`);
        console.log(`   ├─ Gas used: ${receipt?.gasUsed.toLocaleString()}`);
        console.log(`   └─ Block: ${receipt?.blockNumber}\n`);

        // Verify the configuration
        console.log("🔍 Verifying configuration...");
        const verifyInfo = await registry.chains(CHAIN_CONFIG.chainId);
        console.log(`📋 Verified config:`);
        console.log(`   ├─ EID: ${verifyInfo[0]}`);
        console.log(`   ├─ Endpoint: ${verifyInfo[1]}`);
        console.log(`   └─ Active: ${verifyInfo[2]}\n`);

        if (!verifyInfo[2]) {
            console.warn("⚠️  Chain not marked as active");
        }

        console.log("🎊 REGISTRY CONFIGURATION SUCCESS!");
        console.log("✅ Ethereum chain configured in registry");
        console.log("✅ Ready for $EAGLE deployment!\n");

        console.log("📋 Next step:");
        console.log("npx hardhat run scripts/deploy-eagle-universal.ts --network ethereum");

        return { success: true, alreadyConfigured: false };

    } catch (error: any) {
        console.error(`❌ Configuration failed: ${error.message}`);

        if (error.message.includes("execution reverted")) {
            console.log("\n💡 Possible issues:");
            console.log("   - Chain already registered with different parameters");
            console.log("   - Invalid LayerZero endpoint address");
            console.log("   - Registry function signature mismatch");
        }

        return { success: false, error: error.message };
    }
}

configureRegistryCorrect().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
