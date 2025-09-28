import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

/**
 * Deploy Core Eagle Vault Contracts (Skip Composer for Now)
 * Focus on getting cross-chain OFTs deployed for wiring
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

async function deployCoreContracts() {
    console.log("🦅 EAGLE VAULT CORE CONTRACTS DEPLOYMENT");
    console.log("========================================");
    
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
    
    // Check LayerZero endpoint
    const endpointCode = await ethers.provider.getCode(currentChain.endpointV2);
    if (endpointCode === "0x") {
        throw new Error(`LayerZero endpoint not found at ${currentChain.endpointV2}`);
    }
    console.log("✅ LayerZero endpoint verified\n");
    
    const deployedAddresses: Record<string, string> = {};
    
    try {
        if (currentChain.name === "ethereum") {
            // Hub chain: Deploy EagleOVault + Mock tokens if needed
            console.log("🚀 Deploying on HUB CHAIN (Ethereum)...");
            
            // Deploy mock tokens for testing
            console.log("   Deploying Mock WLFI...");
            const MockWLFI = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
            const mockWLFI = await MockWLFI.deploy("Wrapped LFI", "WLFI");
            await mockWLFI.waitForDeployment();
            const wlfiAddress = await mockWLFI.getAddress();
            console.log(`   ✅ Mock WLFI: ${wlfiAddress}`);
            deployedAddresses.mockWLFI = wlfiAddress;
            
            console.log("   Deploying Mock USD1...");
            const MockUSD1 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
            const mockUSD1 = await MockUSD1.deploy("USD1 Stablecoin", "USD1");
            await mockUSD1.waitForDeployment();
            const usd1Address = await mockUSD1.getAddress();
            console.log(`   ✅ Mock USD1: ${usd1Address}`);
            deployedAddresses.mockUSD1 = usd1Address;
            
            // Deploy EagleOVault
            console.log("   Deploying EagleOVault...");
            const EagleOVault = await ethers.getContractFactory("EagleOVault");
            const eagleOVault = await EagleOVault.deploy(
                wlfiAddress,
                usd1Address,
                deployer.address
            );
            await eagleOVault.waitForDeployment();
            deployedAddresses.eagleOVault = await eagleOVault.getAddress();
            console.log(`   ✅ EagleOVault: ${deployedAddresses.eagleOVault}`);
            
            // Deploy EagleShareAdapter
            console.log("   Deploying EagleShareAdapter...");
            const EagleShareAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/EagleShareAdapter.sol:EagleShareAdapter");
            const eagleShareAdapter = await EagleShareAdapter.deploy(
                deployedAddresses.eagleOVault,
                currentChain.endpointV2,
                deployer.address
            );
            await eagleShareAdapter.waitForDeployment();
            deployedAddresses.eagleShareAdapter = await eagleShareAdapter.getAddress();
            console.log(`   ✅ EagleShareAdapter: ${deployedAddresses.eagleShareAdapter}`);
            
            // Deploy WLFIAdapter
            console.log("   Deploying WLFIAdapter...");
            const WLFIAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/WLFIAdapter.sol:WLFIAdapter");
            const wlfiAdapter = await WLFIAdapter.deploy(
                wlfiAddress,
                currentChain.endpointV2,
                deployer.address
            );
            await wlfiAdapter.waitForDeployment();
            deployedAddresses.wlfiAdapter = await wlfiAdapter.getAddress();
            console.log(`   ✅ WLFIAdapter: ${deployedAddresses.wlfiAdapter}`);
            
            // Deploy USD1Adapter
            console.log("   Deploying USD1Adapter...");
            const USD1Adapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/USD1Adapter.sol:USD1Adapter");
            const usd1Adapter = await USD1Adapter.deploy(
                usd1Address,
                currentChain.endpointV2,
                deployer.address
            );
            await usd1Adapter.waitForDeployment();
            deployedAddresses.usd1Adapter = await usd1Adapter.getAddress();
            console.log(`   ✅ USD1Adapter: ${deployedAddresses.usd1Adapter}`);
            
        } else {
            // Spoke chains: Deploy Asset OFTs
            console.log(`🚀 Deploying on SPOKE CHAIN (${currentChain.name.toUpperCase()})...`);
            
            // Deploy EagleShareOFT (test version)
            console.log("   Deploying EagleShareOFT...");
            const EagleOFT = await ethers.getContractFactory("contracts/test/EagleShareOFTTest.sol:EagleShareOFTTest");
            const eagleOFT = await EagleOFT.deploy(
                "Eagle",
                "EAGLE",
                currentChain.endpointV2,
                deployer.address
            );
            await eagleOFT.waitForDeployment();
            deployedAddresses.eagleOFT = await eagleOFT.getAddress();
            console.log(`   ✅ EagleShareOFT: ${deployedAddresses.eagleOFT}`);
            
            // Deploy WLFIAssetOFT
            console.log("   Deploying WLFIAssetOFT...");
            const WLFIAssetOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/WLFIAssetOFT.sol:WLFIAssetOFT");
            const wlfiAssetOFT = await WLFIAssetOFT.deploy(
                "Wrapped LFI",
                "WLFI",
                currentChain.endpointV2,
                deployer.address
            );
            await wlfiAssetOFT.waitForDeployment();
            deployedAddresses.wlfiAssetOFT = await wlfiAssetOFT.getAddress();
            console.log(`   ✅ WLFIAssetOFT: ${deployedAddresses.wlfiAssetOFT}`);
            
            // Deploy USD1AssetOFT
            console.log("   Deploying USD1AssetOFT...");
            const USD1AssetOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/USD1AssetOFT.sol:USD1AssetOFT");
            const usd1AssetOFT = await USD1AssetOFT.deploy(
                "USD1 Stablecoin",
                "USD1",
                currentChain.endpointV2,
                deployer.address
            );
            await usd1AssetOFT.waitForDeployment();
            deployedAddresses.usd1AssetOFT = await usd1AssetOFT.getAddress();
            console.log(`   ✅ USD1AssetOFT: ${deployedAddresses.usd1AssetOFT}`);
        }
        
        // Save addresses
        saveDeploymentAddresses(currentChain.name, deployedAddresses);
        
        console.log("\n🎉 CORE DEPLOYMENT COMPLETED!");
        console.log("\n📋 DEPLOYED CONTRACTS:");
        for (const [name, address] of Object.entries(deployedAddresses)) {
            console.log(`   ${name}: ${address}`);
        }
        
        console.log("\n🔗 READY FOR CROSS-CHAIN WIRING!");
        
        return deployedAddresses;
        
    } catch (error) {
        console.error(`❌ Deployment failed on ${currentChain.name}:`, error);
        throw error;
    }
}

function saveDeploymentAddresses(chainName: string, addresses: Record<string, string>) {
    const addressFile = "core-addresses.json";
    let allAddresses: any = {};
    
    if (existsSync(addressFile)) {
        allAddresses = JSON.parse(readFileSync(addressFile, "utf8"));
    }
    
    allAddresses[chainName] = {
        ...allAddresses[chainName],
        ...addresses,
        deployedAt: new Date().toISOString()
    };
    
    writeFileSync(addressFile, JSON.stringify(allAddresses, null, 2));
    console.log(`\n💾 Addresses saved to ${addressFile}`);
}

async function main() {
    try {
        await deployCoreContracts();
        
        console.log("\n🚀 DEPLOY ON ALL CHAINS:");
        console.log("npx hardhat run scripts/deploy-core-contracts.ts --network ethereum");
        console.log("npx hardhat run scripts/deploy-core-contracts.ts --network arbitrum"); 
        console.log("npx hardhat run scripts/deploy-core-contracts.ts --network base");
        console.log("npx hardhat run scripts/deploy-core-contracts.ts --network bsc");
        
        console.log("\n🔗 THEN CONFIGURE WIRING:");
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
