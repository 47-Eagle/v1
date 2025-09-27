import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4'
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e'
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function debugUSD1Adapter() {
    console.log("🔍 DEBUGGING USD1 ADAPTER CONFIGURATION");
    console.log("======================================");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const AdapterAbi = [
        "function peers(uint32 eid) external view returns (bytes32)",
        "function owner() external view returns (address)",
        "function token() external view returns (address)"
    ];
    
    // Check BSC USD1 adapter
    console.log("📱 BSC USD1 ADAPTER STATUS:");
    const bscAdapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, AdapterAbi, bscProvider);
    
    try {
        const owner = await bscAdapter.owner();
        const wrappedToken = await bscAdapter.token();
        const ethPeer = await bscAdapter.peers(EndpointId.ETHEREUM_V2_MAINNET);
        
        console.log(`Owner: ${owner}`);
        console.log(`Wrapped token: ${wrappedToken}`);
        console.log(`Ethereum peer: ${ethPeer}`);
        
        if (ethPeer === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log("❌ NO ETHEREUM PEER SET ON BSC ADAPTER!");
        } else {
            console.log("✅ Ethereum peer configured");
        }
        
    } catch (error: any) {
        console.log(`❌ Error checking BSC adapter: ${error.message}`);
    }
    
    // Check Ethereum USD1 adapter  
    console.log("\n📱 ETHEREUM USD1 ADAPTER STATUS:");
    const ethAdapter = new ethers.Contract(ETHEREUM_CONTRACTS.usd1Adapter, AdapterAbi, ethProvider);
    
    try {
        const owner = await ethAdapter.owner();
        const wrappedToken = await ethAdapter.token();
        const bscPeer = await ethAdapter.peers(EndpointId.BSC_V2_MAINNET);
        
        console.log(`Owner: ${owner}`);
        console.log(`Wrapped token: ${wrappedToken}`);
        console.log(`BSC peer: ${bscPeer}`);
        
        if (bscPeer === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log("❌ NO BSC PEER SET ON ETHEREUM ADAPTER!");
        } else {
            console.log("✅ BSC peer configured");
        }
        
    } catch (error: any) {
        console.log(`❌ Error checking Ethereum adapter: ${error.message}`);
    }
    
    console.log("\n💡 DIAGNOSIS:");
    console.log("Error 0x6780cfaf typically means:");
    console.log("1. Peer connections not set properly");
    console.log("2. DVN configuration incomplete");  
    console.log("3. Message validation failing");
}

debugUSD1Adapter().catch(console.error);
