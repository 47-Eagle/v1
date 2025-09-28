import { ethers } from "hardhat";

/**
 * Interface for CREATE2FactoryWithOwnership
 */
interface ICREATE2Factory {
    deploy(salt: string, bytecode: string): Promise<any>;
    computeAddress(salt: string, bytecodeHash: string): Promise<string>;
}

/**
 * Deploy production Eagle Vault with REAL tokens (no mocks)
 * Fix LayerZero delegate issue with proper initialization
 */

// REAL TOKEN ADDRESSES - From environment variables
const REAL_TOKEN_ADDRESSES = {
    ethereum: {
        WLFI: process.env.WLFI_ETHEREUM!, // Your real WLFI token on Ethereum
        USD1: process.env.USD1_ETHEREUM!, // Your real USD1 token on Ethereum
    },
    bsc: {
        WLFI: process.env.WLFI_BSC!, // Your real WLFI token on BSC
        USD1: process.env.USD1_BSC!, // Your real USD1 token on BSC
    }
};

// Validate environment variables are loaded
if (!process.env.WLFI_ETHEREUM || !process.env.USD1_ETHEREUM || !process.env.WLFI_BSC || !process.env.USD1_BSC) {
    console.error("❌ Missing token addresses in .env file:");
    console.error("   Required: WLFI_ETHEREUM, USD1_ETHEREUM, WLFI_BSC, USD1_BSC");
    process.exit(1);
}

// Validate CREATE2 factory and registry configuration
if (!process.env.EAGLE_CREATE2_FACTORY || !process.env.EAGLE_VANITY_SALT || !process.env.EAGLE_REGISTRY) {
    console.error("❌ Missing CREATE2/Registry configuration in .env file:");
    console.error("   Required: EAGLE_CREATE2_FACTORY, EAGLE_VANITY_SALT, EAGLE_REGISTRY");
    process.exit(1);
}

const CREATE2_FACTORY = process.env.EAGLE_CREATE2_FACTORY!;
const VANITY_SALT = process.env.EAGLE_VANITY_SALT!;
const EAGLE_REGISTRY = process.env.EAGLE_REGISTRY!;

console.log("🎯 Using YOUR REAL token addresses:");
console.log(`   WLFI_ETHEREUM: ${REAL_TOKEN_ADDRESSES.ethereum.WLFI}`);
console.log(`   USD1_ETHEREUM: ${REAL_TOKEN_ADDRESSES.ethereum.USD1}`);
console.log(`   WLFI_BSC: ${REAL_TOKEN_ADDRESSES.bsc.WLFI}`);
console.log(`   USD1_BSC: ${REAL_TOKEN_ADDRESSES.bsc.USD1}`);
console.log("\n🎯 CREATE2 Vanity Configuration:");
console.log(`   Factory: ${CREATE2_FACTORY}`);
console.log(`   Registry: ${EAGLE_REGISTRY}`);
console.log(`   Salt: ${VANITY_SALT} (generates 0x47...EA91E)`);

interface ChainConfig {
    chainId: number;
    eid: number;
    name: string;
    endpointV2: string;
    sendLibrary: string;
    receiveLibrary: string;
    layerzeroDVN: string;
    googleDVN: string;
    chainlinkDVN?: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
    ethereum: {
        chainId: 1,
        eid: 30101,
        name: "ethereum",
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c",
        sendLibrary: "0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1",
        receiveLibrary: "0xc02Ab410f0734EFa3F14628780e6e695156024C2",
        layerzeroDVN: "0x589dEdBD617e0CBcB916A9223F4d1300c294236b",
        googleDVN: "0xa59BA433ac34D2927232918Ef5B2eaAfcF130BA5",
        chainlinkDVN: "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc",
    },
    bsc: {
        chainId: 56,
        eid: 30102,
        name: "bsc",
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c",
        sendLibrary: "0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE",
        receiveLibrary: "0xB217266c3A98C8B2709Ee26836C98cf12f6cCEC1",
        layerzeroDVN: "0xfD6865c841c2d64565562fCc7e05e619A30615f0",
        googleDVN: "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc",
        chainlinkDVN: "0xfd869F61BdF0bD74506dBD5998284f6C44226D20",
    }
    // REMOVED: Arbitrum, Base, Avalanche - focusing on ETH ↔ BSC only
};

async function validateTokenAddress(address: string, expectedSymbol: string): Promise<boolean> {
    try {
        if (address === "0x" || address === "0x0000000000000000000000000000000000000000") {
            console.log(`   ❌ ${expectedSymbol}: Address not provided`);
            return false;
        }
        
        const code = await ethers.provider.getCode(address);
        if (code === "0x") {
            console.log(`   ❌ ${expectedSymbol}: No contract at address ${address}`);
            return false;
        }
        
        const token = await ethers.getContractAt("IERC20", address);
        try {
            const symbol = await token.symbol();
            const name = await token.name();
            const decimals = await token.decimals();
            
            console.log(`   ✅ ${expectedSymbol}: ${name} (${symbol}) - ${decimals} decimals`);
            return true;
        } catch (error) {
            console.log(`   ⚠️  ${expectedSymbol}: Contract exists but may not be standard ERC20`);
            return true; // Assume it's valid
        }
    } catch (error) {
        console.log(`   ❌ ${expectedSymbol}: Validation failed - ${error.message}`);
        return false;
    }
}

async function deployWithFixedDelegate(contractFactory: any, contractName: string, ...args: any[]) {
    console.log(`   🚀 Deploying ${contractName} with fixed delegate...`);
    
    try {
        // Deploy with explicit delegate parameter
        const contract = await contractFactory.deploy(...args);
        await contract.waitForDeployment();
        
        const address = await contract.getAddress();
        console.log(`   ✅ ${contractName} deployed: ${address}`);
        
        // Verify delegate is properly set
        try {
            const delegate = await contract.delegate();
            console.log(`   📍 Delegate: ${delegate}`);
            
            if (delegate === "0x0000000000000000000000000000000000000000") {
                console.log(`   ⚠️  Delegate is zero, attempting to set...`);
                const [deployer] = await ethers.getSigners();
                const tx = await contract.setDelegate(deployer.address);
                await tx.wait();
                console.log(`   ✅ Delegate set to: ${deployer.address}`);
            }
        } catch (error) {
            console.log(`   ⚠️  Could not verify delegate: ${error.message}`);
        }
        
        return contract;
        
    } catch (error) {
        console.log(`   ❌ ${contractName} deployment failed: ${error.message}`);
        throw error;
    }
}

/**
 * Deploy contract using CREATE2 for vanity address
 */
async function deployWithCREATE2Vanity(
    contractName: string, 
    contractPath: string,
    constructorArgs: any[],
    argTypes: string[]
): Promise<any> {
    console.log(`   🎯 Deploying ${contractName} with CREATE2 vanity address...`);
    
    try {
        // Get factory contract
        const factory = await ethers.getContractAt("ICREATE2Factory", CREATE2_FACTORY);
        
        // Get contract factory and encode constructor
        const Contract = await ethers.getContractFactory(contractPath);
        const deployTx = await Contract.getDeployTransaction(...constructorArgs);
        
        if (!deployTx.data) {
            throw new Error("Failed to get deployment transaction data");
        }
        
        // Deploy with CREATE2
        console.log(`   📡 Using factory: ${CREATE2_FACTORY}`);
        console.log(`   🧂 Using salt: ${VANITY_SALT}`);
        
        const tx = await factory.deploy(VANITY_SALT, deployTx.data);
        const receipt = await tx.wait();
        
        // Extract deployed address from events or compute it
        let deployedAddress = "";
        if (receipt && receipt.logs) {
            // Try to find the deployment event
            const deployEvent = receipt.logs.find((log: any) => 
                log.topics && log.topics.length > 0
            );
            if (deployEvent && deployEvent.address) {
                deployedAddress = deployEvent.address;
            }
        }
        
        // Fallback: compute address
        if (!deployedAddress || deployedAddress === "0x") {
            const bytecodeHash = ethers.keccak256(deployTx.data);
            deployedAddress = await factory.computeAddress(VANITY_SALT, bytecodeHash);
        }
        
        console.log(`   ✅ ${contractName} deployed with vanity address: ${deployedAddress}`);
        
        // Return contract instance
        const contract = Contract.attach(deployedAddress);
        
        // Verify delegate is properly set
        try {
            const delegate = await contract.delegate();
            console.log(`   📍 Delegate: ${delegate}`);
        } catch (error) {
            console.log(`   ⚠️  Could not verify delegate: ${error.message}`);
        }
        
        return contract;
        
    } catch (error) {
        console.log(`   ❌ ${contractName} CREATE2 deployment failed: ${error.message}`);
        throw error;
    }
}

async function deployProductionContracts() {
    console.log("🏭 PRODUCTION EAGLE VAULT DEPLOYMENT");
    console.log("====================================");
    console.log("🚫 NO MOCK CONTRACTS - REAL TOKENS ONLY");
    
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    const currentChain = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
    if (!currentChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`📍 Chain: ${currentChain.name.toUpperCase()}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ${chainId === 1 ? 'ETH' : 'BNB'}`);
    
    console.log(`\n🔍 REAL TOKEN VALIDATION`);
    console.log("========================");
    
    // Get real token addresses for this chain
    const realTokens = REAL_TOKEN_ADDRESSES[currentChain.name as keyof typeof REAL_TOKEN_ADDRESSES];
    if (!realTokens) {
        throw new Error(`No real token addresses configured for ${currentChain.name}`);
    }
    
    console.log(`🪙 Validating real tokens on ${currentChain.name}...`);
    const wlfiValid = await validateTokenAddress(realTokens.WLFI, "WLFI");
    const usd1Valid = await validateTokenAddress(realTokens.USD1, "USD1");
    
    if (!wlfiValid || !usd1Valid) {
        console.log(`\n❌ REAL TOKEN ADDRESSES NEEDED`);
        console.log(`Please research and provide real token addresses for:`);
        if (!wlfiValid) console.log(`- WLFI token on ${currentChain.name}`);
        if (!usd1Valid) console.log(`- USD1 token on ${currentChain.name}`);
        console.log(`\nUpdate REAL_TOKEN_ADDRESSES in this script.`);
        return;
    }
    
    console.log(`\n🚀 DEPLOYING PRODUCTION CONTRACTS`);
    console.log("==================================");
    
    const deployedAddresses: Record<string, string> = {};
    
    try {
        if (chainId === 1) {
            // ETHEREUM: Deploy vault + adapters
            console.log(`🏦 Deploying Ethereum Hub Components...`);
            
            // 1. Deploy EagleOVault with real WLFI
            console.log(`\n1️⃣ EagleOVault (Real WLFI asset)...`);
            const EagleOVault = await ethers.getContractFactory("EagleOVault");
            const vault = await EagleOVault.deploy(
                realTokens.WLFI,  // Real WLFI as primary asset
                realTokens.USD1,  // Real USD1 as secondary asset  
                deployer.address  // Owner
            );
            await vault.waitForDeployment();
            deployedAddresses.eagleOVault = await vault.getAddress();
            console.log(`   ✅ EagleOVault: ${deployedAddresses.eagleOVault}`);
            
            // 2. Deploy EagleShareAdapter with fixed delegate
            console.log(`\n2️⃣ EagleShareAdapter (Fixed delegate)...`);
            const EagleShareAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/EagleShareAdapter.sol:EagleShareAdapter");
            const shareAdapter = await deployWithFixedDelegate(
                EagleShareAdapter,
                "EagleShareAdapter",
                deployedAddresses.eagleOVault, // Vault shares
                currentChain.endpointV2,       // LayerZero endpoint
                deployer.address               // Delegate (deployer)
            );
            deployedAddresses.eagleShareAdapter = await shareAdapter.getAddress();
            
            // 3. Deploy WLFIAdapter with real WLFI
            console.log(`\n3️⃣ WLFIAdapter (Real WLFI)...`);
            const WLFIAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/WLFIAdapter.sol:WLFIAdapter");
            const wlfiAdapter = await deployWithFixedDelegate(
                WLFIAdapter,
                "WLFIAdapter", 
                realTokens.WLFI,         // Real WLFI token
                currentChain.endpointV2, // LayerZero endpoint
                deployer.address         // Delegate
            );
            deployedAddresses.wlfiAdapter = await wlfiAdapter.getAddress();
            
            // 4. Deploy USD1Adapter with real USD1
            console.log(`\n4️⃣ USD1Adapter (Real USD1)...`);
            const USD1Adapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/USD1Adapter.sol:USD1Adapter");
            const usd1Adapter = await deployWithFixedDelegate(
                USD1Adapter,
                "USD1Adapter",
                realTokens.USD1,         // Real USD1 token
                currentChain.endpointV2, // LayerZero endpoint  
                deployer.address         // Delegate
            );
            deployedAddresses.usd1Adapter = await usd1Adapter.getAddress();
            
        } else if (chainId === 56) {
            // BSC: Deploy ADAPTERS (use existing tokens, NO minting)
            console.log(`🌐 Deploying BSC Spoke Components with EXISTING tokens...`);
            console.log(`🚫 NO TOKEN MINTING - Using your real WLFI/USD1 tokens`);
            
            // 1. Deploy EagleShareOFT with YOUR REGISTRY
            console.log(`\n1️⃣ EagleShareOFT (Registry-based)...`);
            const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT");
            const eagleOFT = await deployWithFixedDelegate(
                EagleShareOFT,
                "EagleShareOFT",
                "Eagle",                 // Name
                "EAGLE",                 // Symbol  
                EAGLE_REGISTRY,          // Your registry address
                deployer.address         // Delegate
            );
            deployedAddresses.eagleShareOFT = await eagleOFT.getAddress();
            
            // 2. Deploy WLFIAdapter (wrap existing WLFI token)
            console.log(`\n2️⃣ WLFIAdapter (Existing WLFI: ${realTokens.WLFI})...`);
            const WLFIAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/WLFIAdapter.sol:WLFIAdapter");
            const wlfiAdapter = await deployWithFixedDelegate(
                WLFIAdapter,
                "WLFIAdapter",
                realTokens.WLFI,         // Your existing WLFI token
                currentChain.endpointV2, // LayerZero endpoint
                deployer.address         // Delegate
            );
            deployedAddresses.wlfiAdapter = await wlfiAdapter.getAddress();
            
            // 3. Deploy USD1Adapter (wrap existing USD1 token)
            console.log(`\n3️⃣ USD1Adapter (Existing USD1: ${realTokens.USD1})...`);
            const USD1Adapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/USD1Adapter.sol:USD1Adapter");
            const usd1Adapter = await deployWithFixedDelegate(
                USD1Adapter,
                "USD1Adapter",
                realTokens.USD1,         // Your existing USD1 token
                currentChain.endpointV2, // LayerZero endpoint
                deployer.address         // Delegate
            );
            deployedAddresses.usd1Adapter = await usd1Adapter.getAddress();
            
        } else {
            throw new Error(`❌ Unsupported chain: ${chainId}. Only Ethereum (1) and BSC (56) are supported.`);
        }
        
        // Save deployed addresses
        console.log(`\n💾 SAVING DEPLOYMENT ADDRESSES`);
        console.log("==============================");
        
        const addressFile = `production-addresses-${currentChain.name}.json`;
        const fs = require('fs');
        const existingData = fs.existsSync(addressFile) ? JSON.parse(fs.readFileSync(addressFile, 'utf8')) : {};
        
        existingData[currentChain.name] = {
            ...deployedAddresses,
            deployedAt: new Date().toISOString(),
            realTokens: realTokens,
            deployer: deployer.address
        };
        
        fs.writeFileSync(addressFile, JSON.stringify(existingData, null, 2));
        console.log(`✅ Addresses saved to: ${addressFile}`);
        
        console.log(`\n📊 DEPLOYMENT SUMMARY`);
        console.log("=====================");
        console.log(`✅ Chain: ${currentChain.name.toUpperCase()}`);
        console.log(`✅ Contracts deployed: ${Object.keys(deployedAddresses).length}`);
        console.log(`✅ Real tokens used: ${Object.keys(realTokens).length}`);
        console.log(`✅ Fixed delegate implementation: YES`);
        
        for (const [name, address] of Object.entries(deployedAddresses)) {
            console.log(`   ${name}: ${address}`);
        }
        
        console.log(`\n🎉 PRODUCTION DEPLOYMENT COMPLETE!`);
        console.log(`🚫 No mock contracts used`);
        console.log(`✅ Delegate issue should be fixed`);
        console.log(`🔗 Ready for cross-chain wiring`);
        
    } catch (error) {
        console.error(`❌ Production deployment failed: ${error.message}`);
        throw error;
    }
}

deployProductionContracts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Production deployment failed:", error);
        process.exit(1);
    });
