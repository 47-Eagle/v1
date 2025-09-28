import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

/**
 * Complete Deterministic Eagle Vault Deployment
 * Deploys entire system with same addresses across all chains where possible
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

// Your existing CREATE2 factory (same address on all chains)
const CREATE2_FACTORY = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";

// Your registry (should be deployed at same address on all chains)  
const REGISTRY_ADDRESS = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";

// Salts for deterministic deployment (generate new ones if needed)
const DEPLOYMENT_SALTS = {
    eagle: "0xe0000000023e5f2f000000000000000000000000000000000000000000000000", // Your vanity salt (fixed length)
    wlfiOFT: "0x0000000000000000000000000000000000000000000000000000000000000001",
    usd1OFT: "0x0000000000000000000000000000000000000000000000000000000000000002",
    composer: "0x0000000000000000000000000000000000000000000000000000000000000003"
};

// Known token addresses (research these for production)
const TOKEN_ADDRESSES: Record<string, { wlfi?: string; usd1?: string }> = {
    ethereum: {
        wlfi: undefined, // Research actual WLFI address on Ethereum
        usd1: undefined  // Research actual USD1 address on Ethereum
    },
    arbitrum: {
        wlfi: undefined, 
        usd1: undefined
    },
    base: {
        wlfi: undefined,
        usd1: undefined  
    },
    bsc: {
        wlfi: undefined,
        usd1: undefined
    }
};

async function validatePrerequisites() {
    console.log("🔍 Validating deployment prerequisites...");
    
    const factoryCode = await ethers.provider.getCode(CREATE2_FACTORY);
    if (factoryCode === "0x") {
        throw new Error(`CREATE2 factory not found at ${CREATE2_FACTORY}`);
    }
    
    const factory = await ethers.getContractAt("ICREATE2Factory", CREATE2_FACTORY);
    const owner = await factory.owner();
    console.log(`   ✅ Factory owner: ${owner}`);
    
    const registryCode = await ethers.provider.getCode(REGISTRY_ADDRESS);
    if (registryCode === "0x") {
        console.log(`   ⚠️ Registry not deployed yet at ${REGISTRY_ADDRESS}`);
        return false;
    }
    
    console.log(`   ✅ Registry found at ${REGISTRY_ADDRESS}`);
    return true;
}

async function deployWithCREATE2(
    contractName: string,
    contractPath: string, 
    constructorArgs: any[],
    argTypes: string[],
    salt: string
): Promise<string> {
    
    // Get contract factory
    const ContractFactory = await ethers.getContractFactory(contractPath);
    
    // Encode constructor arguments
    const encodedArgs = ethers.AbiCoder.defaultAbiCoder().encode(
        argTypes,
        constructorArgs
    );
    
    // Create full bytecode
    const fullBytecode = ethers.concat([
        ContractFactory.bytecode,
        encodedArgs
    ]);
    
    // Calculate predicted address
    const bytecodeHash = ethers.keccak256(fullBytecode);
    const predictedAddress = ethers.getCreate2Address(
        CREATE2_FACTORY,
        salt,
        bytecodeHash
    );
    
    // Check if already deployed
    const existingCode = await ethers.provider.getCode(predictedAddress);
    if (existingCode !== "0x") {
        console.log(`   ✅ ${contractName} already deployed at ${predictedAddress}`);
        return predictedAddress;
    }
    
    // Deploy via CREATE2
    const factory = await ethers.getContractAt("ICREATE2Factory", CREATE2_FACTORY);
    const deployTx = await factory.deploy(salt, fullBytecode);
    await deployTx.wait();
    
    console.log(`   ✅ ${contractName} deployed at: ${predictedAddress}`);
    return predictedAddress;
}

async function deployDeterministicEagleSystem() {
    console.log("🦅 DETERMINISTIC EAGLE VAULT SYSTEM DEPLOYMENT");
    console.log("==============================================");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    const currentChain = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
    if (!currentChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    console.log(`📍 Chain: ${currentChain.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    console.log(`📍 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
    
    // Validate prerequisites
    const hasRegistry = await validatePrerequisites();
    
    const deployedAddresses: Record<string, string> = {};
    const chainTokens = TOKEN_ADDRESSES[currentChain.name];
    
    try {
        // 1. Deploy EagleShareOFT (deterministic across all chains)
        console.log("🚀 Deploying EagleShareOFT (deterministic)...");
        
        if (hasRegistry) {
            const eagleAddress = await deployWithCREATE2(
                "EagleShareOFT",
                "contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT",
                [
                    "Eagle",
                    "EAGLE", 
                    REGISTRY_ADDRESS,
                    deployer.address
                ],
                ["string", "string", "address", "address"],
                DEPLOYMENT_SALTS.eagle
            );
            deployedAddresses.eagleShareOFT = eagleAddress;
        } else {
            console.log("   ⚠️ Skipping EagleShareOFT - registry not available");
        }
        
        // 2. Deploy WLFIAssetOFT if WLFI doesn't exist natively
        if (!chainTokens?.wlfi) {
            console.log("🚀 Deploying WLFIAssetOFT (deterministic)...");
            
            const wlfiOFTAddress = await deployWithCREATE2(
                "WLFIAssetOFT", 
                "contracts/layerzero-ovault/oft/WLFIAssetOFT.sol:WLFIAssetOFT",
                [
                    "Wrapped LFI",
                    "WLFI",
                    currentChain.endpointV2,
                    deployer.address
                ],
                ["string", "string", "address", "address"],
                DEPLOYMENT_SALTS.wlfiOFT
            );
            deployedAddresses.wlfiAssetOFT = wlfiOFTAddress;
        } else {
            console.log("   ℹ️ WLFI exists natively, would deploy WLFIAdapter instead");
        }
        
        // 3. Deploy USD1AssetOFT if USD1 doesn't exist natively  
        if (!chainTokens?.usd1) {
            console.log("🚀 Deploying USD1AssetOFT (deterministic)...");
            
            const usd1OFTAddress = await deployWithCREATE2(
                "USD1AssetOFT",
                "contracts/layerzero-ovault/oft/USD1AssetOFT.sol:USD1AssetOFT", 
                [
                    "USD1 Stablecoin",
                    "USD1",
                    currentChain.endpointV2,
                    deployer.address
                ],
                ["string", "string", "address", "address"],
                DEPLOYMENT_SALTS.usd1OFT
            );
            deployedAddresses.usd1AssetOFT = usd1OFTAddress;
        } else {
            console.log("   ℹ️ USD1 exists natively, would deploy USD1Adapter instead");
        }
        
        // 4. Deploy EagleOVault only on hub chain (Ethereum)
        if (currentChain.name === "ethereum") {
            console.log("🚀 Deploying EagleOVault (hub chain only)...");
            
            // For hub chain, we need mock tokens or real addresses
            let wlfiAddress = chainTokens?.wlfi;
            let usd1Address = chainTokens?.usd1;
            
            if (!wlfiAddress) {
                console.log("   Deploying Mock WLFI...");
                const MockWLFI = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
                const mockWLFI = await MockWLFI.deploy("Wrapped LFI", "WLFI");
                await mockWLFI.waitForDeployment();
                wlfiAddress = await mockWLFI.getAddress();
            }
            
            if (!usd1Address) {
                console.log("   Deploying Mock USD1...");
                const MockUSD1 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
                const mockUSD1 = await MockUSD1.deploy("USD1 Stablecoin", "USD1");
                await mockUSD1.waitForDeployment();
                usd1Address = await mockUSD1.getAddress();
            }
            
            const EagleOVault = await ethers.getContractFactory("EagleOVault");
            const eagleOVault = await EagleOVault.deploy(
                wlfiAddress,
                usd1Address,
                deployer.address
            );
            await eagleOVault.waitForDeployment();
            deployedAddresses.eagleOVault = await eagleOVault.getAddress();
            console.log(`   ✅ EagleOVault: ${deployedAddresses.eagleOVault}`);
        }
        
        // Save addresses
        saveDeploymentAddresses(currentChain.name, deployedAddresses);
        
        console.log("\n🎉 DEPLOYMENT COMPLETED!");
        console.log("\n📋 DEPLOYED CONTRACTS:");
        for (const [name, address] of Object.entries(deployedAddresses)) {
            console.log(`   ${name}: ${address}`);
        }
        
        console.log("\n🎯 DETERMINISTIC BENEFITS:");
        console.log("✅ EagleShareOFT: Same address on all chains");
        console.log("✅ Asset OFTs: Same address on chains where native tokens don't exist");
        console.log("✅ Predictable addresses enable seamless cross-chain UX");
        
        return deployedAddresses;
        
    } catch (error) {
        console.error(`❌ Deployment failed on ${currentChain.name}:`, error);
        throw error;
    }
}

function saveDeploymentAddresses(chainName: string, addresses: Record<string, string>) {
    const addressFile = "deterministic-addresses.json";
    let allAddresses: any = {};
    
    if (existsSync(addressFile)) {
        allAddresses = JSON.parse(readFileSync(addressFile, "utf8"));
    }
    
    allAddresses[chainName] = {
        ...allAddresses[chainName],
        ...addresses,
        factory: CREATE2_FACTORY,
        registry: REGISTRY_ADDRESS,
        deployedAt: new Date().toISOString()
    };
    
    writeFileSync(addressFile, JSON.stringify(allAddresses, null, 2));
    console.log(`\n💾 Addresses saved to ${addressFile}`);
}

async function main() {
    try {
        await deployDeterministicEagleSystem();
        
        console.log("\n🚀 DEPLOY ON ALL CHAINS FOR SAME ADDRESSES:");
        console.log("npx hardhat run scripts/deploy-all-deterministic.ts --network ethereum");
        console.log("npx hardhat run scripts/deploy-all-deterministic.ts --network arbitrum");
        console.log("npx hardhat run scripts/deploy-all-deterministic.ts --network base");
        console.log("npx hardhat run scripts/deploy-all-deterministic.ts --network bsc");
        
        console.log("\n🔗 THEN CONFIGURE CROSS-CHAIN WIRING:");
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
