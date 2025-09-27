import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Master orchestrator for deploying $EAGLE across ALL LayerZero chains
 * Uses your existing CREATE2FactoryWithOwnership for deterministic addresses
 */
async function deployEagleCrossChainOrchestrator() {
    console.log("🎭 EAGLE CROSS-CHAIN DEPLOYMENT ORCHESTRATOR");
    console.log("============================================");
    console.log("Deploying same $EAGLE address on ALL chains! 🌐\n");

    const [deployer] = await ethers.getSigners();
    const currentNetwork = await ethers.provider.getNetwork();
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`🏭 CREATE2 Factory: ${process.env.EAGLE_CREATE2_FACTORY}`);
    console.log(`📍 Current Network: ${currentNetwork.name} (${currentNetwork.chainId})\n`);

    // Standard deployment parameters
    const DEPLOYMENT_CONFIG = {
        salt: ethers.keccak256(ethers.toUtf8Bytes("EAGLE_SHARE_OFT_V1_FINAL")),
        name: "Eagle Vault Shares",
        symbol: "EAGLE",
        delegate: deployer.address,
        gasSettings: {
            gasLimit: 2800000,
            maxFeePerGas: ethers.parseUnits("5", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1.5", "gwei")
        }
    };

    // All target chains
    const TARGET_CHAINS = [
        {
            name: "Ethereum",
            chainId: 1,
            lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,
            rpcUrl: process.env.ETHEREUM_RPC_URL!,
            explorer: "etherscan.io"
        },
        {
            name: "BSC",
            chainId: 56, 
            lzEndpoint: process.env.BSC_LZ_ENDPOINT_V2!,
            rpcUrl: process.env.BSC_RPC_URL!,
            explorer: "bscscan.com"
        },
        {
            name: "Arbitrum",
            chainId: 42161,
            lzEndpoint: process.env.ARBITRUM_LZ_ENDPOINT_V2!,
            rpcUrl: process.env.ARBITRUM_RPC_URL!,
            explorer: "arbiscan.io"
        },
        {
            name: "Base",
            chainId: 8453,
            lzEndpoint: process.env.BASE_LZ_ENDPOINT_V2!,
            rpcUrl: process.env.BASE_RPC_URL!,
            explorer: "basescan.org"
        },
        {
            name: "Avalanche",
            chainId: 43114,
            lzEndpoint: process.env.AVALANCHE_LZ_ENDPOINT_V2!,
            rpcUrl: process.env.AVALANCHE_RPC_URL!,
            explorer: "snowtrace.io"
        }
    ];

    console.log("📋 Deployment Configuration:");
    console.log(`   ├─ Salt: ${DEPLOYMENT_CONFIG.salt}`);
    console.log(`   ├─ Token: ${DEPLOYMENT_CONFIG.name} (${DEPLOYMENT_CONFIG.symbol})`);
    console.log(`   ├─ Delegate: ${DEPLOYMENT_CONFIG.delegate}`);
    console.log(`   └─ Gas Limit: ${DEPLOYMENT_CONFIG.gasSettings.gasLimit / 1_000_000}M\n`);

    // Step 1: Predict universal address
    console.log("🔮 STEP 1: PREDICTING UNIVERSAL ADDRESS");
    console.log("-".repeat(40));
    
    let universalAddress: string | null = null;
    const predictions: { [chainName: string]: string } = {};

    for (const chain of TARGET_CHAINS) {
        const predictedAddress = await predictEagleAddress(chain, DEPLOYMENT_CONFIG);
        predictions[chain.name] = predictedAddress;
        
        if (!universalAddress) {
            universalAddress = predictedAddress;
        }
        
        console.log(`${chain.name}: ${predictedAddress}`);
    }

    // Verify all predictions are the same
    const uniqueAddresses = [...new Set(Object.values(predictions))];
    if (uniqueAddresses.length !== 1) {
        console.error(`❌ Address mismatch! Found ${uniqueAddresses.length} different addresses`);
        console.log("Check LayerZero endpoint addresses and parameters");
        return;
    }

    console.log(`\n✅ Universal Address Confirmed: ${universalAddress}\n`);

    // Step 2: Check current deployments
    console.log("🔍 STEP 2: CHECKING EXISTING DEPLOYMENTS");
    console.log("-".repeat(40));

    const deploymentStatus: { [chainName: string]: boolean } = {};
    
    for (const chain of TARGET_CHAINS) {
        const isDeployed = await checkDeployment(chain, universalAddress!);
        deploymentStatus[chain.name] = isDeployed;
        console.log(`${chain.name}: ${isDeployed ? '✅ Already deployed' : '⏳ Needs deployment'}`);
    }

    const needsDeployment = Object.entries(deploymentStatus)
        .filter(([_, deployed]) => !deployed)
        .map(([name, _]) => name);

    if (needsDeployment.length === 0) {
        console.log("\n🎊 All chains already have $EAGLE deployed!");
        await verifyAllDeployments(TARGET_CHAINS, universalAddress!);
        return;
    }

    console.log(`\n📋 Chains needing deployment: ${needsDeployment.join(', ')}`);

    // Step 3: Deploy on missing chains
    console.log("\n🚀 STEP 3: DEPLOYING ON MISSING CHAINS");
    console.log("-".repeat(40));

    const currentChainId = Number(currentNetwork.chainId);
    const currentChain = TARGET_CHAINS.find(c => c.chainId === currentChainId);

    if (!currentChain) {
        console.error(`❌ Current network (${currentNetwork.name}) not in target chains`);
        console.log("Switch to one of the target networks and run again");
        return;
    }

    if (!deploymentStatus[currentChain.name]) {
        console.log(`🎯 Deploying on current network: ${currentChain.name}`);
        const success = await deployEagleOnChain(currentChain, DEPLOYMENT_CONFIG);
        if (success) {
            deploymentStatus[currentChain.name] = true;
            console.log(`✅ ${currentChain.name} deployment successful!`);
        }
    } else {
        console.log(`✅ ${currentChain.name} already deployed`);
    }

    // Step 4: Show remaining deployments needed
    const stillNeedsDeployment = Object.entries(deploymentStatus)
        .filter(([_, deployed]) => !deployed)
        .map(([name, _]) => name);

    if (stillNeedsDeployment.length > 0) {
        console.log(`\n📋 REMAINING DEPLOYMENTS NEEDED:`);
        console.log("-".repeat(35));
        
        for (const chainName of stillNeedsDeployment) {
            console.log(`🔗 ${chainName}:`);
            console.log(`   npx hardhat run scripts/deploy-eagle-cross-chain-orchestrator.ts --network ${chainName.toLowerCase()}`);
        }
    }

    // Step 5: Final verification
    console.log("\n🔍 STEP 4: FINAL VERIFICATION");
    console.log("-".repeat(30));
    
    await verifyAllDeployments(TARGET_CHAINS, universalAddress!);

    console.log("\n🎊 CROSS-CHAIN DEPLOYMENT STATUS:");
    console.log("=".repeat(35));
    
    const deployed = Object.values(deploymentStatus).filter(Boolean).length;
    const total = TARGET_CHAINS.length;
    
    console.log(`📊 Progress: ${deployed}/${total} chains deployed`);
    console.log(`🎯 Universal Address: ${universalAddress}`);
    
    if (deployed === total) {
        console.log("\n✅ ALL CHAINS DEPLOYED SUCCESSFULLY!");
        console.log("🔗 Ready for LayerZero peer configuration!");
    } else {
        console.log(`\n⏳ ${total - deployed} chains still need deployment`);
        console.log("Run this script on remaining networks");
    }
}

async function predictEagleAddress(chain: any, config: any): Promise<string> {
    const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT");
    const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "address", "address"],
        [config.name, config.symbol, chain.lzEndpoint, config.delegate]
    );
    
    const bytecode = EagleShareOFT.bytecode + constructorArgs.slice(2);
    const bytecodeHash = ethers.keccak256(bytecode);

    // Calculate CREATE2 address manually
    const create2Hash = ethers.keccak256(
        ethers.solidityPacked(
            ["bytes1", "address", "bytes32", "bytes32"],
            ["0xff", process.env.EAGLE_CREATE2_FACTORY!, config.salt, bytecodeHash]
        )
    );
    return ethers.getAddress("0x" + create2Hash.slice(-40));
}

async function checkDeployment(chain: any, address: string): Promise<boolean> {
    try {
        // For current network, check directly
        const currentNetwork = await ethers.provider.getNetwork();
        if (Number(currentNetwork.chainId) === chain.chainId) {
            const code = await ethers.provider.getCode(address);
            return code !== "0x";
        }
        
        // For other networks, we'd need to connect via RPC
        // For now, assume not deployed if not current network
        return false;
    } catch {
        return false;
    }
}

async function deployEagleOnChain(chain: any, config: any): Promise<boolean> {
    try {
        const create2Factory = await ethers.getContractAt("ICREATE2Factory", process.env.EAGLE_CREATE2_FACTORY!);
        
        const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT");
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [config.name, config.symbol, chain.lzEndpoint, config.delegate]
        );
        
        const bytecode = EagleShareOFT.bytecode + constructorArgs.slice(2);
        
        console.log(`⚙️  Deploying with gas limit: ${config.gasSettings.gasLimit / 1_000_000}M`);
        
        const tx = await create2Factory.deploy(
            config.salt,
            bytecode,
            config.gasSettings
        );
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction: ${receipt?.hash}`);
        console.log(`⛽ Gas used: ${receipt?.gasUsed.toLocaleString()}`);
        
        return true;
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        return false;
    }
}

async function verifyAllDeployments(chains: any[], universalAddress: string) {
    console.log(`\n🔍 Verifying $EAGLE at ${universalAddress}:`);
    
    const currentNetwork = await ethers.provider.getNetwork();
    const currentChainId = Number(currentNetwork.chainId);
    
    for (const chain of chains) {
        if (chain.chainId === currentChainId) {
            try {
                const eagle = await ethers.getContractAt("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT", universalAddress);
                const name = await eagle.name();
                const symbol = await eagle.symbol();
                console.log(`✅ ${chain.name}: ${name} (${symbol})`);
            } catch {
                console.log(`❌ ${chain.name}: Contract not found or invalid`);
            }
        } else {
            console.log(`⏳ ${chain.name}: Switch network to verify`);
        }
    }
}

deployEagleCrossChainOrchestrator().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
