import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Complete Eagle Vault Deployment + LayerZero V2 Configuration
 * Deploys contracts and immediately configures LayerZero settings
 */

interface ChainConfig {
    chainId: number;
    eid: number;
    name: string;
    rpcUrl?: string;
    endpointV2: string;
    sendLibrary: string;
    receiveLibrary: string;
    // DVN addresses
    layerzeroDVN: string;
    googleDVN: string;
    chainlinkDVN?: string;
    polyhedraDVN?: string;
    executor: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
    ethereum: {
        chainId: 1,
        eid: 30101,
        name: "ethereum",
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c",
        sendLibrary: "0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1", // ULN V2
        receiveLibrary: "0xc02Ab410f0734EFa3F14628780e6e695156024C2", // ULN V2
        layerzeroDVN: "0x589dEdBD617e0CBcB916A9223F4d1300c294236b",
        googleDVN: "0xa59BA433ac34D2927232918Ef5B2eaAfcF130BA5",
        chainlinkDVN: "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc",
        polyhedraDVN: "0x8ddf05F9A5c488b4973897E278B58895bF87Cb24",
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
        polyhedraDVN: "0x8ddf05F9A5c488b4973897E278B58895bF87Cb24",
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

const DEPLOYMENTS_FILE = "deployed-addresses.json";

function loadDeployedAddresses(): DeployedAddresses {
    if (existsSync(DEPLOYMENTS_FILE)) {
        return JSON.parse(readFileSync(DEPLOYMENTS_FILE, "utf8"));
    }
    return {};
}

function saveDeployedAddresses(addresses: DeployedAddresses) {
    writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(addresses, null, 2));
}

async function deployContracts(chainConfig: ChainConfig): Promise<Record<string, string>> {
    console.log(`🚀 Deploying contracts on ${chainConfig.name}...`);
    
    const [deployer] = await ethers.getSigners();
    const deployedAddresses: Record<string, string> = {};
    
    // Mock token addresses (replace with real ones)
    const WLFI_TOKEN = "0x1111111111111111111111111111111111111111"; // Replace with real WLFI
    const USD1_TOKEN = "0x2222222222222222222222222222222222222222"; // Replace with real USD1
    const REGISTRY_ADDRESS = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E"; // Your registry
    
    try {
        if (chainConfig.name === "ethereum") {
            // Hub chain: Deploy EagleOVault + Adapters
            console.log("   Deploying EagleOVault...");
            const EagleOVault = await ethers.getContractFactory("EagleOVault");
            const eagleOVault = await EagleOVault.deploy(
                WLFI_TOKEN,
                USD1_TOKEN,
                deployer.address
            );
            await eagleOVault.waitForDeployment();
            deployedAddresses.eagleOVault = await eagleOVault.getAddress();
            console.log(`   ✅ EagleOVault: ${deployedAddresses.eagleOVault}`);
            
            // Deploy EagleShareAdapter (wraps vault shares)
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
            
            // Check if WLFI exists, deploy adapter or OFT accordingly
            const wlfiExists = true; // Set based on your research
            if (wlfiExists) {
                console.log("   Deploying WLFIAdapter...");
                const WLFIAdapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/WLFIAdapter.sol:WLFIAdapter");
                const wlfiAdapter = await WLFIAdapter.deploy(
                    WLFI_TOKEN,
                    chainConfig.endpointV2,
                    deployer.address
                );
                await wlfiAdapter.waitForDeployment();
                deployedAddresses.wlfiAdapter = await wlfiAdapter.getAddress();
                console.log(`   ✅ WLFIAdapter: ${deployedAddresses.wlfiAdapter}`);
            }
            
            // Check if USD1 exists
            const usd1Exists = true; // Set based on your research
            if (usd1Exists) {
                console.log("   Deploying USD1Adapter...");
                const USD1Adapter = await ethers.getContractFactory("contracts/layerzero-ovault/adapters/USD1Adapter.sol:USD1Adapter");
                const usd1Adapter = await USD1Adapter.deploy(
                    USD1_TOKEN,
                    chainConfig.endpointV2,
                    deployer.address
                );
                await usd1Adapter.waitForDeployment();
                deployedAddresses.usd1Adapter = await usd1Adapter.getAddress();
                console.log(`   ✅ USD1Adapter: ${deployedAddresses.usd1Adapter}`);
            }
            
        } else {
            // Spoke chains: Deploy OFTs
            console.log("   Deploying EagleShareOFT...");
            const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT");
            const eagleShareOFT = await EagleShareOFT.deploy(
                "Eagle",
                "EAGLE", 
                REGISTRY_ADDRESS,
                deployer.address
            );
            await eagleShareOFT.waitForDeployment();
            deployedAddresses.eagleShareOFT = await eagleShareOFT.getAddress();
            console.log(`   ✅ EagleShareOFT: ${deployedAddresses.eagleShareOFT}`);
            
            // Deploy Asset OFTs for missing tokens
            const wlfiExists = false; // Research each chain
            if (!wlfiExists) {
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
            }
            
            const usd1Exists = false; // Research each chain
            if (!usd1Exists) {
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

async function configureLayerZero(chainConfig: ChainConfig, deployedAddresses: DeployedAddresses) {
    console.log(`⚙️ Configuring LayerZero on ${chainConfig.name}...`);
    
    const [deployer] = await ethers.getSigners();
    const currentChainAddresses = deployedAddresses[chainConfig.name] || {};
    
    // Get the main OFT/Adapter for this chain
    const mainContractAddress = currentChainAddresses.eagleShareOFT || 
                               currentChainAddresses.eagleShareAdapter;
    
    if (!mainContractAddress) {
        console.log("   ⚠️ No main contract found, skipping configuration");
        return;
    }
    
    const mainContract = await ethers.getContractAt(
        currentChainAddresses.eagleShareOFT ? "EagleShareOFT" : "EagleShareAdapter",
        mainContractAddress
    );
    
    const endpointV2 = await ethers.getContractAt("ILayerZeroEndpointV2", chainConfig.endpointV2);
    
    // 1. SET PEERS
    console.log("   1️⃣ Setting peers...");
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === chainConfig.name) continue;
        
        const remoteAddresses = deployedAddresses[remoteName];
        if (!remoteAddresses) continue;
        
        const remotePeerAddress = remoteAddresses.eagleShareOFT || 
                                remoteAddresses.eagleShareAdapter;
        
        if (remotePeerAddress) {
            const peerBytes32 = ethers.zeroPadValue(remotePeerAddress, 32);
            try {
                const tx = await mainContract.setPeer(remoteConfig.eid, peerBytes32);
                await tx.wait();
                console.log(`      ✅ Peer set for ${remoteName}`);
            } catch (error) {
                console.log(`      ⚠️ Failed to set peer for ${remoteName}:`, error);
            }
        }
    }
    
    // 2. SET ENFORCED OPTIONS
    console.log("   2️⃣ Setting enforced options...");
    const enforcedOptions = [];
    
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === chainConfig.name) continue;
        
        const gasLimit = 200000; // 200k gas for lzReceive
        const msgValue = 0;
        
        // Create Type 3 options (ExecutorLzReceiveOption)
        const options = ethers.concat([
            "0x0003", // Type 3
            "0x0001", // ExecutorLzReceiveOption
            ethers.zeroPadValue(ethers.toBeHex(gasLimit), 16), // Gas limit (128 bits)
            ethers.zeroPadValue(ethers.toBeHex(msgValue), 16)  // Msg value (128 bits)
        ]);
        
        enforcedOptions.push({
            eid: remoteConfig.eid,
            msgType: 1, // SEND type
            options: options
        });
    }
    
    if (enforcedOptions.length > 0) {
        try {
            const tx = await mainContract.setEnforcedOptions(enforcedOptions);
            await tx.wait();
            console.log("      ✅ Enforced options set");
        } catch (error) {
            console.log("      ⚠️ Failed to set enforced options:", error);
        }
    }
    
    // 3. SET DVN CONFIGURATION
    console.log("   3️⃣ Setting DVN configuration...");
    
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === chainConfig.name) continue;
        
        try {
            // Send-side ULN config
            const sendUlnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
                ["tuple(uint64,address[],address[],uint8)"],
                [[
                    15n, // confirmations
                    [chainConfig.layerzeroDVN, chainConfig.googleDVN], // required DVNs
                    chainConfig.chainlinkDVN ? [chainConfig.chainlinkDVN] : [], // optional DVNs
                    chainConfig.chainlinkDVN ? 1 : 0 // optional threshold
                ]]
            );
            
            // Set send-side config
            const sendTx = await endpointV2.setConfig(
                mainContractAddress,
                chainConfig.sendLibrary,
                remoteConfig.eid,
                2, // ULN_CONFIG_TYPE
                sendUlnConfig
            );
            await sendTx.wait();
            
            // Receive-side ULN config  
            const receiveUlnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
                ["tuple(uint64,address[],address[],uint8)"],
                [[
                    10n, // confirmations (for remote chain)
                    [remoteConfig.layerzeroDVN, remoteConfig.googleDVN], // required DVNs
                    remoteConfig.chainlinkDVN ? [remoteConfig.chainlinkDVN] : [], // optional DVNs
                    remoteConfig.chainlinkDVN ? 1 : 0 // optional threshold
                ]]
            );
            
            // Set receive-side config
            const receiveTx = await endpointV2.setConfig(
                mainContractAddress,
                chainConfig.receiveLibrary,
                remoteConfig.eid,
                2, // ULN_CONFIG_TYPE
                receiveUlnConfig
            );
            await receiveTx.wait();
            
            console.log(`      ✅ DVN config set for ${remoteName}`);
            
        } catch (error) {
            console.log(`      ⚠️ Failed to set DVN config for ${remoteName}:`, error);
        }
    }
    
    // 4. SET EXECUTOR CONFIG
    console.log("   4️⃣ Setting executor config...");
    
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === chainConfig.name) continue;
        
        try {
            const executorConfig = ethers.AbiCoder.defaultAbiCoder().encode(
                ["tuple(uint32,address)"],
                [[10000, chainConfig.executor]] // maxMessageSize, executor
            );
            
            const executorTx = await endpointV2.setConfig(
                mainContractAddress,
                chainConfig.sendLibrary,
                remoteConfig.eid,
                1, // EXECUTOR_CONFIG_TYPE
                executorConfig
            );
            await executorTx.wait();
            
            console.log(`      ✅ Executor config set for ${remoteName}`);
            
        } catch (error) {
            console.log(`      ⚠️ Failed to set executor config for ${remoteName}:`, error);
        }
    }
    
    // 5. SET DELEGATE
    console.log("   5️⃣ Setting delegate...");
    try {
        const currentDelegate = await endpointV2.delegates(mainContractAddress);
        if (currentDelegate === ethers.ZeroAddress) {
            const delegateTx = await endpointV2.setDelegate(deployer.address);
            await delegateTx.wait();
            console.log("      ✅ Delegate set");
        } else {
            console.log(`      ✅ Delegate already set: ${currentDelegate}`);
        }
    } catch (error) {
        console.log("      ⚠️ Failed to set delegate:", error);
    }
}

async function main() {
    console.log("🦅 EAGLE VAULT COMPLETE DEPLOYMENT + LAYERZERO CONFIGURATION");
    
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
    console.log(`📍 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
    
    // Load existing deployments
    let deployedAddresses = loadDeployedAddresses();
    
    // Deploy contracts on current chain
    const newAddresses = await deployContracts(currentChainConfig);
    
    // Save addresses
    deployedAddresses[currentChainConfig.name] = {
        ...deployedAddresses[currentChainConfig.name],
        ...newAddresses
    };
    saveDeployedAddresses(deployedAddresses);
    
    console.log(`\n💾 Saved addresses to ${DEPLOYMENTS_FILE}`);
    
    // Configure LayerZero (only if we have addresses from other chains)
    const otherChainsDeployed = Object.keys(deployedAddresses).length > 1;
    if (otherChainsDeployed) {
        await configureLayerZero(currentChainConfig, deployedAddresses);
    } else {
        console.log("\n⚠️  Deploy on other chains first, then re-run to configure LayerZero");
    }
    
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("\n📋 Next steps:");
    console.log("1. Deploy on all target chains");
    console.log("2. Re-run this script on each chain to configure LayerZero");
    console.log("3. Test cross-chain transfers");
    console.log("4. Transfer ownership to final controllers");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
