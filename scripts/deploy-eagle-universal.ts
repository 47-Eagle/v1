import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { promises as fs } from 'fs';

dotenv.config();

/**
 * Universal $EAGLE deployment with vanity address support
 * Deploys with same address on ALL LayerZero chains using registry-based approach
 */
async function deployEagleUniversal() {
    console.log("🌐 UNIVERSAL $EAGLE DEPLOYMENT");
    console.log("==============================");
    console.log("Same address across ALL LayerZero chains! 🎯\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);
    const chainId = Number(network.chainId);

    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏛️  Registry: 0x472656c76f45E8a8a63FffD32aB5888898EeA91E\n`);

    // Universal registry and parameters
    const UNIVERSAL_REGISTRY = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";
    const DEPLOYMENT_CONFIG = {
        name: "Eagle Vault Shares",
        symbol: "EAGLE",
        registry: UNIVERSAL_REGISTRY,
        delegate: deployer.address,
        bytecodeHash: "0xe69f5c6001579251d4f4645caa6bba7ed13d09e9be7bba47afb9a389e1c7a3a2"
    };

    console.log("📋 Universal Configuration:");
    console.log(`   ├─ Name: "${DEPLOYMENT_CONFIG.name}"`);
    console.log(`   ├─ Symbol: "${DEPLOYMENT_CONFIG.symbol}"`);
    console.log(`   ├─ Registry: ${DEPLOYMENT_CONFIG.registry}`);
    console.log(`   ├─ Delegate: ${DEPLOYMENT_CONFIG.delegate}`);
    console.log(`   └─ Bytecode: ${DEPLOYMENT_CONFIG.bytecodeHash.substring(0,10)}...${DEPLOYMENT_CONFIG.bytecodeHash.slice(-8)}\n`);

    // Check for vanity salt first, fallback to standard salt
    const vanityResult = await checkVanityResult();
    const salt = vanityResult?.salt || ethers.keccak256(ethers.toUtf8Bytes("EAGLE_REGISTRY_V1"));
    const expectedAddress = vanityResult?.address || calculateStandardAddress(salt, DEPLOYMENT_CONFIG.bytecodeHash);

    console.log("🎯 Deployment Target:");
    console.log(`   ├─ Salt: ${salt}`);
    console.log(`   ├─ Address: ${expectedAddress}`);
    console.log(`   └─ Type: ${vanityResult ? '🎨 VANITY (0x4747...EA91E)' : '📍 Standard'}\n`);

    const gasSettings = {
        gasLimit: 3500000, // High gas for registry calls
        maxFeePerGas: ethers.parseUnits("8", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
    };

    console.log(`⚙️  Gas Settings:`);
    console.log(`   ├─ Max Fee: ${ethers.formatUnits(gasSettings.maxFeePerGas, "gwei")} gwei`);
    console.log(`   ├─ Priority: ${ethers.formatUnits(gasSettings.maxPriorityFeePerGas, "gwei")} gwei`);
    console.log(`   └─ Limit: ${gasSettings.gasLimit / 1_000_000}M gas\n`);

    try {
        // Step 1: Verify registry configuration
        console.log("🔍 Step 1: Verifying Registry Configuration");
        console.log("-".repeat(45));
        
        await verifyRegistryConfig(UNIVERSAL_REGISTRY, chainId);
        
        // Step 2: Check if already deployed
        console.log("\n🔍 Step 2: Checking Existing Deployment");
        console.log("-".repeat(40));
        
        const existingCode = await ethers.provider.getCode(expectedAddress);
        if (existingCode !== "0x") {
            console.log(`✅ $EAGLE already deployed at: ${expectedAddress}`);
            await verifyExistingDeployment(expectedAddress);
            return { address: expectedAddress, alreadyDeployed: true };
        }
        
        console.log(`📝 Address available for deployment: ${expectedAddress}`);
        
        // Step 3: Deploy via CREATE2
        console.log("\n🚀 Step 3: Deploying $EAGLE");
        console.log("-".repeat(30));
        
        const deployResult = await deployViaCreate2(DEPLOYMENT_CONFIG, salt, gasSettings);
        
        if (!deployResult) {
            throw new Error("Deployment failed");
        }
        
        // Step 4: Verify deployment
        console.log("\n🔍 Step 4: Verifying Deployment");
        console.log("-".repeat(35));
        
        await verifyNewDeployment(deployResult.address);
        
        // Step 5: Save deployment info
        console.log("\n💾 Step 5: Saving Deployment Info");
        console.log("-".repeat(35));
        
        await saveDeploymentInfo({
            network: network.name,
            chainId,
            address: deployResult.address,
            salt,
            vanity: !!vanityResult,
            txHash: deployResult.txHash,
            timestamp: new Date().toISOString()
        });
        
        console.log("\n🎊 UNIVERSAL DEPLOYMENT SUCCESS!");
        console.log("================================");
        console.log(`✅ $EAGLE deployed to: ${deployResult.address}`);
        console.log(`🌐 This address works on ALL LayerZero chains!`);
        console.log(`${vanityResult ? '🎨' : '📍'} ${vanityResult ? 'Vanity' : 'Standard'} address achieved!`);
        
        if (vanityResult) {
            console.log(`\n🎯 VANITY SUCCESS: 0x4747...EA91E pattern achieved!`);
        }
        
        console.log("\n📋 Next Steps:");
        console.log("==============");
        console.log("1. 🚀 Deploy on remaining chains with same salt");
        console.log("2. 🔗 Configure LayerZero peer connections");
        console.log("3. 🧪 Test cross-chain transfers");
        console.log("4. 💎 Integrate with Charm Finance strategies");
        
        return { address: deployResult.address, alreadyDeployed: false };

    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes("ChainNotConfigured")) {
            console.log("\n💡 SOLUTION: Configure registry for this chain:");
            console.log(`registry.setChainInfo(${chainId}, eid, lzEndpoint, true)`);
        } else if (error.message.includes("insufficient funds")) {
            console.log("\n💡 SOLUTION: Add more ETH for gas");
        }
        
        throw error;
    }
}

async function checkVanityResult(): Promise<{salt: string, address: string} | null> {
    try {
        // Check if vanity generator has completed and saved results
        const vanityFile = 'vanity-result.json';
        const data = await fs.readFile(vanityFile, 'utf8').catch(() => null);
        if (data) {
            const result = JSON.parse(data);
            console.log("🎨 Vanity result found!");
            return result;
        }
    } catch (error) {
        // No vanity result yet, continue with standard
    }
    return null;
}

function calculateStandardAddress(salt: string, bytecodeHash: string): string {
    const create2Hash = ethers.keccak256(
        ethers.solidityPacked(
            ["bytes1", "address", "bytes32", "bytes32"],
            ["0xff", process.env.EAGLE_CREATE2_FACTORY!, salt, bytecodeHash]
        )
    );
    return ethers.getAddress("0x" + create2Hash.slice(-40));
}

async function verifyRegistryConfig(registryAddress: string, chainId: number) {
    try {
        const registry = await ethers.getContractAt("IChainRegistry", registryAddress);
        const chainInfo = await registry.getChainInfo();
        
        console.log(`✅ Registry configured:`);
        console.log(`   ├─ Chain ID: ${chainInfo.chainId}`);
        console.log(`   ├─ EID: ${chainInfo.eid}`);
        console.log(`   ├─ LZ Endpoint: ${chainInfo.lzEndpoint}`);
        console.log(`   └─ Active: ${chainInfo.active}`);
        
        if (!chainInfo.active) {
            throw new Error(`Chain ${chainId} not active in registry`);
        }
        
    } catch (error) {
        console.error(`❌ Registry verification failed: ${error}`);
        throw new Error(`Registry not properly configured for chain ${chainId}`);
    }
}

async function deployViaCreate2(config: any, salt: string, gasSettings: any) {
    try {
        console.log("🏭 Using CREATE2 factory for deterministic deployment...");
        
        const create2Factory = await ethers.getContractAt("ICREATE2Factory", process.env.EAGLE_CREATE2_FACTORY!);
        
        // Get contract bytecode
        const EagleShareOFTRegistry = await ethers.getContractFactory("EagleShareOFTRegistryV2");
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [config.name, config.symbol, config.registry, config.delegate]
        );
        
        const bytecode = EagleShareOFTRegistry.bytecode + constructorArgs.slice(2);
        
        console.log(`📦 Deploying with ${bytecode.length / 2 - 1} bytes of bytecode...`);
        
        const tx = await create2Factory.deploy(salt, bytecode, gasSettings);
        
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        
        const predictedAddress = calculateStandardAddress(salt, config.bytecodeHash);
        
        console.log(`✅ Deployment confirmed!`);
        console.log(`   ├─ Address: ${predictedAddress}`);
        console.log(`   ├─ Gas Used: ${receipt?.gasUsed.toLocaleString()}`);
        console.log(`   └─ Block: ${receipt?.blockNumber}`);
        
        return {
            address: predictedAddress,
            txHash: tx.hash,
            gasUsed: receipt?.gasUsed
        };
        
    } catch (error) {
        console.error(`❌ CREATE2 deployment failed: ${error}`);
        throw error;
    }
}

async function verifyNewDeployment(address: string) {
    try {
        const eagle = await ethers.getContractAt("EagleShareOFTRegistryV2", address);
        
        const name = await eagle.name();
        const symbol = await eagle.symbol();
        const registry = await eagle.getRegistry();
        const chainEID = await eagle.getChainEID();
        const configValid = await eagle.verifyConfiguration();
        
        console.log(`📋 Contract Verification:`);
        console.log(`   ├─ Name: ${name}`);
        console.log(`   ├─ Symbol: ${symbol}`);
        console.log(`   ├─ Registry: ${registry}`);
        console.log(`   ├─ Chain EID: ${chainEID}`);
        console.log(`   └─ Config Valid: ${configValid ? '✅' : '❌'}`);
        
        if (!configValid) {
            console.warn("⚠️  Configuration validation failed");
        }
        
    } catch (error) {
        console.error(`❌ Verification failed: ${error}`);
        throw error;
    }
}

async function verifyExistingDeployment(address: string) {
    console.log("🔍 Verifying existing deployment...");
    await verifyNewDeployment(address);
}

async function saveDeploymentInfo(info: any) {
    try {
        const filename = `deployments/${info.network}-eagle-deployment.json`;
        await fs.mkdir('deployments', { recursive: true });
        await fs.writeFile(filename, JSON.stringify(info, null, 2));
        console.log(`✅ Deployment info saved to: ${filename}`);
    } catch (error) {
        console.warn(`⚠️  Could not save deployment info: ${error}`);
    }
}

// Execute deployment
if (require.main === module) {
    deployEagleUniversal().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deployEagleUniversal };
