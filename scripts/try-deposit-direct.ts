import { ethers } from "hardhat";

/**
 * @title Try Direct Deposit
 * @notice Attempt deposit with current configuration - LayerZero might use defaults
 */

async function main() {
    console.log("🎯 ATTEMPTING DIRECT DEPOSIT");
    console.log("=".repeat(35));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_TOKEN = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const ETHEREUM_EID = 30101;
    
    try {
        console.log("\n💰 CHECKING BALANCES:");
        
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        const usd1Token = await ethers.getContractAt("IERC20", BSC_USD1_TOKEN);
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        const allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        
        console.log(`BNB: ${ethers.formatEther(bnbBalance)} BNB`);
        console.log(`USD1: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
        console.log(`Allowance: ${ethers.formatUnits(allowance, 18)} USD1`);
        
        // Try very small amount first - 0.01 USD1
        const testAmount = ethers.parseUnits("0.01", 18);
        console.log(`\n🧪 Testing ${ethers.formatUnits(testAmount, 18)} USD1 deposit`);
        
        if (allowance < testAmount) {
            console.log("🔧 Approving USD1...");
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, testAmount, {
                gasLimit: 60000
            });
            await approveTx.wait();
            console.log("✅ Approved");
        }
        
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        
        const sendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: testAmount,
            minAmountLD: testAmount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        console.log("\n💸 Getting fee quote...");
        
        try {
            const feeQuote = await usd1Adapter.quoteSend(sendParam, false);
            console.log(`✅ Quote success: ${ethers.formatEther(feeQuote.nativeFee)} BNB`);
            
            if (bnbBalance < feeQuote.nativeFee) {
                console.log("❌ Insufficient BNB for fee");
                return;
            }
            
            console.log("\n🚀 EXECUTING TEST DEPOSIT...");
            
            const sendTx = await usd1Adapter.send(
                sendParam,
                { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
                { 
                    value: feeQuote.nativeFee,
                    gasLimit: 500000
                }
            );
            
            console.log(`📄 TX: ${sendTx.hash}`);
            console.log(`🔗 BSC: https://bscscan.com/tx/${sendTx.hash}`);
            
            const receipt = await sendTx.wait();
            console.log(`✅ DEPOSIT SUCCESS! Gas: ${receipt?.gasUsed?.toString()}`);
            
            console.log("\n🎉 IT WORKS!");
            console.log("✅ LayerZero configuration is functional");
            console.log("🚀 Ready for your full $20 deposits!");
            console.log("⏳ This test deposit will arrive on Ethereum in 30s-2min");
            
        } catch (quoteError: any) {
            console.log(`❌ Quote failed: ${quoteError.message}`);
            
            if (quoteError.data) {
                const errorCode = quoteError.data.slice(0, 10);
                console.log(`📄 Error code: ${errorCode}`);
                
                if (errorCode === "0x6780cfaf") {
                    console.log("🔧 This means Ethereum receive config is missing");
                    console.log("💡 LayerZero V2 requires both send AND receive configuration");
                } else if (errorCode === "0x6592671c") {
                    console.log("🔧 This means send library configuration is missing");
                }
                
                console.log("\n🎯 SOLUTION: Need to complete DVN setup on both chains");
                console.log("💸 Current ETH balance should be sufficient for quick config");
            }
        }
        
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
