import { ethers } from "hardhat";

/**
 * @title Test Deposit After BSC Configuration
 * @notice Check if deposits work with only BSC side DVN configured
 */

async function main() {
    console.log("🧪 TESTING DEPOSITS AFTER BSC DVN CONFIG");
    console.log("=".repeat(45));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const ETHEREUM_EID = 30101;
    
    try {
        // Test if quotes work now
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        
        const testAmount = ethers.parseUnits("0.1", 18);
        const sendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: testAmount,
            minAmountLD: testAmount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        console.log("💸 Testing LayerZero fee quote...");
        
        try {
            const feeQuote = await usd1Adapter.quoteSend(sendParam, false);
            console.log(`✅ Quote successful! Fee: ${ethers.formatEther(feeQuote.nativeFee)} BNB`);
            
            console.log("\n🎊 GREAT NEWS!");
            console.log("✅ BSC DVN configuration is working");
            console.log("✅ Quotes are now successful");
            console.log("🚀 Ready to execute your real deposits!");
            
            // Check balances
            const bnbBalance = await ethers.provider.getBalance(signer.address);
            const usd1Token = await ethers.getContractAt("IERC20", "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d");
            const usd1Balance = await usd1Token.balanceOf(signer.address);
            
            console.log(`\n💰 CURRENT BALANCES:`);
            console.log(`BNB: ${ethers.formatEther(bnbBalance)} BNB`);
            console.log(`USD1: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
            
            const totalFeesNeeded = feeQuote.nativeFee * 4n; // For all 4 transactions
            
            if (bnbBalance >= totalFeesNeeded) {
                console.log(`\n✅ Sufficient BNB for all deposits!`);
                console.log(`💸 Total fees needed: ${ethers.formatEther(totalFeesNeeded)} BNB`);
                console.log(`🎯 Ready to proceed with your $20 worth of deposits!`);
            } else {
                console.log(`\n⚠️  Need more BNB for fees`);
                console.log(`💸 Need: ${ethers.formatEther(totalFeesNeeded)} BNB`);
                console.log(`💰 Have: ${ethers.formatEther(bnbBalance)} BNB`);
            }
            
        } catch (quoteError: any) {
            console.log(`❌ Quote still failing: ${quoteError.message}`);
            
            if (quoteError.data && quoteError.data.includes("6780cfaf")) {
                console.log("\n🔍 Error 0x6780cfaf suggests:");
                console.log("- Ethereum side needs DVN configuration too");
                console.log("- Or receive library not properly set");
                console.log("\n💡 SOLUTION: Configure Ethereum DVN or add more ETH");
            }
        }
        
    } catch (error: any) {
        console.log(`❌ Test error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
