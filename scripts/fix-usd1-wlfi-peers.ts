import { ethers } from "hardhat";

/**
 * @title Fix USD1/WLFI BSC Peer Connections
 * @notice Set the missing peer connections for deposits
 */

async function main() {
    console.log("🔧 FIXING USD1/WLFI PEER CONNECTIONS");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Contract addresses (properly checksummed)
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const ETH_WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    
    const ETHEREUM_EID = 30101;
    
    try {
        // Get contracts
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", BSC_WLFI_ADAPTER);
        
        console.log("\n📊 CURRENT PEER STATUS:");
        console.log("=".repeat(30));
        
        // Check current peers
        const usd1Peer = await usd1Adapter.peers(ETHEREUM_EID);
        const wlfiPeer = await wlfiAdapter.peers(ETHEREUM_EID);
        
        console.log(`USD1 Peer: ${usd1Peer}`);
        console.log(`WLFI Peer: ${wlfiPeer}`);
        
        // Set USD1 peer
        console.log("\n🔧 Setting USD1 peer...");
        const usd1SetPeerTx = await usd1Adapter.setPeer(
            ETHEREUM_EID,
            ethers.zeroPadValue(ETH_USD1_ADAPTER, 32)
        );
        await usd1SetPeerTx.wait();
        console.log(`✅ USD1 peer set: ${usd1SetPeerTx.hash}`);
        
        // Set WLFI peer
        console.log("\n🔧 Setting WLFI peer...");
        const wlfiSetPeerTx = await wlfiAdapter.setPeer(
            ETHEREUM_EID,
            ethers.zeroPadValue(ETH_WLFI_ADAPTER, 32)
        );
        await wlfiSetPeerTx.wait();
        console.log(`✅ WLFI peer set: ${wlfiSetPeerTx.hash}`);
        
        console.log("\n📊 FINAL PEER STATUS:");
        console.log("=".repeat(30));
        
        // Verify peers are set
        const finalUsd1Peer = await usd1Adapter.peers(ETHEREUM_EID);
        const finalWlfiPeer = await wlfiAdapter.peers(ETHEREUM_EID);
        
        console.log(`USD1 Peer: ${finalUsd1Peer}`);
        console.log(`WLFI Peer: ${finalWlfiPeer}`);
        
        const expectedUsd1 = ethers.zeroPadValue(ETH_USD1_ADAPTER, 32);
        const expectedWlfi = ethers.zeroPadValue(ETH_WLFI_ADAPTER, 32);
        
        console.log("\n✅ PEER CONFIGURATION COMPLETE!");
        console.log(`USD1: ${finalUsd1Peer === expectedUsd1 ? '✅' : '❌'} Match`);
        console.log(`WLFI: ${finalWlfiPeer === expectedWlfi ? '✅' : '❌'} Match`);
        
        console.log("\n🚀 NOW READY FOR REAL DEPOSITS!");
        
    } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
