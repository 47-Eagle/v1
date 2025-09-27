import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploy $EAGLE using registry-based approach for uniform cross-chain addresses
 * This approach enables the same contract address on ALL chains!
 */
async function deployEagleRegistryBased() {
    console.log("🏛️  REGISTRY-BASED $EAGLE DEPLOYMENT");
    console.log("====================================");
    console.log("Same address across ALL chains using universal registry! 🌐\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);
    const chainId = Number(network.chainId);

    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏭 CREATE2 Factory: ${process.env.EAGLE_CREATE2_FACTORY}`);
    console.log(`🏛️  Registry: 0x472656c76f45E8a8a63FffD32aB5888898EeA91E\n`);

    // Universal registry address (same on all chains)
    const UNIVERSAL_REGISTRY = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";

    // Standard parameters (IDENTICAL on all chains!)
    const STANDARD_PARAMS = {
        name: "Eagle Vault Shares",
        symbol: "EAGLE",
        registry: UNIVERSAL_REGISTRY,      // ✅ Same on all chains
        delegate: deployer.address         // ✅ Same deployer
    };

    console.log("📋 Universal Parameters (identical on ALL chains):");
    console.log(`   ├─ Name: "${STANDARD_PARAMS.name}"`);
    console.log(`   ├─ Symbol: "${STANDARD_PARAMS.symbol}"`);
    console.log(`   ├─ Registry: ${STANDARD_PARAMS.registry}`);
    console.log(`   └─ Delegate: ${STANDARD_PARAMS.delegate}\n`);

    const gasSettings = {
        gasLimit: 3000000, // Higher gas for registry calls
        maxFeePerGas: ethers.parseUnits("5", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1.5", "gwei")
    };

    console.log(`⚙️  Gas Settings:`);
    console.log(`   ├─ Max Fee: ${ethers.formatUnits(gasSettings.maxFeePerGas, "gwei")} gwei`);
    console.log(`   ├─ Priority: ${ethers.formatUnits(gasSettings.maxPriorityFeePerGas, "gwei")} gwei`);
    console.log(`   └─ Limit: ${gasSettings.gasLimit / 1_000_000}M gas\n`);

    try {
        // First, verify registry is configured for this chain
        console.log("🔍 Verifying registry configuration...");
        const registry = await ethers.getContractAt("IChainRegistry", UNIVERSAL_REGISTRY);
        
        try {
            const chainInfo = await registry.getChainInfo();
            console.log(`✅ Registry configured for this chain:`);
            console.log(`   ├─ Chain ID: ${chainInfo.chainId}`);
            console.log(`   ├─ EID: ${chainInfo.eid}`);
            console.log(`   ├─ LZ Endpoint: ${chainInfo.lzEndpoint}`);
            console.log(`   └─ Active: ${chainInfo.active}\n`);
            
            if (!chainInfo.active) {
                console.error(`❌ Chain ${chainId} is not active in registry`);
                return;
            }
            
        } catch (error) {
            console.error(`❌ Registry not configured for chain ${chainId}`);
            console.log("Configure the registry first with chain-specific data");
            return;
        }

        // Method 1: Direct deployment (if not using CREATE2 factory)
        if (!process.env.EAGLE_CREATE2_FACTORY) {
            console.log("🚀 Direct deployment (non-deterministic)...");
            
            const EagleShareOFTRegistry = await ethers.getContractFactory("EagleShareOFTRegistryV2");
            const eagle = await EagleShareOFTRegistry.deploy(
                STANDARD_PARAMS.name,
                STANDARD_PARAMS.symbol,
                STANDARD_PARAMS.registry,
                STANDARD_PARAMS.delegate,
                gasSettings
            );
            
            console.log("⏳ Waiting for deployment...");
            await eagle.waitForDeployment();
            const eagleAddress = await eagle.getAddress();
            
            console.log(`✅ $EAGLE deployed to: ${eagleAddress}`);
            await verifyDeployment(eagleAddress);
            return eagleAddress;
        }

        // Method 2: CREATE2 factory deployment (deterministic)
        console.log("🎯 CREATE2 factory deployment (deterministic)...");
        
        const create2Factory = await ethers.getContractAt("ICREATE2Factory", process.env.EAGLE_CREATE2_FACTORY!);
        
        // Calculate bytecode for CREATE2
        const EagleShareOFTRegistry = await ethers.getContractFactory("EagleShareOFTRegistryV2");
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "string", "address", "address"],
            [STANDARD_PARAMS.name, STANDARD_PARAMS.symbol, STANDARD_PARAMS.registry, STANDARD_PARAMS.delegate]
        );
        
        const bytecode = EagleShareOFTRegistry.bytecode + constructorArgs.slice(2);
        const bytecodeHash = ethers.keccak256(bytecode);
        
        console.log(`🔨 Bytecode hash: ${bytecodeHash}`);

        // Use vanity salt if provided, otherwise use standard salt
        const salt = process.env.EAGLE_VANITY_SALT || 
                    ethers.keccak256(ethers.toUtf8Bytes("EAGLE_REGISTRY_V1"));
        
        console.log(`🎲 Salt: ${salt}`);
        
        // Predict address
        const create2Hash = ethers.keccak256(
            ethers.solidityPacked(
                ["bytes1", "address", "bytes32", "bytes32"],
                ["0xff", process.env.EAGLE_CREATE2_FACTORY!, salt, bytecodeHash]
            )
        );
        const predictedAddress = ethers.getAddress("0x" + create2Hash.slice(-40));
        
        console.log(`🎯 Predicted address: ${predictedAddress}\n`);
        
        // Check if already deployed
        const code = await ethers.provider.getCode(predictedAddress);
        if (code !== "0x") {
            console.log(`✅ $EAGLE already deployed at: ${predictedAddress}`);
            await verifyDeployment(predictedAddress);
            return predictedAddress;
        }
        
        // Deploy via CREATE2
        console.log("🚀 Deploying via CREATE2 factory...");
        const tx = await create2Factory.deploy(salt, bytecode, gasSettings);
        
        console.log("⏳ Waiting for deployment transaction...");
        const receipt = await tx.wait();
        
        console.log(`✅ $EAGLE deployed successfully!`);
        console.log(`📊 Deployment Details:`);
        console.log(`   ├─ Address: ${predictedAddress}`);
        console.log(`   ├─ Transaction: ${receipt?.hash}`);
        console.log(`   ├─ Gas Used: ${receipt?.gasUsed.toLocaleString()}`);
        console.log(`   └─ Block: ${receipt?.blockNumber}\n`);
        
        await verifyDeployment(predictedAddress);
        
        console.log("🎊 SUCCESS! Registry-based $EAGLE deployed!");
        console.log(`✅ Same bytecode = same address on ALL chains!`);
        console.log(`🔗 Deploy on other chains with identical parameters`);
        
        return predictedAddress;

    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes("ChainNotConfigured")) {
            console.log("💡 Configure the registry for this chain first");
        } else if (error.message.includes("RegistryCallFailed")) {
            console.log("💡 Registry contract may not be deployed on this chain");
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("💡 Need more ETH for gas");
        }
    }
}

async function verifyDeployment(address: string) {
    console.log("🔍 Verifying deployment...");
    
    try {
        const eagle = await ethers.getContractAt("EagleShareOFTRegistryV2", address);
        
        const name = await eagle.name();
        const symbol = await eagle.symbol();
        const registry = await eagle.getRegistry();
        const chainEID = await eagle.getChainEID();
        const totalSupply = await eagle.totalSupply();
        const configValid = await eagle.verifyConfiguration();
        
        console.log(`📋 Contract Verification:`);
        console.log(`   ├─ Name: ${name}`);
        console.log(`   ├─ Symbol: ${symbol}`);
        console.log(`   ├─ Registry: ${registry}`);
        console.log(`   ├─ Chain EID: ${chainEID}`);
        console.log(`   ├─ Total Supply: ${ethers.formatEther(totalSupply)}`);
        console.log(`   └─ Config Valid: ${configValid ? '✅' : '❌'}\n`);
        
        if (!configValid) {
            console.warn("⚠️  Configuration validation failed - check registry setup");
        }
        
    } catch (error) {
        console.error(`❌ Verification failed: ${error}`);
    }
}

deployEagleRegistryBased().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
