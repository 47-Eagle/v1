import { ethers } from "hardhat";

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

const EIDS = {
    bsc: 30102,
    arbitrum: 30110,
    base: 30184, 
    avalanche: 30106
};

async function main() {
    console.log("🎉 FINAL PEER VERIFICATION - USING CORRECT FUNCTION");
    console.log("=".repeat(60));
    
    const network = await ethers.provider.getNetwork();
    console.log(`📡 Network: ${network.name} (${network.chainId})`);
    
    const chainIdToNetwork: { [key: string]: string } = {
        "56": "bsc", 
        "42161": "arbitrum",
        "8453": "base",
        "43114": "avalanche"
    };
    
    const currentNetwork = chainIdToNetwork[network.chainId.toString()];
    
    if (!currentNetwork) {
        console.log("⚠️ Connect to BSC, Arbitrum, Base, or Avalanche");
        return;
    }
    
    console.log(`✅ Verifying ${currentNetwork.toUpperCase()} peers`);
    
    const contracts = DEPLOYED_CONTRACTS[currentNetwork as keyof typeof DEPLOYED_CONTRACTS];
    const otherChains = Object.keys(DEPLOYED_CONTRACTS).filter(chain => chain !== currentNetwork);
    
    // Correct LayerZero interface - peers is a public mapping!
    const oftInterface = [
        "function peers(uint32 _eid) external view returns (bytes32)"
    ];
    
    let totalConnections = 0;
    let successfulConnections = 0;
    
    // Check WLFI peers
    console.log("");
    console.log("🪙 WLFI PEER VERIFICATION:");
    const wlfiAddress = currentNetwork === 'bsc' ? contracts.wlfiAdapter : contracts.wlfiOFT;
    const wlfiContract = new ethers.Contract(wlfiAddress, oftInterface, ethers.provider);
    
    for (const targetChain of otherChains) {
        const targetEid = EIDS[targetChain as keyof typeof EIDS];
        const targetContracts = DEPLOYED_CONTRACTS[targetChain as keyof typeof DEPLOYED_CONTRACTS];
        const targetWlfiAddress = targetChain === 'bsc' ? targetContracts.wlfiAdapter : targetContracts.wlfiOFT;
        
        try {
            const peerBytes32 = await wlfiContract.peers(targetEid);
            const expectedAddress = ethers.getAddress(targetWlfiAddress.toLowerCase());
            
            // Extract address from bytes32 (last 20 bytes)
            const actualAddress = peerBytes32 !== "0x0000000000000000000000000000000000000000000000000000000000000000" 
                ? ethers.getAddress("0x" + peerBytes32.slice(26))
                : "0x0000000000000000000000000000000000000000";
            
            const isCorrect = actualAddress.toLowerCase() === expectedAddress.toLowerCase();
            totalConnections++;
            if (isCorrect) successfulConnections++;
            
            console.log(`   ${targetChain.toUpperCase().padEnd(10)} (EID ${targetEid}): ${isCorrect ? '✅' : '❌'} ${actualAddress}`);
            if (isCorrect) {
                console.log(`      ✓ Matches expected: ${expectedAddress}`);
            } else if (actualAddress === "0x0000000000000000000000000000000000000000") {
                console.log(`      ✗ NOT SET (expected: ${expectedAddress})`);
            } else {
                console.log(`      ✗ Wrong peer (expected: ${expectedAddress})`);
            }
            
        } catch (error: any) {
            console.log(`   ${targetChain.toUpperCase().padEnd(10)} (EID ${targetEid}): ERROR - ${error.message.slice(0, 40)}...`);
            totalConnections++;
        }
    }
    
    // Check USD1 peers  
    console.log("");
    console.log("💵 USD1 PEER VERIFICATION:");
    const usd1Address = currentNetwork === 'bsc' ? contracts.usd1Adapter : contracts.usd1OFT;
    const usd1Contract = new ethers.Contract(usd1Address, oftInterface, ethers.provider);
    
    for (const targetChain of otherChains) {
        const targetEid = EIDS[targetChain as keyof typeof EIDS];
        const targetContracts = DEPLOYED_CONTRACTS[targetChain as keyof typeof DEPLOYED_CONTRACTS];
        const targetUsd1Address = targetChain === 'bsc' ? targetContracts.usd1Adapter : targetContracts.usd1OFT;
        
        try {
            const peerBytes32 = await usd1Contract.peers(targetEid);
            const expectedAddress = ethers.getAddress(targetUsd1Address.toLowerCase());
            
            const actualAddress = peerBytes32 !== "0x0000000000000000000000000000000000000000000000000000000000000000"
                ? ethers.getAddress("0x" + peerBytes32.slice(26))
                : "0x0000000000000000000000000000000000000000";
            
            const isCorrect = actualAddress.toLowerCase() === expectedAddress.toLowerCase();
            totalConnections++;
            if (isCorrect) successfulConnections++;
            
            console.log(`   ${targetChain.toUpperCase().padEnd(10)} (EID ${targetEid}): ${isCorrect ? '✅' : '❌'} ${actualAddress}`);
            
        } catch (error: any) {
            console.log(`   ${targetChain.toUpperCase().padEnd(10)} (EID ${targetEid}): ERROR`);
            totalConnections++;
        }
    }
    
    // Check Share peers
    console.log("");
    console.log("🏦 EAGLE SHARE PEER VERIFICATION:");
    const shareContract = new ethers.Contract(contracts.shareOFT, oftInterface, ethers.provider);
    
    for (const targetChain of otherChains) {
        const targetEid = EIDS[targetChain as keyof typeof EIDS];
        const targetContracts = DEPLOYED_CONTRACTS[targetChain as keyof typeof DEPLOYED_CONTRACTS];
        const targetShareAddress = targetContracts.shareOFT;
        
        try {
            const peerBytes32 = await shareContract.peers(targetEid);
            const expectedAddress = ethers.getAddress(targetShareAddress.toLowerCase());
            
            const actualAddress = peerBytes32 !== "0x0000000000000000000000000000000000000000000000000000000000000000"
                ? ethers.getAddress("0x" + peerBytes32.slice(26))
                : "0x0000000000000000000000000000000000000000";
            
            const isCorrect = actualAddress.toLowerCase() === expectedAddress.toLowerCase();
            totalConnections++;
            if (isCorrect) successfulConnections++;
            
            console.log(`   ${targetChain.toUpperCase().padEnd(10)} (EID ${targetEid}): ${isCorrect ? '✅' : '❌'} ${actualAddress}`);
            
        } catch (error: any) {
            console.log(`   ${targetChain.toUpperCase().padEnd(10)} (EID ${targetEid}): ERROR`);
            totalConnections++;
        }
    }
    
    // Final summary
    console.log("");
    console.log("📊 FINAL VERIFICATION RESULTS:");
    console.log("=".repeat(40));
    console.log(`🎯 Success Rate: ${successfulConnections}/${totalConnections} (${Math.round((successfulConnections/totalConnections)*100)}%)`);
    console.log(`📍 Network: ${currentNetwork.toUpperCase()}`);
    console.log(`🔗 Peers per token: ${otherChains.length}`);
    
    if (successfulConnections === totalConnections) {
        console.log("");
        console.log("🎉 PERFECT! ALL PEERS CORRECTLY SET!");
        console.log("✅ Cross-chain transfers should work flawlessly");
    } else if (successfulConnections > totalConnections * 0.8) {
        console.log("");
        console.log("🟡 MOSTLY SUCCESSFUL - Most peers set correctly");
    } else if (successfulConnections > 0) {
        console.log("");
        console.log("🟠 PARTIAL SUCCESS - Some peers set");
    } else {
        console.log("");
        console.log("❌ NO PEERS SET - Configuration failed");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
