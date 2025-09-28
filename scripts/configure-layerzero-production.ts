import { ethers } from "hardhat";
import { EagleShareOFT } from "../typechain-types";

/**
 * Production LayerZero Configuration Script
 * Based on LayerZero V2 Integration Checklist
 */

interface ChainConfig {
    chainId: number;
    eid: number;
    name: string;
    eagleOFTAddress: string;
    endpointV2: string;
}

const CHAIN_CONFIGS: ChainConfig[] = [
    {
        chainId: 1,
        eid: 30101, // Ethereum
        name: "ethereum",
        eagleOFTAddress: "", // To be filled after deployment
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c"
    },
    {
        chainId: 42161,
        eid: 30110, // Arbitrum
        name: "arbitrum", 
        eagleOFTAddress: "",
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c"
    },
    {
        chainId: 8453,
        eid: 30184, // Base
        name: "base",
        eagleOFTAddress: "",
        endpointV2: "0x1a44076050125825900e736c501f859c50fE728c"
    }
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("🦅 Configuring LayerZero V2 Production Settings");
    console.log("📍 Deployer:", deployer.address);

    // Get current chain info
    const chainId = await deployer.provider!.getNetwork().then(n => Number(n.chainId));
    const currentChain = CHAIN_CONFIGS.find(c => c.chainId === chainId);
    
    if (!currentChain) {
        throw new Error(`Unsupported chain: ${chainId}`);
    }

    console.log(`🌐 Configuring ${currentChain.name} (EID: ${currentChain.eid})`);

    // Get EagleShareOFT contract
    const eagleOFT = await ethers.getContractAt("EagleShareOFT", currentChain.eagleOFTAddress) as EagleShareOFT;
    const endpointV2 = await ethers.getContractAt("ILayerZeroEndpointV2", currentChain.endpointV2);

    // 1. SET PEERS FOR ALL PATHWAYS ✅
    console.log("\n1️⃣ Setting Peer Configurations...");
    for (const remoteChain of CHAIN_CONFIGS) {
        if (remoteChain.chainId === chainId) continue; // Skip self
        
        const peerAddress = ethers.zeroPadValue(remoteChain.eagleOFTAddress, 32);
        console.log(`   Setting peer ${remoteChain.name} (EID: ${remoteChain.eid})`);
        
        const tx = await eagleOFT.setPeer(remoteChain.eid, peerAddress);
        await tx.wait();
        console.log(`   ✅ Peer set for ${remoteChain.name}`);
    }

    // 2. SET ENFORCED OPTIONS ✅
    console.log("\n2️⃣ Setting Enforced Options...");
    const enforcedOptions = [];
    
    for (const remoteChain of CHAIN_CONFIGS) {
        if (remoteChain.chainId === chainId) continue;
        
        // Gas for lzReceive execution (adjust based on testing)
        const gasLimit = 200000; // 200k gas
        const msgValue = 0; // No ETH needed for execution
        
        const options = ethers.solidityPacked(
            ["uint16", "uint16", "uint128", "uint128"],
            [3, 1, gasLimit, msgValue] // Type 3, ExecutorLzReceiveOption, gas, value
        );
        
        enforcedOptions.push({
            eid: remoteChain.eid,
            msgType: 1, // SEND message type
            options: options
        });
    }
    
    const tx2 = await eagleOFT.setEnforcedOptions(enforcedOptions);
    await tx2.wait();
    console.log("   ✅ Enforced options set");

    // 3. VERIFY DVN CONFIGURATION ✅
    console.log("\n3️⃣ Verifying DVN Configuration...");
    for (const remoteChain of CHAIN_CONFIGS) {
        if (remoteChain.chainId === chainId) continue;
        
        // Check send library
        const sendLib = await endpointV2.getSendLibrary(eagleOFT.target, remoteChain.eid);
        console.log(`   Send Library ${remoteChain.name}: ${sendLib}`);
        
        // Check receive library  
        const receiveLib = await endpointV2.getReceiveLibrary(eagleOFT.target, remoteChain.eid);
        console.log(`   Receive Library ${remoteChain.name}: ${receiveLib}`);
        
        // Get DVN config
        const sendConfig = await endpointV2.getConfig(eagleOFT.target, sendLib, remoteChain.eid, 2);
        console.log(`   DVN Config ${remoteChain.name}: ${sendConfig}`);
    }

    // 4. SET DELEGATE ✅
    console.log("\n4️⃣ Setting Delegate...");
    const currentDelegate = await endpointV2.delegates(eagleOFT.target);
    console.log(`   Current delegate: ${currentDelegate}`);
    
    if (currentDelegate === ethers.ZeroAddress) {
        const tx3 = await endpointV2.setDelegate(deployer.address);
        await tx3.wait();
        console.log(`   ✅ Delegate set to: ${deployer.address}`);
    }

    // 5. VERIFY INITIALIZATION ✅
    console.log("\n5️⃣ Verifying Initialization Logic...");
    for (const remoteChain of CHAIN_CONFIGS) {
        if (remoteChain.chainId === chainId) continue;
        
        const origin = {
            srcEid: remoteChain.eid,
            sender: ethers.zeroPadValue(remoteChain.eagleOFTAddress, 32),
            nonce: 1
        };
        
        const canInitialize = await endpointV2.initializable(origin, eagleOFT.target);
        console.log(`   Can initialize from ${remoteChain.name}: ${canInitialize}`);
    }

    console.log("\n🎉 LayerZero V2 Production Configuration Complete!");
    console.log("⚠️  Remember to run this script on ALL chains!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
