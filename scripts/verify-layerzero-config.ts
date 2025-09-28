import { ethers } from "hardhat";
import { readFileSync, existsSync } from "fs";

/**
 * Verify LayerZero V2 Configuration
 * Checks all peers, DVNs, enforced options, etc.
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

function loadDeployedAddresses() {
    if (existsSync("deployed-addresses.json")) {
        return JSON.parse(readFileSync("deployed-addresses.json", "utf8"));
    }
    throw new Error("No deployed addresses found. Run deployment first.");
}

async function verifyConfiguration() {
    console.log("🔍 VERIFYING LAYERZERO V2 CONFIGURATION\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    const currentChainConfig = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
    if (!currentChainConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    console.log(`📍 Verifying ${currentChainConfig.name} configuration`);
    
    const deployedAddresses = loadDeployedAddresses();
    const currentAddresses = deployedAddresses[currentChainConfig.name];
    
    if (!currentAddresses) {
        throw new Error(`No addresses found for ${currentChainConfig.name}`);
    }
    
    // Get main contract
    const mainContractAddress = currentAddresses.eagleShareOFT || 
                               currentAddresses.eagleShareAdapter;
    
    if (!mainContractAddress) {
        throw new Error("No main contract address found");
    }
    
    const mainContract = await ethers.getContractAt(
        currentAddresses.eagleShareOFT ? "EagleShareOFT" : "EagleShareAdapter",
        mainContractAddress
    );
    
    const endpointV2 = await ethers.getContractAt("ILayerZeroEndpointV2", currentChainConfig.endpointV2);
    
    console.log(`\n📄 Contract: ${mainContractAddress}`);
    console.log(`📄 Type: ${currentAddresses.eagleShareOFT ? "EagleShareOFT" : "EagleShareAdapter"}\n`);
    
    let allChecksPass = true;
    
    // 1. VERIFY PEERS
    console.log("1️⃣ PEER VERIFICATION");
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === currentChainConfig.name) continue;
        
        const remoteAddresses = deployedAddresses[remoteName];
        if (!remoteAddresses) {
            console.log(`   ❌ ${remoteName}: No deployment found`);
            allChecksPass = false;
            continue;
        }
        
        const expectedPeer = remoteAddresses.eagleShareOFT || 
                           remoteAddresses.eagleShareAdapter;
        
        if (!expectedPeer) {
            console.log(`   ❌ ${remoteName}: No peer address found`);
            allChecksPass = false;
            continue;
        }
        
        try {
            const actualPeer = await mainContract.peers(remoteConfig.eid);
            const expectedPeerBytes32 = ethers.zeroPadValue(expectedPeer, 32);
            
            if (actualPeer === expectedPeerBytes32) {
                console.log(`   ✅ ${remoteName} (EID ${remoteConfig.eid}): Peer correctly set`);
            } else {
                console.log(`   ❌ ${remoteName} (EID ${remoteConfig.eid}): Peer mismatch`);
                console.log(`      Expected: ${expectedPeerBytes32}`);
                console.log(`      Actual: ${actualPeer}`);
                allChecksPass = false;
            }
        } catch (error) {
            console.log(`   ❌ ${remoteName}: Error checking peer - ${error}`);
            allChecksPass = false;
        }
    }
    
    // 2. VERIFY LIBRARIES
    console.log("\n2️⃣ LIBRARY VERIFICATION");
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === currentChainConfig.name) continue;
        
        try {
            const sendLib = await endpointV2.getSendLibrary(mainContractAddress, remoteConfig.eid);
            const receiveLib = await endpointV2.getReceiveLibrary(mainContractAddress, remoteConfig.eid);
            
            console.log(`   📚 ${remoteName}:`);
            console.log(`      Send Library: ${sendLib}`);
            console.log(`      Receive Library: ${receiveLib}`);
            
            if (sendLib === ethers.ZeroAddress || receiveLib === ethers.ZeroAddress) {
                console.log(`   ⚠️  ${remoteName}: Using default libraries (may be unsafe)`);
                allChecksPass = false;
            } else {
                console.log(`   ✅ ${remoteName}: Libraries explicitly set`);
            }
        } catch (error) {
            console.log(`   ❌ ${remoteName}: Error checking libraries - ${error}`);
            allChecksPass = false;
        }
    }
    
    // 3. VERIFY DVN CONFIGURATION
    console.log("\n3️⃣ DVN CONFIGURATION VERIFICATION");
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === currentChainConfig.name) continue;
        
        try {
            const sendLib = await endpointV2.getSendLibrary(mainContractAddress, remoteConfig.eid);
            const receiveLib = await endpointV2.getReceiveLibrary(mainContractAddress, remoteConfig.eid);
            
            // Get send config
            const sendConfig = await endpointV2.getConfig(
                mainContractAddress, 
                sendLib, 
                remoteConfig.eid, 
                2 // ULN_CONFIG_TYPE
            );
            
            // Get receive config  
            const receiveConfig = await endpointV2.getConfig(
                mainContractAddress,
                receiveLib,
                remoteConfig.eid,
                2 // ULN_CONFIG_TYPE
            );
            
            console.log(`   🛡️  ${remoteName}:`);
            console.log(`      Send Config Length: ${sendConfig.length} bytes`);
            console.log(`      Receive Config Length: ${receiveConfig.length} bytes`);
            
            if (sendConfig.length > 2 && receiveConfig.length > 2) {
                console.log(`   ✅ ${remoteName}: DVN configuration present`);
            } else {
                console.log(`   ⚠️  ${remoteName}: DVN configuration missing or using defaults`);
                allChecksPass = false;
            }
            
        } catch (error) {
            console.log(`   ❌ ${remoteName}: Error checking DVN config - ${error}`);
            allChecksPass = false;
        }
    }
    
    // 4. VERIFY ENFORCED OPTIONS
    console.log("\n4️⃣ ENFORCED OPTIONS VERIFICATION");
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === currentChainConfig.name) continue;
        
        try {
            const enforcedOptions = await mainContract.enforcedOptions(remoteConfig.eid, 1); // SEND type
            
            if (enforcedOptions && enforcedOptions.length > 2) {
                console.log(`   ✅ ${remoteName}: Enforced options set (${enforcedOptions.length} bytes)`);
            } else {
                console.log(`   ⚠️  ${remoteName}: No enforced options (messages may fail with insufficient gas)`);
                allChecksPass = false;
            }
        } catch (error) {
            console.log(`   ❌ ${remoteName}: Error checking enforced options - ${error}`);
            allChecksPass = false;
        }
    }
    
    // 5. VERIFY DELEGATE
    console.log("\n5️⃣ DELEGATE VERIFICATION");
    try {
        const delegate = await endpointV2.delegates(mainContractAddress);
        if (delegate === ethers.ZeroAddress) {
            console.log(`   ⚠️  No delegate set`);
            allChecksPass = false;
        } else {
            console.log(`   ✅ Delegate set: ${delegate}`);
        }
    } catch (error) {
        console.log(`   ❌ Error checking delegate - ${error}`);
        allChecksPass = false;
    }
    
    // 6. VERIFY INITIALIZATION LOGIC
    console.log("\n6️⃣ INITIALIZATION VERIFICATION");
    for (const [remoteName, remoteConfig] of Object.entries(CHAIN_CONFIGS)) {
        if (remoteName === currentChainConfig.name) continue;
        
        const remoteAddresses = deployedAddresses[remoteName];
        if (!remoteAddresses) continue;
        
        const remotePeer = remoteAddresses.eagleShareOFT || 
                          remoteAddresses.eagleShareAdapter;
        
        if (!remotePeer) continue;
        
        try {
            const origin = {
                srcEid: remoteConfig.eid,
                sender: ethers.zeroPadValue(remotePeer, 32),
                nonce: 1
            };
            
            const canInitialize = await endpointV2.initializable(origin, mainContractAddress);
            
            if (canInitialize) {
                console.log(`   ✅ ${remoteName}: Can initialize pathway`);
            } else {
                console.log(`   ❌ ${remoteName}: Cannot initialize pathway`);
                allChecksPass = false;
            }
        } catch (error) {
            console.log(`   ❌ ${remoteName}: Error checking initialization - ${error}`);
            allChecksPass = false;
        }
    }
    
    // FINAL RESULT
    console.log("\n" + "=".repeat(50));
    if (allChecksPass) {
        console.log("🎉 ALL CHECKS PASSED - READY FOR PRODUCTION!");
        console.log("✅ Your LayerZero V2 configuration is complete and secure.");
    } else {
        console.log("⚠️  SOME CHECKS FAILED - NOT READY FOR PRODUCTION");
        console.log("❌ Please fix the issues above before deploying to mainnet.");
        console.log("\n📋 Common fixes:");
        console.log("1. Run the deployment script on missing chains");
        console.log("2. Re-run LayerZero configuration scripts");
        console.log("3. Check that all required DVNs are active");
        console.log("4. Verify gas limits in enforced options");
    }
    console.log("=".repeat(50));
    
    return allChecksPass;
}

verifyConfiguration()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });
