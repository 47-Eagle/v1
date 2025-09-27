import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688'
};

const WLFI_BSC = process.env.WLFI_BSC!;
const EndpointId = { ETHEREUM_V2_MAINNET: 30101 };

const erc20Abi = ["function balanceOf(address) external view returns (uint256)"];
const oftAbi = [
    "function sendToken(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) sendParam, tuple(uint256 nativeFee, uint256 lzTokenFee) fee, address refundTo) external payable"
];

async function main() {
    console.log("🧪 TESTING WLFI DEPOSIT");
    console.log("=======================");
    
    const [deployer] = await ethers.getSigners();
    const bnbBalance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Signer: ${deployer.address}`);
    console.log(`💰 BNB: ${ethers.formatEther(bnbBalance)} BNB`);
    
    const wlfiToken = new ethers.Contract(WLFI_BSC, erc20Abi, deployer);
    const wlfiAdapter = new ethers.Contract(BSC_CONTRACTS.wlfiAdapter, oftAbi, deployer);
    
    try {
        const wlfiBalance = await wlfiToken.balanceOf(deployer.address);
        console.log(`🪙 WLFI Balance: ${ethers.formatEther(wlfiBalance)} WLFI`);
        
        if (wlfiBalance === 0n) {
            console.log("❌ No WLFI to test with");
            return;
        }
        
        const testAmount = ethers.parseEther("0.001"); // 0.001 WLFI
        const highFee = ethers.parseEther("0.01"); // 0.01 BNB fee
        
        console.log(`🎯 Testing: ${ethers.formatEther(testAmount)} WLFI`);
        console.log(`💸 Fee: ${ethers.formatEther(highFee)} BNB`);
        
        const sendParam = {
            dstEid: EndpointId.ETHEREUM_V2_MAINNET,
            to: ethers.zeroPadValue(deployer.address, 32),
            amountLD: testAmount,
            minAmountLD: testAmount,
            extraOptions: "0x",
            composeMsg: "0x", 
            oftCmd: "0x"
        };
        
        const fee = {
            nativeFee: highFee,
            lzTokenFee: 0
        };
        
        console.log("\n🚀 ATTEMPTING WLFI DEPOSIT:");
        const tx = await wlfiAdapter.sendToken(sendParam, fee, deployer.address, {
            value: highFee,
            gasLimit: 300000
        });
        
        const receipt = await tx.wait();
        
        if (receipt?.status === 1) {
            console.log(`✅ WLFI deposit SUCCESS!`);
            console.log(`📄 TX: ${tx.hash}`);
            console.log(`⛽ Gas: ${receipt.gasUsed}`);
            
            console.log("\n🎊 BREAKTHROUGH!");
            console.log("WLFI works! The issue might be USD1-specific.");
        }
        
    } catch (error: any) {
        console.log(`❌ WLFI deposit failed: ${error.message}`);
        
        if (error.receipt) {
            console.log(`⛽ Gas used: ${error.receipt.gasUsed}`);
        }
        
        if (error.receipt?.gasUsed === 22960n) {
            console.log("🔍 Same 22,960 gas pattern");
            console.log("💡 Issue affects both tokens equally");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
