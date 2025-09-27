import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploy DeterministicEagleFactory on each chain
 * This factory will be used to deploy $EAGLE with same address across all chains
 */
async function deployEagleFactory() {
    console.log("🏭 DEPLOYING DETERMINISTIC EAGLE FACTORY");
    console.log("========================================");
    console.log("This factory enables same $EAGLE address on all chains\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

    const gasSettings = {
        gasLimit: 2000000, // 2M gas should be enough for factory
        maxFeePerGas: ethers.parseUnits("3", "gwei"), 
        maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei")
    };

    console.log(`⚙️  Gas Settings:`);
    console.log(`   ├─ Max Fee: ${ethers.formatUnits(gasSettings.maxFeePerGas, "gwei")} gwei`);
    console.log(`   ├─ Priority: ${ethers.formatUnits(gasSettings.maxPriorityFeePerGas, "gwei")} gwei`);
    console.log(`   └─ Limit: ${gasSettings.gasLimit / 1_000_000}M gas\n`);

    try {
        // Deploy the factory
        console.log("🚀 Deploying DeterministicEagleFactory...");
        const DeterministicEagleFactory = await ethers.getContractFactory("DeterministicEagleFactory");
        const factory = await DeterministicEagleFactory.deploy(gasSettings);
        
        console.log("⏳ Waiting for deployment...");
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        
        console.log(`✅ Factory deployed to: ${factoryAddress}`);
        
        // Get the standard salt that will be used
        const standardSalt = await factory.getStandardSalt();
        console.log(`🎲 Standard salt: ${standardSalt}`);

        // Show what the $EAGLE address will be on this chain
        const networkConfig = getNetworkConfig(network.chainId);
        if (networkConfig) {
            const predictedAddress = await factory.predictEagleAddress(
                standardSalt,
                "Eagle Vault Shares",
                "EAGLE",
                networkConfig.lzEndpoint,
                deployer.address
            );
            
            console.log(`\n🎯 Predicted $EAGLE address on ${network.name}:`);
            console.log(`   └─ ${predictedAddress}`);
        }

        console.log(`\n🔗 Etherscan: https://${getEtherscanDomain(network.chainId)}/address/${factoryAddress}`);
        
        console.log("\n📝 Save this factory address for the next step:");
        console.log(`FACTORY_${network.name.toUpperCase()}: "${factoryAddress}"`);

    } catch (error: any) {
        console.error(`❌ Factory deployment failed: ${error.message}`);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("💡 Need more ETH for gas");
        }
    }
}

function getNetworkConfig(chainId: bigint) {
    const chainIdNum = Number(chainId);
    const configs: { [key: number]: { lzEndpoint: string } } = {
        1: { lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2! },
        56: { lzEndpoint: process.env.BSC_LZ_ENDPOINT_V2! },
        42161: { lzEndpoint: process.env.ARBITRUM_LZ_ENDPOINT_V2! },
        8453: { lzEndpoint: process.env.BASE_LZ_ENDPOINT_V2! },
        43114: { lzEndpoint: process.env.AVALANCHE_LZ_ENDPOINT_V2! }
    };
    return configs[chainIdNum];
}

function getEtherscanDomain(chainId: bigint) {
    const chainIdNum = Number(chainId);
    const domains: { [key: number]: string } = {
        1: "etherscan.io",
        56: "bscscan.com", 
        42161: "arbiscan.io",
        8453: "basescan.org",
        43114: "snowtrace.io"
    };
    return domains[chainIdNum] || "etherscan.io";
}

deployEagleFactory().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
