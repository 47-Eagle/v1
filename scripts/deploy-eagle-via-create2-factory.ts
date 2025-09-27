import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploy $EAGLE tokens using the existing CREATE2FactoryWithOwnership
 * This ensures the same $EAGLE address across all LayerZero chains
 */
async function deployEagleViaCreate2Factory() {
    console.log("🎯 DEPLOYING $EAGLE VIA CREATE2 FACTORY");
    console.log("=====================================");
    console.log("Using your existing CREATE2FactoryWithOwnership! 🏭\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);
    const chainId = Number(network.chainId);

    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏭 CREATE2 Factory: ${process.env.EAGLE_CREATE2_FACTORY}\n`);

    // Get network configuration
    const networkConfig = getNetworkConfig(chainId);
    if (!networkConfig) {
        console.error(`❌ No network config for chain ${chainId}`);
        return;
    }

    console.log(`🔗 LayerZero Endpoint: ${networkConfig.lzEndpoint}`);

    const gasSettings = {
        gasLimit: 2800000, // Higher gas for CREATE2 deployment
        maxFeePerGas: ethers.parseUnits("4", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")
    };

    console.log(`⚙️  Gas Settings:`);
    console.log(`   ├─ Max Fee: ${ethers.formatUnits(gasSettings.maxFeePerGas, "gwei")} gwei`);
    console.log(`   ├─ Priority: ${ethers.formatUnits(gasSettings.maxPriorityFeePerGas, "gwei")} gwei`);
    console.log(`   └─ Limit: ${gasSettings.gasLimit / 1_000_000}M gas\n`);

    try {
        // Connect to your existing CREATE2 factory
        const create2Factory = await ethers.getContractAt("ICREATE2Factory", process.env.EAGLE_CREATE2_FACTORY!);
        
        // Standard parameters (MUST be same on all chains for deterministic addresses!)
        const STANDARD_PARAMS = {
            salt: ethers.keccak256(ethers.toUtf8Bytes("EAGLE_SHARE_OFT_V1_FINAL")),
            name: "Eagle Vault Shares",
            symbol: "EAGLE",
            lzEndpoint: networkConfig.lzEndpoint,
            delegate: deployer.address
        };

        console.log("📋 Standard Parameters (same on ALL chains):");
        console.log(`   ├─ Salt: ${STANDARD_PARAMS.salt}`);
        console.log(`   ├─ Name: "${STANDARD_PARAMS.name}"`);
        console.log(`   ├─ Symbol: "${STANDARD_PARAMS.symbol}"`);
        console.log(`   ├─ LZ Endpoint: ${STANDARD_PARAMS.lzEndpoint}`);
        console.log(`   └─ Delegate: ${STANDARD_PARAMS.delegate}\n`);

        // Get EagleShareOFT bytecode with constructor args
        const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT");
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [STANDARD_PARAMS.name, STANDARD_PARAMS.symbol, STANDARD_PARAMS.lzEndpoint, STANDARD_PARAMS.delegate]
        );
        
        const bytecode = EagleShareOFT.bytecode + constructorArgs.slice(2);
        const bytecodeHash = ethers.keccak256(bytecode);

        // Predict the address first
        console.log("🔮 Predicting $EAGLE address...");
        const predictedAddress = await create2Factory.computeAddress(STANDARD_PARAMS.salt, bytecodeHash);
        console.log(`🎯 Predicted $EAGLE Address: ${predictedAddress}\n`);

        // Check if already deployed
        const code = await ethers.provider.getCode(predictedAddress);
        if (code !== "0x") {
            console.log(`✅ $EAGLE already deployed at: ${predictedAddress}`);
            
            // Verify it's working
            const eagle = await ethers.getContractAt("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT", predictedAddress);
            const name = await eagle.name();
            const symbol = await eagle.symbol();
            const owner = await eagle.owner();
            
            console.log(`📊 Existing Token Info:`);
            console.log(`   ├─ Name: ${name}`);
            console.log(`   ├─ Symbol: ${symbol}`);
            console.log(`   ├─ Owner: ${owner}`);
            console.log(`   └─ Address: ${predictedAddress}`);
            
            console.log(`\n🔗 Etherscan: https://${getEtherscanDomain(chainId)}/address/${predictedAddress}`);
            return predictedAddress;
        }

        // Deploy via CREATE2 factory
        console.log("🚀 Deploying $EAGLE via CREATE2 factory...");
        const tx = await create2Factory.deploy(
            STANDARD_PARAMS.salt,
            bytecode,
            gasSettings
        );

        console.log("⏳ Waiting for deployment transaction...");
        const receipt = await tx.wait();
        
        console.log(`✅ $EAGLE deployed successfully!`);
        console.log(`📊 Deployment Details:`);
        console.log(`   ├─ Address: ${predictedAddress}`);
        console.log(`   ├─ Transaction: ${receipt?.hash}`);
        console.log(`   ├─ Gas Used: ${receipt?.gasUsed.toLocaleString()}`);
        console.log(`   └─ Block: ${receipt?.blockNumber}\n`);

        // Verify deployment
        const eagle = await ethers.getContractAt("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT", predictedAddress);
        const name = await eagle.name();
        const symbol = await eagle.symbol();
        const totalSupply = await eagle.totalSupply();

        console.log(`🔍 Verification:`);
        console.log(`   ├─ Name: ${name}`);
        console.log(`   ├─ Symbol: ${symbol}`);
        console.log(`   ├─ Total Supply: ${ethers.formatEther(totalSupply)}`);
        console.log(`   └─ Owner: ${await eagle.owner()}`);

        console.log(`\n🔗 Etherscan: https://${getEtherscanDomain(chainId)}/address/${predictedAddress}`);
        
        console.log("\n🎊 SUCCESS! $EAGLE deployed with deterministic address!");
        console.log("✅ Same address guaranteed on ALL chains when using:");
        console.log(`   ├─ Same factory: ${process.env.EAGLE_CREATE2_FACTORY}`);
        console.log(`   ├─ Same salt: ${STANDARD_PARAMS.salt}`);
        console.log(`   ├─ Same bytecode + constructor args`);
        console.log(`   └─ Result: ${predictedAddress} everywhere! 🚀`);

        return predictedAddress;

    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes("Ownable")) {
            console.log("💡 Make sure you own the CREATE2 factory or have permission to deploy");
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("💡 Need more ETH for gas");
        } else if (error.message.includes("salt")) {
            console.log("💡 Contract may already exist at this address with this salt");
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

// Standard CREATE2 factory interface
const CREATE2_FACTORY_ABI = [
    "function deploy(bytes32 salt, bytes bytecode) external returns (address)",
    "function computeAddress(bytes32 salt, bytes32 bytecodeHash) external view returns (address)"
];

deployEagleViaCreate2Factory().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
