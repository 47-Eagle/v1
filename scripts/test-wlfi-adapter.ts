import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function testWLFIAdapter() {
    console.log("🧪 TESTING WLFI ADAPTER CONFIGURATION");
    console.log("===================================");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const wlfiAdapter = '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688';
    
    const OFTAbi = [
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)"
    ];
    
    const adapter = new ethers.Contract(wlfiAdapter, OFTAbi, bscSigner);
    
    const testParams = {
        dstEid: 30101, // Ethereum
        to: ethers.zeroPadValue(bscSigner.address, 32),
        amountLD: ethers.parseUnits("1", 18), // 1 token test
        minAmountLD: ethers.parseUnits("0.99", 18),
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x"
    };
    
    try {
        const fee = await adapter.quoteSend(testParams, false);
        console.log("✅ WLFI adapter quote successful!");
        console.log(`Fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("💡 WLFI adapter appears to be properly configured");
        
        return true;
    } catch (error: any) {
        console.log(`❌ WLFI adapter also has issues: ${error.message}`);
        return false;
    }
}

testWLFIAdapter().catch(console.error);
