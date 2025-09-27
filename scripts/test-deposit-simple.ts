import { ethers } from "hardhat";

/**
 * @title Test Simple Deposit 
 * @notice Test if deposits work without custom DVN configuration
 */

async function main() {
    console.log("🧪 TESTING SIMPLE DEPOSIT");
    console.log("=".repeat(30));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_TOKEN = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const ETHEREUM_EID = 30101;
    
    try {
        // Check balances
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 BNB Balance: ${ethers.formatEther(bnbBalance)} BNB`);
        
        const usd1Token = await ethers.getContractAt("IERC20", BSC_USD1_TOKEN);
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        console.log(`💰 USD1 Balance: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
        
        // Get adapter
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        
        // Check allowance
        const allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        console.log(`🔓 USD1 Allowance: ${ethers.formatUnits(allowance, 18)} USD1`);
        
        // Test amount: 0.1 USD1
        const testAmount = ethers.parseUnits("0.1", 18);
        
        console.log(`\n🎯 Testing deposit of ${ethers.formatUnits(testAmount, 18)} USD1`);
        
        // Approve if needed
        if (allowance < testAmount) {
            console.log("🔧 Approving USD1...");
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, testAmount, {
                gasLimit: 100000
            });
            await approveTx.wait();
            console.log("✅ USD1 approved");
        }
        
        // Create send parameters
        const sendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: testAmount,
            minAmountLD: testAmount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        console.log("\n💸 Getting LayerZero fee quote...");
        const feeQuote = await usd1Adapter.quoteSend(sendParam, false);
        console.log(`Fee: ${ethers.formatEther(feeQuote.nativeFee)} BNB`);
        
        if (bnbBalance < feeQuote.nativeFee) {
            console.log("❌ Insufficient BNB for LayerZero fee");
            return;
        }
        
        console.log("\n🚀 Executing test deposit...");
        
        // Execute the send with high gas limit to avoid any gas issues
        const sendTx = await usd1Adapter.send(
            sendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: feeQuote.nativeFee,
                gasLimit: 600000 // High gas limit
            }
        );
        
        console.log(`📄 Transaction Hash: ${sendTx.hash}`);
        console.log(`🔗 View on BSC: https://bscscan.com/tx/${sendTx.hash}`);
        
        const receipt = await sendTx.wait();
        console.log(`✅ Transaction confirmed! Gas used: ${receipt?.gasUsed?.toString()}`);
        
        console.log("\n🎉 SUCCESS!");
        console.log("✅ Test deposit completed successfully");
        console.log("⏳ LayerZero will deliver to Ethereum in 30s-2min");
        console.log("🏦 Eagle Vault will automatically process the tokens");
        
        console.log("\n🚀 Ready for full deposits! LayerZero configuration is working!");
        
    } catch (error: any) {
        console.log(`❌ Test failed: ${error.message}`);
        if (error.data) {
            console.log(`📄 Error data: ${error.data}`);
        }
        
        // Decode the error if it's the same as before
        if (error.data === "0x6592671c0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("\n🔍 DECODING ERROR 0x6592671c:");
            console.log("This LayerZero error typically means:");
            console.log("- Missing send/receive library configuration");
            console.log("- DVN configuration mismatch"); 
            console.log("- Enforced options not set");
            console.log("- Or pathway not properly configured");
            
            console.log("\n💡 SOLUTION: We need to use the proper LayerZero CLI:");
            console.log("npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
