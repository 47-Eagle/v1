import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

/**
 * Fixed Eagle Vault Deployment with Real Token Addresses
 * Addresses the "execution reverted" issues in the original script
 */

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
    executor: string;
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
        executor: "0x173272739Bd7Aa6e4e214714048a9fE699453059"
    },
    arbitrum: {
        chainId: 42161,
        eid: 30110,
        name: "arbitrum",
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c",
        sendLibrary: "0x975bcD720be66659e3EB3C0e4F1866a3020E493A",
        receiveLibrary: "0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6",
        layerzeroDVN: "0x2f55C492897526677C5B68fb199037c7e141B1a4",
        googleDVN: "0x23DE2FE932d9043291f870324B74F820e11dc81A",
        chainlinkDVN: "0xa7b5189bca84Cd304D8553977c7C614329750d99",
        executor: "0x31CAe3B7fB82d847621859fb1585353e6f6c97a4"
    },
    base: {
        chainId: 8453,
        eid: 30184,
        name: "base",
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c",
        sendLibrary: "0xB5320B0B3a13cC860893E2Bd79fcD7e13484Dda2",
        receiveLibrary: "0xc70AB6f32772f59fBfc23889Caf4Ba3376C84bAf",
        layerzeroDVN: "0x9e059a54699a285714207b43B055483E78FAac25",
        googleDVN: "0x54eD2628b1D24b6cF9107bE334cEF461B5d72d18",
        chainlinkDVN: "0xf49d162484290EaEAd7bb8C2c7E3a6f8f52e32b6",
        executor: "0x2CCA08ae69E0C44b18a57Ab2A87644234dAebaE4"
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
        chainlinkDVN: "0xfd869448A17476f7ADB1064D1d7b2f7b7d7b8877",
        executor: "0x1785f0cbF44C9E5d0A3E165B77Ee5caAAe3E7DA4"
    }
};

// REAL TOKEN ADDRESSES (Research these for each chain)
const TOKEN_ADDRESSES: Record<string, { wlfi?: string; usd1?: string; registry?: string }> = {
    ethereum: {
        wlfi: undefined, // Research: Does WLFI exist on Ethereum?
        usd1: undefined, // Research: Does USD1 exist on Ethereum?
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E" // Your registry (verify it exists)
    },
    arbitrum: {
        wlfi: undefined, // Research: Does WLFI exist on Arbitrum?
        usd1: undefined, // Research: Does USD1 exist on Arbitrum?
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E" // Your registry (verify it exists)
    },
    base: {
        wlfi: undefined, // Research: Does WLFI exist on Base?
        usd1: undefined, // Research: Does USD1 exist on Base?
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E" // Your registry (verify it exists)
    },
    bsc: {
        wlfi: undefined, // Research: Does WLFI exist on BSC?
        usd1: undefined, // Research: Does USD1 exist on BSC?
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E" // Your registry (verify it exists)
    }
};

interface DeployedAddresses {
    [network: string]: {
        eagleOVault?: string;
        eagleShareOFT?: string;
        eagleShareAdapter?: string;
        wlfiAdapter?: string;
        wlfiAssetOFT?: string;
        usd1Adapter?: string;
        usd1AssetOFT?: string;
        eagleComposer?: string;
        registry?: string;
    };
}

async function validateAddress(address: string, name: string): Promise<boolean> {
    try {
        if (!address || address === ethers.ZeroAddress) {
            console.log(`   ⚠️ ${name}: Zero address`);
            return false;
        }
        
        const code = await ethers.provider.getCode(address);
        if (code === "0x") {
            console.log(`   ❌ ${name}: No contract at ${address}`);
            return false;
        }
        
        console.log(`   ✅ ${name}: Valid contract at ${address}`);
        return true;
    } catch (error) {
        console.log(`   ❌ ${name}: Error checking ${address} - ${error}`);
        return false;
    }
}

async function deployContracts(chainConfig: ChainConfig): Promise<Record<string, string>> {
    console.log(`🚀 Deploying contracts on ${chainConfig.name}...`);
    
    const [deployer] = await ethers.getSigners();
    const deployedAddresses: Record<string, string> = {};
    const chainTokens = TOKEN_ADDRESSES[chainConfig.name];
    
    // Validate addresses first
    console.log(`🔍 Validating addresses on ${chainConfig.name}...`);
    
    const endpointValid = await validateAddress(chainConfig.endpointV2, "LayerZero Endpoint V2");
    if (!endpointValid) {
        throw new Error(`Invalid LayerZero endpoint on ${chainConfig.name}`);
    }
    
    if (chainTokens?.registry) {
        await validateAddress(chainTokens.registry, "Registry");
    }
    
    if (chainTokens?.wlfi) {
        await validateAddress(chainTokens.wlfi, "WLFI Token");
    }
    
    if (chainTokens?.usd1) {
        await validateAddress(chainTokens.usd1, "USD1 Token");
    }
    
    try {
        if (chainConfig.name === "ethereum") {
            // Hub chain: Deploy EagleOVault + Adapters
            
            // For testing, deploy mock tokens if real ones don't exist
            let wlfiAddress = chainTokens?.wlfi;
            let usd1Address = chainTokens?.usd1;
            
            if (!wlfiAddress) {
                console.log("   Deploying Mock WLFI for testing...");
                const MockWLFI = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
                const mockWLFI = await MockWLFI.deploy("Wrapped LFI", "WLFI");
                await mockWLFI.waitForDeployment();
                wlfiAddress = await mockWLFI.getAddress();
                console.log(`   ✅ Mock WLFI: ${wlfiAddress}`);
            }
            
            if (!usd1Address) {
                console.log("   Deploying Mock USD1 for testing...");
                const MockUSD1 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
                const mockUSD1 = await MockUSD1.deploy("USD1 Stablecoin", "USD1");
                await mockUSD1.waitForDeployment();
                usd1Address = await mockUSD1.getAddress();
                console.log(`   ✅ Mock USD1: ${usd1Address}`);
            }
            
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
            
            console.log("   Deploying EagleShareAdapter...");
            const EagleShareAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/EagleShareAdapter.sol:EagleShareAdapter");
            const eagleShareAdapter = await EagleShareAdapter.deploy(
                deployedAddresses.eagleOVault, // Vault shares token
                chainConfig.endpointV2,
                deployer.address
            );
            await eagleShareAdapter.waitForDeployment();
            deployedAddresses.eagleShareAdapter = await eagleShareAdapter.getAddress();
            console.log(`   ✅ EagleShareAdapter: ${deployedAddresses.eagleShareAdapter}`);
            
            // Only deploy WLFI adapter if WLFI exists
            if (chainTokens?.wlfi) {
                console.log("   Deploying WLFIAdapter...");
                const WLFIAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/WLFIAdapter.sol:WLFIAdapter");
                const wlfiAdapter = await WLFIAdapter.deploy(
                    wlfiAddress,
                    chainConfig.endpointV2,
                    deployer.address
                );
                await wlfiAdapter.waitForDeployment();
                deployedAddresses.wlfiAdapter = await wlfiAdapter.getAddress();
                console.log(`   ✅ WLFIAdapter: ${deployedAddresses.wlfiAdapter}`);
            }
            
            // Only deploy USD1 adapter if USD1 exists
            if (chainTokens?.usd1) {
                console.log("   Deploying USD1Adapter...");
                const USD1Adapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/USD1Adapter.sol:USD1Adapter");
                const usd1Adapter = await USD1Adapter.deploy(
                    usd1Address,
                    chainConfig.endpointV2,
                    deployer.address
                );
                await usd1Adapter.waitForDeployment();
                deployedAddresses.usd1Adapter = await usd1Adapter.getAddress();
                console.log(`   ✅ USD1Adapter: ${deployedAddresses.usd1Adapter}`);
            }
            
        } else {
            // Spoke chains: Deploy OFTs
            
            // Deploy EagleShareOFT
            if (chainTokens?.registry) {
                console.log("   Deploying EagleShareOFT (Registry-based)...");
                const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT");
                const eagleShareOFT = await EagleShareOFT.deploy(
                    "Eagle",
                    "EAGLE", 
                    chainTokens.registry,
                    deployer.address
                );
                await eagleShareOFT.waitForDeployment();
                deployedAddresses.eagleShareOFT = await eagleShareOFT.getAddress();
                console.log(`   ✅ EagleShareOFT: ${deployedAddresses.eagleShareOFT}`);
            } else {
                console.log("   ⚠️ Skipping EagleShareOFT - No valid registry address");
            }
            
            // Deploy Asset OFTs for missing tokens
            if (!chainTokens?.wlfi) {
                console.log("   Deploying WLFIAssetOFT...");
                const WLFIAssetOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/WLFIAssetOFT.sol:WLFIAssetOFT");
                const wlfiAssetOFT = await WLFIAssetOFT.deploy(
                    "Wrapped LFI",
                    "WLFI",
                    chainConfig.endpointV2,
                    deployer.address
                );
                await wlfiAssetOFT.waitForDeployment();
                deployedAddresses.wlfiAssetOFT = await wlfiAssetOFT.getAddress();
                console.log(`   ✅ WLFIAssetOFT: ${deployedAddresses.wlfiAssetOFT}`);
            } else {
                console.log("   ⚠️ Skipping WLFIAssetOFT - WLFI exists natively");
            }
            
            if (!chainTokens?.usd1) {
                console.log("   Deploying USD1AssetOFT...");
                const USD1AssetOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/USD1AssetOFT.sol:USD1AssetOFT");
                const usd1AssetOFT = await USD1AssetOFT.deploy(
                    "USD1 Stablecoin", 
                    "USD1",
                    chainConfig.endpointV2,
                    deployer.address
                );
                await usd1AssetOFT.waitForDeployment();
                deployedAddresses.usd1AssetOFT = await usd1AssetOFT.getAddress();
                console.log(`   ✅ USD1AssetOFT: ${deployedAddresses.usd1AssetOFT}`);
            } else {
                console.log("   ⚠️ Skipping USD1AssetOFT - USD1 exists natively");
            }
        }
        
        // Deploy EagleComposer on all chains
        console.log("   Deploying EagleComposer...");
        const EagleComposer = await ethers.getContractFactory("contracts/layerzero-ovault/composers/EagleComposer.sol:EagleComposer");
        const eagleComposer = await EagleComposer.deploy(
            chainConfig.endpointV2,
            deployer.address
        );
        await eagleComposer.waitForDeployment();
        deployedAddresses.eagleComposer = await eagleComposer.getAddress();
        console.log(`   ✅ EagleComposer: ${deployedAddresses.eagleComposer}`);
        
    } catch (error) {
        console.error(`❌ Deployment failed on ${chainConfig.name}:`, error);
        throw error;
    }
    
    return deployedAddresses;
}

async function main() {
    console.log("🦅 EAGLE VAULT FIXED DEPLOYMENT WITH REAL ADDRESSES");
    console.log("===================================================");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Find current chain config
    const currentChainConfig = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
    if (!currentChainConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    console.log(`📍 Chain: ${currentChainConfig.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    console.log(`📍 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    
    const chainTokens = TOKEN_ADDRESSES[currentChainConfig.name];
    console.log(`📍 WLFI Token: ${chainTokens?.wlfi || "NOT SET - will deploy mock or Asset OFT"}`);
    console.log(`📍 USD1 Token: ${chainTokens?.usd1 || "NOT SET - will deploy mock or Asset OFT"}`);
    console.log(`📍 Registry: ${chainTokens?.registry || "NOT SET - will skip registry-based deployments"}\n`);
    
    // Deploy contracts
    const newAddresses = await deployContracts(currentChainConfig);
    
    // Load and save addresses
    let allAddresses: DeployedAddresses = {};
    const deploymentsFile = "deployed-addresses.json";
    
    if (existsSync(deploymentsFile)) {
        allAddresses = JSON.parse(readFileSync(deploymentsFile, "utf8"));
    }
    
    allAddresses[currentChainConfig.name] = {
        ...allAddresses[currentChainConfig.name],
        ...newAddresses
    };
    
    writeFileSync(deploymentsFile, JSON.stringify(allAddresses, null, 2));
    console.log(`\n💾 Saved addresses to ${deploymentsFile}`);
    
    console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("\n📋 Next steps:");
    console.log("1. Research and update real WLFI/USD1 token addresses");
    console.log("2. Verify your registry contract exists and is configured");
    console.log("3. Deploy on other chains");
    console.log("4. Configure LayerZero peers and DVNs");
    console.log("5. Test cross-chain functionality");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
