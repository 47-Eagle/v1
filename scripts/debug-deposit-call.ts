import { ethers } from "hardhat";

/**
 * @title Debug Deposit Call
 * @notice Debug the cross-chain deposit parameters
 */

async function main() {
    console.log("🔍 DEBUGGING DEPOSIT PARAMETERS");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Contract addresses on BSC
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const ETHEREUM_EID = 30101;
    
    try {
        // Get OFT adapter
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        
        // Check basic info
        console.log("\n📊 CONTRACT INFO:");
        const token = await usd1Adapter.token();
        const endpoint = await usd1Adapter.endpoint();
        const owner = await usd1Adapter.owner();
        
        console.log(`📍 Token: ${token}`);
        console.log(`📍 Endpoint: ${endpoint}`);
        console.log(`📍 Owner: ${owner}`);
        
        // Check if peer is set
        const peer = await usd1Adapter.peers(ETHEREUM_EID);
        console.log(`📍 Ethereum Peer: ${peer}`);
        
        if (peer === "0x") {
            console.log("❌ No peer set for Ethereum!");
            return;
        }
        
        // Simple quote test
        const amount = ethers.parseUnits("1", 18); // 1 USD1
        
        const sendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: amount,
            minAmountLD: amount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        console.log("\n💰 TESTING QUOTE FOR 1 USD1:");
        console.log(`   Destination: ${ETHEREUM_EID} (Ethereum)`);
        console.log(`   Amount: ${ethers.formatUnits(amount, 18)} USD1`);
        console.log(`   To: ${signer.address}`);
        
        const feeQuote = await usd1Adapter.quoteSend(sendParam, false);
        console.log(`💸 LayerZero Fee: ${ethers.formatEther(feeQuote.nativeFee)} BNB`);
        
        // Check BNB balance
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 BNB Balance: ${ethers.formatEther(bnbBalance)} BNB`);
        
        if (bnbBalance < feeQuote.nativeFee) {
            console.log(`❌ Insufficient BNB for LayerZero fee`);
            return;
        }
        
        console.log("✅ Quote successful - parameters look correct");
        
        // Check token balance and allowance
        const usd1Token = await ethers.getContractAt("IERC20", token);
        const balance = await usd1Token.balanceOf(signer.address);
        const allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        
        console.log(`💰 USD1 Balance: ${ethers.formatUnits(balance, 18)} USD1`);
        console.log(`🔓 USD1 Allowance: ${ethers.formatUnits(allowance, 18)} USD1`);
        
        if (balance < amount) {
            console.log(`❌ Insufficient USD1 balance`);
            return;
        }
        
        if (allowance < amount) {
            console.log(`❌ Insufficient USD1 allowance`);
            return;
        }
        
        console.log("\n🎯 READY FOR DEPOSIT!");
        console.log("All parameters validated successfully.");
        
    } catch (error: any) {
        console.log(`❌ Debug error: ${error.message}`);
        if (error.data) {
            console.log(`📄 Error data: ${error.data}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
