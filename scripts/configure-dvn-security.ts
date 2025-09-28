import { ethers } from "hardhat";

/**
 * DVN Security Configuration Script
 * Critical for LayerZero V2 Production Deployment
 */

interface DVNConfig {
    chainId: number;
    eid: number;
    name: string;
    requiredDVNs: string[]; // Primary DVNs (must all validate)
    optionalDVNs: string[]; // Optional DVNs (threshold-based)
    optionalDVNThreshold: number;
    confirmations: number;
}

// LayerZero Recommended DVNs for Production
const DVN_CONFIGS: DVNConfig[] = [
    {
        chainId: 1, // Ethereum
        eid: 30101,
        name: "ethereum",
        requiredDVNs: [
            "0x589dEdBD617e0CBcB916A9223F4d1300c294236b", // LayerZero DVN
            "0xa59BA433ac34D2927232918Ef5B2eaAfcF130BA5"  // Google Cloud DVN
        ],
        optionalDVNs: [
            "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc", // Chainlink DVN
            "0x6A02D83e8d433304bba74EF1c427913958187142"  // Polyhedra DVN
        ],
        optionalDVNThreshold: 1,
        confirmations: 15 // ~3.5 minutes on Ethereum
    },
    {
        chainId: 42161, // Arbitrum
        eid: 30110,
        name: "arbitrum",
        requiredDVNs: [
            "0x2f55C492897526677C5B68fb199037c7e141B1a4", // LayerZero DVN
            "0x23DE2FE932d9043291f870324B74F820e11dc81A"  // Google Cloud DVN
        ],
        optionalDVNs: [
            "0xa7b5189bca84Cd304D8553977c7C614329750d99", // Chainlink DVN
            "0x6A02D83e8d433304bba74EF1c427913958187142"  // Polyhedra DVN
        ],
        optionalDVNThreshold: 1,
        confirmations: 20 // Arbitrum finality
    },
    {
        chainId: 8453, // Base
        eid: 30184,
        name: "base", 
        requiredDVNs: [
            "0x9e059a54699a285714207b43B055483E78FAac25", // LayerZero DVN
            "0x54eD2628b1D24b6cF9107bE334cEF461B5d72d18"  // Google Cloud DVN
        ],
        optionalDVNs: [
            "0xf49d162484290EaEAd7bb8C2c7E3a6f8f52e32b6", // Chainlink DVN
        ],
        optionalDVNThreshold: 1,
        confirmations: 10 // Base finality
    }
];

interface ExecutorConfig {
    chainId: number;
    eid: number;
    executor: string;
    maxMessageSize: number;
}

const EXECUTOR_CONFIGS: ExecutorConfig[] = [
    {
        chainId: 1,
        eid: 30101,
        executor: "0x173272739Bd7Aa6e4e214714048a9fE699453059", // LayerZero Executor V2
        maxMessageSize: 10000 // 10KB
    },
    {
        chainId: 42161,
        eid: 30110,
        executor: "0x31CAe3B7fB82d847621859fb1585353e6f6c97a4", // LayerZero Executor V2
        maxMessageSize: 10000
    },
    {
        chainId: 8453,
        eid: 30184,
        executor: "0x2CCA08ae69E0C44b18a57Ab2A87644234dAebaE4", // LayerZero Executor V2  
        maxMessageSize: 10000
    }
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("🔐 Configuring DVN Security Settings");
    
    const chainId = await deployer.provider!.getNetwork().then(n => Number(n.chainId));
    const dvnConfig = DVN_CONFIGS.find(c => c.chainId === chainId);
    const executorConfig = EXECUTOR_CONFIGS.find(c => c.chainId === chainId);
    
    if (!dvnConfig || !executorConfig) {
        throw new Error(`Unsupported chain: ${chainId}`);
    }
    
    console.log(`🌐 Configuring ${dvnConfig.name} security`);
    
    // Get contracts
    const eagleOFT = ""; // Fill with deployed address
    const endpointV2Address = "0x1a44076050125825900e736c501f859c50fE728c"; // LayerZero V2 Endpoint
    const sendLibAddress = ""; // Fill with ULN send library
    const receiveLibAddress = ""; // Fill with ULN receive library
    
    const endpointV2 = await ethers.getContractAt("ILayerZeroEndpointV2", endpointV2Address);
    
    // Configure for each remote chain
    for (const remoteConfig of DVN_CONFIGS) {
        if (remoteConfig.chainId === chainId) continue; // Skip self
        
        console.log(`\n📡 Configuring pathway to ${remoteConfig.name}`);
        
        // 1. SEND-SIDE DVN CONFIGURATION
        console.log("   Setting send-side DVN config...");
        
        const sendUlnConfig = {
            confirmations: ethers.toBigInt(dvnConfig.confirmations),
            requiredDVNs: dvnConfig.requiredDVNs,
            optionalDVNs: dvnConfig.optionalDVNs,
            optionalDVNThreshold: dvnConfig.optionalDVNThreshold
        };
        
        const sendConfigData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["tuple(uint64,address[],address[],uint8)"],
            [[sendUlnConfig.confirmations, sendUlnConfig.requiredDVNs, sendUlnConfig.optionalDVNs, sendUlnConfig.optionalDVNThreshold]]
        );
        
        const sendTx = await endpointV2.setConfig(
            eagleOFT,
            sendLibAddress,
            remoteConfig.eid,
            2, // ULN_CONFIG_TYPE
            sendConfigData
        );
        await sendTx.wait();
        console.log("   ✅ Send-side DVN config set");
        
        // 2. RECEIVE-SIDE DVN CONFIGURATION  
        console.log("   Setting receive-side DVN config...");
        
        const receiveUlnConfig = {
            confirmations: ethers.toBigInt(remoteConfig.confirmations),
            requiredDVNs: remoteConfig.requiredDVNs,
            optionalDVNs: remoteConfig.optionalDVNs,
            optionalDVNThreshold: remoteConfig.optionalDVNThreshold
        };
        
        const receiveConfigData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["tuple(uint64,address[],address[],uint8)"],
            [[receiveUlnConfig.confirmations, receiveUlnConfig.requiredDVNs, receiveUlnConfig.optionalDVNs, receiveUlnConfig.optionalDVNThreshold]]
        );
        
        const receiveTx = await endpointV2.setConfig(
            eagleOFT,
            receiveLibAddress, 
            remoteConfig.eid,
            2, // ULN_CONFIG_TYPE
            receiveConfigData
        );
        await receiveTx.wait();
        console.log("   ✅ Receive-side DVN config set");
        
        // 3. EXECUTOR CONFIGURATION
        console.log("   Setting executor config...");
        
        const executorConfigData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["tuple(uint32,address)"],
            [[executorConfig.maxMessageSize, executorConfig.executor]]
        );
        
        const executorTx = await endpointV2.setConfig(
            eagleOFT,
            sendLibAddress,
            remoteConfig.eid,
            1, // EXECUTOR_CONFIG_TYPE
            executorConfigData
        );
        await executorTx.wait();
        console.log("   ✅ Executor config set");
    }
    
    console.log("\n🎉 DVN Security Configuration Complete!");
    console.log("⚠️  CRITICAL: Run this on ALL chains!");
    console.log("⚠️  VERIFY: DVN configurations match on both sides!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
