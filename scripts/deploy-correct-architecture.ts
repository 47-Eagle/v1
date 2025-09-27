import { ethers } from "hardhat";
import hre from "hardhat";

/**
 * @title Deploy Correct Omnichain Architecture  
 * @notice Proper deployment using OFT Adapters for existing tokens
 * 
 * CORRECT ARCHITECTURE:
 * - Ethereum/BSC: OFT Adapters wrap existing WLFI/USD1 tokens
 * - Other chains: Regular OFT tokens (since tokens don't exist there)
 * - Preserves existing token contracts and liquidity
 * - No user migration required
 */

// Network configuration
const NETWORKS_WITH_EXISTING_TOKENS = ['ethereum', 'bsc', 'sepolia', 'bsc-testnet'];
const NETWORKS_NEED_NEW_TOKENS = ['arbitrum', 'base', 'avalanche'];

// LayerZero V2 Endpoint Addresses
const ENDPOINTS = {
    hardhat: "0x1a44076050125825900e736c501f859c50fE728c",
    ethereum: "0x1a44076050125825900e736c501f859c50fE728c",
    bsc: "0x1a44076050125825900e736c501f859c50fE728c",
    arbitrum: "0x1a44076050125825900e736c501f859c50fE728c",
    base: "0x1a44076050125825900e736c501f859c50fE728c",
    avalanche: "0x1a44076050125825900e736c501f859c50fE728c",
    sepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    'bsc-testnet': "0x6EDCE65403992e310A62460808c4b910D972f10f"
};

// LayerZero V2 Endpoint IDs
const EIDS = {
    hardhat: 30101,
    ethereum: 30101,
    bsc: 30102,
    arbitrum: 30110,
    base: 30184,
    avalanche: 30106,
    sepolia: 40161,
    'bsc-testnet': 40102
};

// Production token addresses (using exact env variable names from .env file)
const TOKEN_ADDRESSES = {
    ethereum: {
        WLFI: process.env.WLFI_ETHEREUM || "",
        USD1: process.env.USD1_ETHEREUM || ""
    },
    bsc: {
        WLFI: process.env.WLFI_BSC || "",
        USD1: process.env.USD1_BSC || ""
    },
    sepolia: {
        WLFI: process.env.WLFI_SEPOLIA || "",
        USD1: process.env.USD1_SEPOLIA || ""
    },
    'bsc-testnet': {
        WLFI: process.env.WLFI_BSC_TESTNET || "",
        USD1: process.env.USD1_BSC_TESTNET || ""
    }
};

async function main() {
    console.log("🔄 DEPLOYING CORRECT OMNICHAIN ARCHITECTURE");
    console.log("=" .repeat(60));
    
    const currentNetwork = hre.network.name;
    console.log(`📡 Current Network: ${currentNetwork}`);
    
    if (!ENDPOINTS[currentNetwork as keyof typeof ENDPOINTS]) {
        throw new Error(`❌ Unsupported network: ${currentNetwork}`);
    }
    
    const [deployer] = await ethers.getSigners();
    const lzEndpoint = ENDPOINTS[currentNetwork as keyof typeof ENDPOINTS];
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`🔗 LayerZero Endpoint: ${lzEndpoint}`);
    
    // Determine deployment strategy based on network
    if (currentNetwork === 'ethereum' || currentNetwork === 'sepolia' || currentNetwork === 'hardhat') {
        console.log("🏦 DEPLOYING HUB CHAIN WITH CORRECT ARCHITECTURE");
        await deployHubWithCorrectArchitecture(currentNetwork, lzEndpoint, deployer);
    } else if (NETWORKS_WITH_EXISTING_TOKENS.includes(currentNetwork)) {
        console.log("🌍 DEPLOYING SPOKE WITH EXISTING TOKENS (OFT Adapters)");
        await deploySpokeWithAdapters(currentNetwork, lzEndpoint, deployer);
    } else {
        console.log("🌍 DEPLOYING SPOKE WITH NEW TOKENS (OFT Tokens)");
        await deploySpokeWithNewTokens(currentNetwork, lzEndpoint, deployer);
    }
}

/**
 * Deploy Hub Chain with correct architecture
 */
async function deployHubWithCorrectArchitecture(network: string, lzEndpoint: string, deployer: any) {
    const tokenAddresses = TOKEN_ADDRESSES[network as keyof typeof TOKEN_ADDRESSES];
    
    // =================================
    // DEPLOY OR GET EXISTING TOKENS
    // =================================
    
    let wlfiAddress: string;
    let usd1Address: string;
    
    if (tokenAddresses?.WLFI && tokenAddresses?.USD1) {
        console.log("\n📋 Using existing production tokens:");
        wlfiAddress = tokenAddresses.WLFI;
        usd1Address = tokenAddresses.USD1;
        console.log(`✅ WLFI Token: ${wlfiAddress}`);
        console.log(`✅ USD1 Token: ${usd1Address}`);
    } else {
        console.log("\n📦 Deploying mock tokens for testing...");
        
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const wlfiToken = await MockERC20.deploy("World Liberty Financial", "WLFI");
        await wlfiToken.waitForDeployment();
        wlfiAddress = await wlfiToken.getAddress();
        
        const usd1Token = await MockERC20.deploy("USD1", "USD1");
        await usd1Token.waitForDeployment();
        usd1Address = await usd1Token.getAddress();
        
        console.log(`✅ WLFI Token (mock): ${wlfiAddress}`);
        console.log(`✅ USD1 Token (mock): ${usd1Address}`);
    }
    
    // =================================
    // DEPLOY MAIN VAULT
    // =================================
    
    console.log("\n🏦 Deploying Eagle Vault V2...");
    
    const EagleOVaultV2 = await ethers.getContractFactory("EagleOVaultV2");
    const eagleVault = await EagleOVaultV2.deploy(
        wlfiAddress,
        usd1Address,
        deployer.address
    );
    await eagleVault.waitForDeployment();
    const vaultAddress = await eagleVault.getAddress();
    console.log(`✅ Eagle Vault V2: ${vaultAddress}`);
    
    // =================================
    // DEPLOY CHARM STRATEGY
    // =================================
    
    console.log("\n🎯 Deploying Charm Strategy...");
    
    const MockAlphaFactory = await ethers.getContractFactory("MockAlphaProVaultFactory");
    const alphaFactory = await MockAlphaFactory.deploy();
    await alphaFactory.waitForDeployment();
    const alphaFactoryAddress = await alphaFactory.getAddress();
    
    const CharmStrategy = await ethers.getContractFactory("CharmAlphaVaultStrategy");
    const charmStrategy = await CharmStrategy.deploy(
        vaultAddress,
        alphaFactoryAddress,
        wlfiAddress,
        usd1Address,
        deployer.address
    );
    await charmStrategy.waitForDeployment();
    const strategyAddress = await charmStrategy.getAddress();
    console.log(`✅ Charm Strategy: ${strategyAddress}`);
    
    // Initialize strategy
    const initTx = await charmStrategy.initializeVault(ethers.parseEther("10000000"));
    await initTx.wait();
    
    const addStrategyTx = await eagleVault.addStrategy(strategyAddress, 3000); // 30%
    await addStrategyTx.wait();
    console.log("✅ Strategy initialized and added (30% allocation)");
    
    // =================================
    // DEPLOY OFT ADAPTERS FOR EXISTING TOKENS
    // =================================
    
    console.log("\n🔄 Deploying OFT Adapters for existing tokens...");
    
    // WLFI OFT Adapter (wraps existing WLFI)
    const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
    const wlfiAdapter = await WLFIAdapter.deploy(
        wlfiAddress,
        lzEndpoint,
        deployer.address
    );
    await wlfiAdapter.waitForDeployment();
    const wlfiAdapterAddress = await wlfiAdapter.getAddress();
    console.log(`✅ WLFI OFT Adapter: ${wlfiAdapterAddress}`);
    
    // USD1 OFT Adapter (wraps existing USD1)
    const USD1Adapter = await ethers.getContractFactory("USD1AssetOFTAdapter");
    const usd1Adapter = await USD1Adapter.deploy(
        usd1Address,
        lzEndpoint,
        deployer.address
    );
    await usd1Adapter.waitForDeployment();
    const usd1AdapterAddress = await usd1Adapter.getAddress();
    console.log(`✅ USD1 OFT Adapter: ${usd1AdapterAddress}`);
    
    // Eagle Share OFT Adapter (wraps vault shares)
    const EagleShareAdapter = await ethers.getContractFactory("EagleShareOFTAdapter");
    const eagleAdapter = await EagleShareAdapter.deploy(
        vaultAddress,
        lzEndpoint,
        deployer.address
    );
    await eagleAdapter.waitForDeployment();
    const eagleAdapterAddress = await eagleAdapter.getAddress();
    console.log(`✅ Eagle Share OFT Adapter: ${eagleAdapterAddress}`);
    
    // =================================
    // DEPLOY VAULT COMPOSER
    // =================================
    
    console.log("\n🎼 Deploying Vault Composer...");
    
    const EagleOVaultComposer = await ethers.getContractFactory("EagleOVaultComposer");
    const composer = await EagleOVaultComposer.deploy(
        vaultAddress,
        wlfiAdapterAddress,
        eagleAdapterAddress
    );
    await composer.waitForDeployment();
    const composerAddress = await composer.getAddress();
    console.log(`✅ Vault Composer: ${composerAddress}`);
    
    // =================================
    // DEPLOYMENT SUMMARY
    // =================================
    
    console.log("\n🎉 HUB DEPLOYMENT COMPLETE!");
    console.log("=" .repeat(60));
    console.log("HUB CONTRACTS:");
    console.log(`🏦 Eagle Vault V2:        ${vaultAddress}`);
    console.log(`🎯 Charm Strategy:        ${strategyAddress}`);
    console.log(`🎼 Vault Composer:        ${composerAddress}`);
    console.log();
    console.log("EXISTING TOKENS:");
    console.log(`🪙 WLFI Token:            ${wlfiAddress}`);
    console.log(`🪙 USD1 Token:            ${usd1Address}`);
    console.log();
    console.log("OFT ADAPTERS (wrapping existing tokens):");
    console.log(`🔄 WLFI OFT Adapter:      ${wlfiAdapterAddress}`);
    console.log(`🔄 USD1 OFT Adapter:      ${usd1AdapterAddress}`);
    console.log(`🔄 Eagle Share Adapter:   ${eagleAdapterAddress}`);
    console.log("=" .repeat(60));
    
    console.log("\n💡 Architecture Benefits:");
    console.log("✅ Preserves existing WLFI/USD1 token contracts");
    console.log("✅ No user migration required");
    console.log("✅ Existing integrations continue to work");
    console.log("✅ Liquidity not fragmented");
    console.log("✅ Users interact with familiar tokens");
}

/**
 * Deploy Spoke Chain with OFT Adapters (for chains with existing tokens)
 */
async function deploySpokeWithAdapters(network: string, lzEndpoint: string, deployer: any) {
    const tokenAddresses = TOKEN_ADDRESSES[network as keyof typeof TOKEN_ADDRESSES];
    
    if (!tokenAddresses?.WLFI || !tokenAddresses?.USD1) {
        throw new Error(`❌ Existing token addresses required for ${network}. Set WLFI_TOKEN_${network.toUpperCase()} and USD1_TOKEN_${network.toUpperCase()} environment variables.`);
    }
    
    console.log(`\n📋 Using existing ${network} tokens:`);
    console.log(`🪙 WLFI: ${tokenAddresses.WLFI}`);
    console.log(`🪙 USD1: ${tokenAddresses.USD1}`);
    
    // =================================
    // DEPLOY OFT ADAPTERS
    // =================================
    
    console.log("\n🔄 Deploying OFT Adapters...");
    
    // WLFI OFT Adapter
    const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
    const wlfiAdapter = await WLFIAdapter.deploy(
        tokenAddresses.WLFI,
        lzEndpoint,
        deployer.address
    );
    await wlfiAdapter.waitForDeployment();
    const wlfiAdapterAddress = await wlfiAdapter.getAddress();
    console.log(`✅ WLFI OFT Adapter: ${wlfiAdapterAddress}`);
    
    // USD1 OFT Adapter
    const USD1Adapter = await ethers.getContractFactory("USD1AssetOFTAdapter");
    const usd1Adapter = await USD1Adapter.deploy(
        tokenAddresses.USD1,
        lzEndpoint,
        deployer.address
    );
    await usd1Adapter.waitForDeployment();
    const usd1AdapterAddress = await usd1Adapter.getAddress();
    console.log(`✅ USD1 OFT Adapter: ${usd1AdapterAddress}`);
    
    // Eagle Share OFT (new token on spoke)
    const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
    const eagleShareOFT = await EagleShareOFT.deploy(
        "Eagle Vault Shares",
        "EAGLE",
        lzEndpoint,
        deployer.address
    );
    await eagleShareOFT.waitForDeployment();
    const eagleOFTAddress = await eagleShareOFT.getAddress();
    console.log(`✅ Eagle Share OFT: ${eagleOFTAddress}`);
    
    console.log(`\n🎉 ${network.toUpperCase()} SPOKE DEPLOYMENT COMPLETE!`);
    console.log("=" .repeat(60));
    console.log("EXISTING TOKENS (wrapped by adapters):");
    console.log(`🪙 WLFI Token:            ${tokenAddresses.WLFI}`);
    console.log(`🪙 USD1 Token:            ${tokenAddresses.USD1}`);
    console.log();
    console.log("OFT ADAPTERS:");
    console.log(`🔄 WLFI OFT Adapter:      ${wlfiAdapterAddress}`);
    console.log(`🔄 USD1 OFT Adapter:      ${usd1AdapterAddress}`);
    console.log();
    console.log("NEW OFT TOKENS:");
    console.log(`🪙 Eagle Share OFT:       ${eagleOFTAddress}`);
    console.log("=" .repeat(60));
}

/**
 * Deploy Spoke Chain with new OFT tokens (for chains without existing tokens)
 */
async function deploySpokeWithNewTokens(network: string, lzEndpoint: string, deployer: any) {
    console.log(`\n📦 Deploying new OFT tokens for ${network}...`);
    
    // WLFI Asset OFT (new token)
    const WLFIAssetOFT = await ethers.getContractFactory("WLFIAssetOFT");
    const wlfiOFT = await WLFIAssetOFT.deploy(
        "World Liberty Financial",
        "WLFI",
        lzEndpoint,
        deployer.address
    );
    await wlfiOFT.waitForDeployment();
    const wlfiOFTAddress = await wlfiOFT.getAddress();
    console.log(`✅ WLFI Asset OFT: ${wlfiOFTAddress}`);
    
    // USD1 Asset OFT (new token)
    const USD1AssetOFT = await ethers.getContractFactory("USD1AssetOFT");
    const usd1OFT = await USD1AssetOFT.deploy(
        "USD1",
        "USD1",
        lzEndpoint,
        deployer.address
    );
    await usd1OFT.waitForDeployment();
    const usd1OFTAddress = await usd1OFT.getAddress();
    console.log(`✅ USD1 Asset OFT: ${usd1OFTAddress}`);
    
    // Eagle Share OFT (new token)
    const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
    const eagleShareOFT = await EagleShareOFT.deploy(
        "Eagle Vault Shares",
        "EAGLE",
        lzEndpoint,
        deployer.address
    );
    await eagleShareOFT.waitForDeployment();
    const eagleOFTAddress = await eagleShareOFT.getAddress();
    console.log(`✅ Eagle Share OFT: ${eagleOFTAddress}`);
    
    console.log(`\n🎉 ${network.toUpperCase()} SPOKE DEPLOYMENT COMPLETE!`);
    console.log("=" .repeat(60));
    console.log("NEW OFT TOKENS:");
    console.log(`🪙 WLFI Asset OFT:        ${wlfiOFTAddress}`);
    console.log(`🪙 USD1 Asset OFT:        ${usd1OFTAddress}`);
    console.log(`🪙 Eagle Share OFT:       ${eagleOFTAddress}`);
    console.log("=" .repeat(60));
}

// Execute deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exit(1);
        });
}

export { main as deployCorrectArchitecture };
