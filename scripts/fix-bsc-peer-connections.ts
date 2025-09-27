import { ethers } from "hardhat";

/**
 * @title Fix BSC Peer Connections
 * @notice Set the missing peer connections on BSC side
 */

async function main() {
    console.log("🔧 FIXING BSC PEER CONNECTIONS");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Contract addresses
    const BSC_CONTRACTS = {
        usd1Adapter: "0x283AbE84811318a873FB98242FC0FE008e7036D4",
        wlfiAdapter: "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266",
        shareOFT: "0x69dddEC8e8A60e84e4aa98b49Af5F1e2d421E9cc"
    };
    
    const ETHEREUM_CONTRACTS = {
        usd1Adapter: "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e",
        wlfiAdapter: "0x45d452aa571494b896d7926563B41a7b16B74E2F",
        shareOFT: "0x68cF24743CA335ae3c2e21c2538F4E929224F096"
    };
    
    const ETHEREUM_EID = 30101;
    
    try {
        // Get contracts
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_CONTRACTS.usd1Adapter);
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", BSC_CONTRACTS.wlfiAdapter);
        const shareOFT = await ethers.getContractAt("EagleShareOFT", BSC_CONTRACTS.shareOFT);
        
        console.log("\n📊 CURRENT PEER STATUS:");
        console.log("=".repeat(30));
        
        // Check current peers
        const usd1Peer = await usd1Adapter.peers(ETHEREUM_EID);
        const wlfiPeer = await wlfiAdapter.peers(ETHEREUM_EID);
        const sharePeer = await shareOFT.peers(ETHEREUM_EID);
        
        console.log(`USD1 Peer: ${usd1Peer}`);
        console.log(`WLFI Peer: ${wlfiPeer}`);
        console.log(`Share Peer: ${sharePeer}`);
        
        // Set USD1 peer if not set
        if (usd1Peer === "0x" || usd1Peer === ethers.ZeroHash) {
            console.log("\n🔧 Setting USD1 peer...");
            const setPeerTx = await usd1Adapter.setPeer(
                ETHEREUM_EID,
                ethers.zeroPadValue(ETHEREUM_CONTRACTS.usd1Adapter, 32)
            );
            await setPeerTx.wait();
            console.log(`✅ USD1 peer set: ${setPeerTx.hash}`);
        } else {
            console.log("✅ USD1 peer already set");
        }
        
        // Set WLFI peer if not set
        if (wlfiPeer === "0x" || wlfiPeer === ethers.ZeroHash) {
            console.log("\n🔧 Setting WLFI peer...");
            const setPeerTx = await wlfiAdapter.setPeer(
                ETHEREUM_EID,
                ethers.zeroPadValue(ETHEREUM_CONTRACTS.wlfiAdapter, 32)
            );
            await setPeerTx.wait();
            console.log(`✅ WLFI peer set: ${setPeerTx.hash}`);
        } else {
            console.log("✅ WLFI peer already set");
        }
        
        // Set Share peer if not set
        if (sharePeer === "0x" || sharePeer === ethers.ZeroHash) {
            console.log("\n🔧 Setting Share peer...");
            const setPeerTx = await shareOFT.setPeer(
                ETHEREUM_EID,
                ethers.zeroPadValue(ETHEREUM_CONTRACTS.shareOFT, 32)
            );
            await setPeerTx.wait();
            console.log(`✅ Share peer set: ${setPeerTx.hash}`);
        } else {
            console.log("✅ Share peer already set");
        }
        
        console.log("\n📊 FINAL PEER STATUS:");
        console.log("=".repeat(30));
        
        // Check final status
        const finalUsd1Peer = await usd1Adapter.peers(ETHEREUM_EID);
        const finalWlfiPeer = await wlfiAdapter.peers(ETHEREUM_EID);
        const finalSharePeer = await shareOFT.peers(ETHEREUM_EID);
        
        console.log(`USD1 Peer: ${finalUsd1Peer}`);
        console.log(`WLFI Peer: ${finalWlfiPeer}`);
        console.log(`Share Peer: ${finalSharePeer}`);
        
        // Verify they match expected addresses
        const expectedUsd1 = ethers.zeroPadValue(ETHEREUM_CONTRACTS.usd1Adapter, 32);
        const expectedWlfi = ethers.zeroPadValue(ETHEREUM_CONTRACTS.wlfiAdapter, 32);
        const expectedShare = ethers.zeroPadValue(ETHEREUM_CONTRACTS.shareOFT, 32);
        
        console.log("\n✅ PEER CONFIGURATION COMPLETE!");
        console.log(`USD1: ${finalUsd1Peer === expectedUsd1 ? '✅' : '❌'} Match`);
        console.log(`WLFI: ${finalWlfiPeer === expectedWlfi ? '✅' : '❌'} Match`);
        console.log(`Share: ${finalSharePeer === expectedShare ? '✅' : '❌'} Match`);
        
        console.log("\n🚀 READY FOR DEPOSITS!");
        
    } catch (error: any) {
        console.log(`❌ Error fixing peers: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
