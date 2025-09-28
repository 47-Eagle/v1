import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

/**
 * Simple Deterministic $EAGLE Deployment
 * Uses CREATE2 factory directly without registry complications
 */

interface ChainConfig {
    chainId: number;
    eid: number;
    name: string;
    endpointV2: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
    ethereum: { chainId: 1, eid: 30101, name: "ethereum", endpointV2: "0x1a44076050125825900e736c501f859c50fE728c" },
    arbitrum: { chainId: 42161, eid: 30110, name: "arbitrum", endpointV2: "0x1a44076050125825900e736c501f859c50fE728c" },
    base: { chainId: 8453, eid: 30184, name: "base", endpointV2: "0x1a44076050125825900e736c501f859c50fE728c" },
    bsc: { chainId: 56, eid: 30102, name: "bsc", endpointV2: "0x1a44076050125825900e736c501f859c50fE728c" }
};

const CREATE2_FACTORY = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";
const VANITY_SALT = "0xe0000000023e5f2f000000000000000000000000000000000000000000000000";

async function deployDeterministicEagle() {
    console.log("🦅 DETERMINISTIC $EAGLE DEPLOYMENT (SIMPLE)");
    console.log("============================================");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    const currentChain = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
    if (!currentChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    console.log(`📍 Chain: ${currentChain.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    console.log(`📍 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    console.log(`📍 LayerZero Endpoint: ${currentChain.endpointV2}\n`);
    
    // Validate factory exists
    const factoryCode = await ethers.provider.getCode(CREATE2_FACTORY);
    if (factoryCode === "0x") {
        throw new Error(`CREATE2 factory not found at ${CREATE2_FACTORY}`);
    }
    
    const factory = await ethers.getContractAt("ICREATE2Factory", CREATE2_FACTORY);
    const owner = await factory.owner();
    console.log(`🏭 Factory owner: ${owner}`);
    
    // Use EagleShareOFTTest instead of registry-based version for simplicity
    console.log("🚀 Creating simple $EAGLE contract...");
    const EagleContract = await ethers.getContractFactory("contracts/test/EagleShareOFTTest.sol:EagleShareOFTTest");
    
    // Constructor: (name, symbol, lzEndpoint, delegate)
    const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "address", "address"],
        [
            "Eagle",
            "EAGLE",
            currentChain.endpointV2,
            deployer.address
        ]
    );
    
    const fullBytecode = ethers.concat([
        EagleContract.bytecode,
        constructorArgs
    ]);
    
    // Calculate predicted address
    const bytecodeHash = ethers.keccak256(fullBytecode);
    const predictedAddress = ethers.getCreate2Address(
        CREATE2_FACTORY,
        VANITY_SALT,
        bytecodeHash
    );
    
    console.log(`🎯 Predicted EAGLE address: ${predictedAddress}`);
    
    // Check if already deployed
    const existingCode = await ethers.provider.getCode(predictedAddress);
    if (existingCode !== "0x") {
        console.log(`   ✅ $EAGLE already deployed at ${predictedAddress}`);
        
        // Test the deployed contract
        const eagleContract = await ethers.getContractAt("contracts/test/EagleShareOFTTest.sol:EagleShareOFTTest", predictedAddress);
        const name = await eagleContract.name();
        const symbol = await eagleContract.symbol();
        
        console.log(`   ✅ Name: ${name}`);
        console.log(`   ✅ Symbol: ${symbol}`);
        
        saveDeploymentAddress(currentChain.name, predictedAddress);
        return predictedAddress;
    }
    
    try {
        console.log("   Deploying via CREATE2...");
        
        // Deploy via factory
        const deployTx = await factory.deploy(VANITY_SALT, fullBytecode);
        const receipt = await deployTx.wait();
        
        console.log(`   ✅ Deployment transaction: ${receipt?.hash}`);
        console.log(`   ✅ $EAGLE deployed at: ${predictedAddress}`);
        
        // Verify deployment
        const deployedCode = await ethers.provider.getCode(predictedAddress);
        if (deployedCode === "0x") {
            throw new Error("Deployment failed - no code at predicted address");
        }
        
        // Test the contract
        const eagleContract = await ethers.getContractAt("contracts/test/EagleShareOFTTest.sol:EagleShareOFTTest", predictedAddress);
        const name = await eagleContract.name();
        const symbol = await eagleContract.symbol();
        const owner = await eagleContract.owner();
        
        console.log(`   ✅ Name: ${name}`);
        console.log(`   ✅ Symbol: ${symbol}`);
        console.log(`   ✅ Owner: ${owner}`);
        
        saveDeploymentAddress(currentChain.name, predictedAddress);
        
        console.log("\n🎉 DETERMINISTIC DEPLOYMENT SUCCESS!");
        
        return predictedAddress;
        
    } catch (error) {
        console.error(`❌ Deployment failed: ${error}`);
        throw error;
    }
}

function saveDeploymentAddress(chainName: string, address: string) {
    const addressFile = "eagle-deterministic-addresses.json";
    let addresses: any = {};
    
    if (existsSync(addressFile)) {
        addresses = JSON.parse(readFileSync(addressFile, "utf8"));
    }
    
    addresses[chainName] = {
        eagle: address,
        factory: CREATE2_FACTORY,
        salt: VANITY_SALT,
        deployedAt: new Date().toISOString()
    };
    
    writeFileSync(addressFile, JSON.stringify(addresses, null, 2));
    console.log(`   💾 Address saved to ${addressFile}`);
}

async function main() {
    try {
        const eagleAddress = await deployDeterministicEagle();
        
        console.log("\n📋 SAME ADDRESS ON ALL CHAINS!");
        console.log("==============================");
        console.log(`🎯 Your $EAGLE address: ${eagleAddress}`);
        console.log("");
        console.log("🚀 DEPLOY ON OTHER CHAINS:");
        console.log("npx hardhat run scripts/deploy-eagle-deterministic-simple.ts --network arbitrum");
        console.log("npx hardhat run scripts/deploy-eagle-deterministic-simple.ts --network base");
        console.log("npx hardhat run scripts/deploy-eagle-deterministic-simple.ts --network bsc");
        console.log("");
        console.log("🔗 THEN CONFIGURE PEERS:");
        console.log("bash scripts/wire-all-chains.sh");
        
    } catch (error) {
        console.error("❌ Script failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    });
