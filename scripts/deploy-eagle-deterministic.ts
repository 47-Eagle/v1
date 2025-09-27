import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Factory addresses (deploy these first on each chain)
const FACTORY_ADDRESSES: { [key: number]: string } = {
    1: "",     // Ethereum - Fill after deploying factory
    56: "",    // BSC - Fill after deploying factory  
    42161: "", // Arbitrum - Fill after deploying factory
    8453: "",  // Base - Fill after deploying factory
    43114: "", // Avalanche - Fill after deploying factory
};

/**
 * Deploy $EAGLE token with deterministic address across all chains
 * This ensures the same $EAGLE address on every LayerZero chain
 */
async function deployDeterministicEagle() {
    console.log("🎯 DEPLOYING DETERMINISTIC $EAGLE TOKEN");
    console.log("=======================================");
    console.log("Same address across ALL LayerZero chains!\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);
    const chainId = Number(network.chainId);

    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Get factory address for this chain
    const factoryAddress = FACTORY_ADDRESSES[chainId];
    if (!factoryAddress) {
        console.error(`❌ No factory address set for chain ${chainId}`);
        console.log("Deploy the factory first using: deploy-eagle-factory.ts");
        return;
    }

    // Get network configuration
    const networkConfig = getNetworkConfig(chainId);
    if (!networkConfig) {
        console.error(`❌ No network config for chain ${chainId}`);
        return;
    }

    console.log(`🏭 Factory: ${factoryAddress}`);
    console.log(`🔗 LayerZero Endpoint: ${networkConfig.lzEndpoint}\n`);

    const gasSettings = {
        gasLimit: 2500000,
        maxFeePerGas: ethers.parseUnits("5", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")
    };

    try {
        // Connect to factory
        const factory = await ethers.getContractAt("DeterministicEagleFactory", factoryAddress);
        
        // Get standard salt
        const salt = await factory.getStandardSalt();
        console.log(`🎲 Using standard salt: ${salt}`);

        // Token parameters (MUST be same on all chains!)
        const tokenParams = {
            name: "Eagle Vault Shares",
            symbol: "EAGLE",
            lzEndpoint: networkConfig.lzEndpoint,
            delegate: deployer.address
        };

        // Predict address first
        const predictedAddress = await factory.predictEagleAddress(
            salt,
            tokenParams.name,
            tokenParams.symbol,
            tokenParams.lzEndpoint,
            tokenParams.delegate
        );

        console.log(`🎯 Predicted $EAGLE address: ${predictedAddress}\n`);

        // Check if already deployed
        const isDeployed = await factory.isEagleDeployed(
            salt,
            tokenParams.name,
            tokenParams.symbol,
            tokenParams.lzEndpoint,
            tokenParams.delegate
        );

        if (isDeployed) {
            console.log(`✅ $EAGLE already deployed at: ${predictedAddress}`);
            
            // Verify it's working
            const eagle = await ethers.getContractAt("EagleShareOFT", predictedAddress);
            const name = await eagle.name();
            const symbol = await eagle.symbol();
            const owner = await eagle.owner();
            
            console.log(`📊 Token Info:`);
            console.log(`   ├─ Name: ${name}`);
            console.log(`   ├─ Symbol: ${symbol}`);
            console.log(`   ├─ Owner: ${owner}`);
            console.log(`   └─ Address: ${predictedAddress}`);
            
            return;
        }

        // Deploy the token
        console.log("🚀 Deploying $EAGLE token...");
        const tx = await factory.deployEagle(
            salt,
            tokenParams.name,
            tokenParams.symbol,
            tokenParams.lzEndpoint,
            tokenParams.delegate,
            gasSettings
        );

        console.log("⏳ Waiting for deployment transaction...");
        const receipt = await tx.wait();
        
        console.log(`✅ $EAGLE deployed successfully!`);
        console.log(`📊 Deployment Details:`);
        console.log(`   ├─ Address: ${predictedAddress}`);
        console.log(`   ├─ Transaction: ${receipt?.hash}`);
        console.log(`   ├─ Gas Used: ${receipt?.gasUsed.toLocaleString()}`);
        console.log(`   └─ Block: ${receipt?.blockNumber}`);

        // Verify deployment
        const eagle = await ethers.getContractAt("EagleShareOFT", predictedAddress);
        const name = await eagle.name();
        const symbol = await eagle.symbol();
        const totalSupply = await eagle.totalSupply();

        console.log(`\n🔍 Verification:`);
        console.log(`   ├─ Name: ${name}`);
        console.log(`   ├─ Symbol: ${symbol}`);
        console.log(`   ├─ Total Supply: ${ethers.formatEther(totalSupply)}`);
        console.log(`   └─ Owner: ${await eagle.owner()}`);

        console.log(`\n🔗 Etherscan: https://${getEtherscanDomain(chainId)}/address/${predictedAddress}`);
        
        console.log("\n🎊 SUCCESS! $EAGLE deployed with deterministic address!");
        console.log("Deploy on other chains with same address guarantee! 🚀");

    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("💡 Need more ETH for gas");
        }
    }
}

function getNetworkConfig(chainId: number) {
    const configs: { [key: number]: { lzEndpoint: string } } = {
        1: { lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2! },
        56: { lzEndpoint: process.env.BSC_LZ_ENDPOINT_V2! },
        42161: { lzEndpoint: process.env.ARBITRUM_LZ_ENDPOINT_V2! },
        8453: { lzEndpoint: process.env.BASE_LZ_ENDPOINT_V2! },
        43114: { lzEndpoint: process.env.AVALANCHE_LZ_ENDPOINT_V2! }
    };
    return configs[chainId];
}

function getEtherscanDomain(chainId: number) {
    const domains: { [key: number]: string } = {
        1: "etherscan.io",
        56: "bscscan.com",
        42161: "arbiscan.io", 
        8453: "basescan.org",
        43114: "snowtrace.io"
    };
    return domains[chainId] || "etherscan.io";
}

deployDeterministicEagle().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
