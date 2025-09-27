import { ethers } from "hardhat";

// Deployed contract addresses from our deployments
const DEPLOYED_CONTRACTS = {
    bsc: {
        wlfiAdapter: "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266",
        usd1Adapter: "0x283AbE84811318a873FB98242FC0FE008e7036D4",
        shareOFT: "0x775A6804aCbe265C0e4e017f7eFa797b1c38a750"
    },
    arbitrum: {
        wlfiOFT: "0x46fC0B7cb649942fE043313c209a1D61C9dcAA01",
        usd1OFT: "0xb682841a8f0EAb3a9cf89fC4799877CBd7BAD287", 
        shareOFT: "0x8bfbB8cb872E019197bb3336028c620E3602E784"
    },
    base: {
        wlfiOFT: "0xe249a54D68E6725022B06351B647649798c77C8e",
        usd1OFT: "0x0168024bB4be6aEDf8ba7f60927e1e560f1087e7",
        shareOFT: "0xE46ecFfC9B6caAb768ca37394e1254E603F1dFCc"
    },
    avalanche: {
        wlfiOFT: "0x6469D9A269cd4eeBa24Fad7549fe1E8f78cB3bc0", 
        usd1OFT: "0xe249a54D68E6725022B06351B647649798c77C8e",
        shareOFT: "0x0168024bB4be6aEDf8ba7f60927e1e560f1087e7"
    }
};

// LayerZero V2 Endpoint IDs
const EIDS = {
    bsc: 30102,
    arbitrum: 30110,
    base: 30184, 
    avalanche: 30106
};

async function main() {
    console.log("🔗 CONFIGURING CROSS-CHAIN CONNECTIONS");
    console.log("=".repeat(50));
    
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "hardhat" : network.name;
    
    console.log(`📡 Current Network: ${networkName}`);
    console.log(`🔗 Chain ID: ${network.chainId}`);
    
    // Map chain IDs to network names
    const chainIdToNetwork: { [key: string]: string } = {
        "1": "ethereum",
        "56": "bsc", 
        "42161": "arbitrum",
        "8453": "base",
        "43114": "avalanche"
    };
    
    const currentNetwork = chainIdToNetwork[network.chainId.toString()];
    
    if (!currentNetwork || currentNetwork === "ethereum") {
        console.log("⚠️ This script configures spoke chains only");
        console.log("🏦 Ethereum hub doesn't need peer connections (no OFTs deployed yet)");
        console.log("");
        console.log("🎯 Run this script on: BSC, Arbitrum, Base, or Avalanche");
        return;
    }
    
    console.log(`✅ Configuring ${currentNetwork.toUpperCase()} connections`);
    console.log("");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Get contracts for current network
        const contracts = DEPLOYED_CONTRACTS[currentNetwork as keyof typeof DEPLOYED_CONTRACTS];
        
        if (!contracts) {
            throw new Error(`No contracts found for ${currentNetwork}`);
        }
        
        // Configure WLFI connections
        console.log("🪙 CONFIGURING WLFI TOKEN CONNECTIONS");
        console.log("-".repeat(40));
        
        const wlfiAddress = currentNetwork === 'bsc' ? contracts.wlfiAdapter : contracts.wlfiOFT;
        
        // Use OFT Core interface for LayerZero V2
        const oftInterface = [
            "function setPeer(uint32 _eid, bytes32 _peer) external",
            "function getPeer(uint32 _eid) external view returns (bytes32)"
        ];
        const wlfiContract = new ethers.Contract(wlfiAddress, oftInterface, deployer);
        
        // Connect to all other chains
        const otherChains = Object.keys(DEPLOYED_CONTRACTS).filter(chain => chain !== currentNetwork);
        
        for (const targetChain of otherChains) {
            const targetEid = EIDS[targetChain as keyof typeof EIDS];
            const targetContracts = DEPLOYED_CONTRACTS[targetChain as keyof typeof DEPLOYED_CONTRACTS];
            const targetWlfiAddress = targetChain === 'bsc' ? targetContracts.wlfiAdapter : targetContracts.wlfiOFT;
            
            console.log(`🔄 Setting WLFI peer: ${currentNetwork} → ${targetChain}`);
            console.log(`   EID: ${targetEid}, Address: ${targetWlfiAddress}`);
            
            try {
                // Convert address to bytes32 for LayerZero
                const peerBytes32 = ethers.zeroPadValue(targetWlfiAddress, 32);
                const tx = await wlfiContract.setPeer(targetEid, peerBytes32, { gasLimit: 100000 });
                await tx.wait();
                console.log(`   ✅ WLFI peer set successfully`);
            } catch (error: any) {
                console.log(`   ⚠️ WLFI peer setting failed: ${error.message}`);
            }
        }
        
        console.log("");
        
        // Configure USD1 connections
        console.log("💵 CONFIGURING USD1 TOKEN CONNECTIONS");
        console.log("-".repeat(40));
        
        const usd1Address = currentNetwork === 'bsc' ? contracts.usd1Adapter : contracts.usd1OFT;
        const usd1Contract = new ethers.Contract(usd1Address, oftInterface, deployer);
        
        for (const targetChain of otherChains) {
            const targetEid = EIDS[targetChain as keyof typeof EIDS];
            const targetContracts = DEPLOYED_CONTRACTS[targetChain as keyof typeof DEPLOYED_CONTRACTS];
            const targetUsd1Address = targetChain === 'bsc' ? targetContracts.usd1Adapter : targetContracts.usd1OFT;
            
            console.log(`🔄 Setting USD1 peer: ${currentNetwork} → ${targetChain}`);
            console.log(`   EID: ${targetEid}, Address: ${targetUsd1Address}`);
            
            try {
                const peerBytes32 = ethers.zeroPadValue(targetUsd1Address, 32);
                const tx = await usd1Contract.setPeer(targetEid, peerBytes32, { gasLimit: 100000 });
                await tx.wait();
                console.log(`   ✅ USD1 peer set successfully`);
            } catch (error: any) {
                console.log(`   ⚠️ USD1 peer setting failed: ${error.message}`);
            }
        }
        
        console.log("");
        
        // Configure Share OFT connections
        console.log("🏦 CONFIGURING EAGLE SHARE CONNECTIONS");
        console.log("-".repeat(40));
        
        const shareContract = new ethers.Contract(contracts.shareOFT, oftInterface, deployer);
        
        for (const targetChain of otherChains) {
            const targetEid = EIDS[targetChain as keyof typeof EIDS];
            const targetContracts = DEPLOYED_CONTRACTS[targetChain as keyof typeof DEPLOYED_CONTRACTS];
            const targetShareAddress = targetContracts.shareOFT;
            
            console.log(`🔄 Setting Share peer: ${currentNetwork} → ${targetChain}`);
            console.log(`   EID: ${targetEid}, Address: ${targetShareAddress}`);
            
            try {
                const peerBytes32 = ethers.zeroPadValue(targetShareAddress, 32);
                const tx = await shareContract.setPeer(targetEid, peerBytes32, { gasLimit: 100000 });
                await tx.wait();
                console.log(`   ✅ Share peer set successfully`);
            } catch (error: any) {
                console.log(`   ⚠️ Share peer setting failed: ${error.message}`);
            }
        }
        
        console.log("");
        console.log("🎉 CROSS-CHAIN CONFIGURATION COMPLETE!");
        console.log(`✅ ${currentNetwork.toUpperCase()} is now connected to ${otherChains.length} other chains`);
        console.log("");
        console.log("📋 NEXT STEPS:");
        console.log(`1. Run this script on: ${otherChains.map(c => c.toUpperCase()).join(', ')}`);
        console.log("2. Test cross-chain transfers");
        console.log("3. Deploy frontend interface");
        
    } catch (error: any) {
        console.error("❌ Configuration failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
