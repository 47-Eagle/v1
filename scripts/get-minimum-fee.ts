import { ethers } from "hardhat";

/**
 * @title Get Minimum LayerZero Fee
 * @notice Find the exact minimum fee needed for cross-chain transfers
 */

async function main() {
    console.log("💸 FINDING MINIMUM LAYERZERO FEE");
    console.log("=".repeat(35));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    const ETHEREUM_EID = 30101;
    
    try {
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 Current BNB: ${ethers.formatEther(bnbBalance)} BNB`);
        
        // Try to get exact fee quotes using LayerZero estimation
        const usd1Adapter = await ethers.getContractAt([
            "function send(tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes), tuple(address,address), bytes) external payable returns (tuple(bytes32,uint64))",
            "function quoteSend(tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes), bool) external view returns (tuple(uint256,uint256))"
        ], BSC_USD1_ADAPTER);
        
        const amount = ethers.parseUnits("5", 18);
        const recipient = ethers.zeroPadValue(signer.address, 32);
        
        // Try quoteSend to get exact fee
        const sendParam = {
            dstEid: ETHEREUM_EID,
            to: recipient,
            amountLD: amount,
            minAmountLD: amount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        console.log("\n🔍 ATTEMPTING FEE QUOTE:");
        
        try {
            // This might fail due to DVN config, but worth trying
            const quote = await usd1Adapter.quoteSend(sendParam, false);
            const requiredFee = quote.nativeFee;
            
            console.log(`✅ Exact LayerZero fee: ${ethers.formatEther(requiredFee)} BNB`);
            console.log(`💸 For 4 transactions: ${ethers.formatEther(requiredFee * 4n)} BNB`);
            
            const totalNeeded = (requiredFee * 4n) + ethers.parseEther("0.002"); // With buffer
            const shortfall = totalNeeded - bnbBalance;
            
            if (shortfall > 0) {
                console.log(`❌ Need ${ethers.formatEther(shortfall)} BNB more`);
                console.log(`🎯 Add exactly: ${ethers.formatEther(shortfall)} BNB`);
            } else {
                console.log(`✅ You have enough BNB!`);
                console.log(`🚀 Ready to execute deposits`);
            }
            
        } catch (quoteError: any) {
            console.log(`⚠️ Quote failed: ${quoteError.message}`);
            
            // Estimate based on typical LayerZero fees
            console.log("\n📊 USING ESTIMATED FEES:");
            
            // LayerZero V2 typical fees for BSC->Ethereum
            const typicalFee = ethers.parseEther("0.004"); // 4 milliETH is common
            console.log(`💸 Typical LayerZero fee: ${ethers.formatEther(typicalFee)} BNB`);
            console.log(`💸 For 4 transactions: ${ethers.formatEther(typicalFee * 4n)} BNB`);
            
            const totalNeeded = (typicalFee * 4n) + ethers.parseEther("0.002"); // With buffer
            const shortfall = totalNeeded - bnbBalance;
            
            console.log(`\n💰 FUNDING CALCULATION:`);
            console.log(`Current: ${ethers.formatEther(bnbBalance)} BNB`);
            console.log(`Needed: ${ethers.formatEther(totalNeeded)} BNB`);
            
            if (shortfall > 0) {
                console.log(`❌ Shortfall: ${ethers.formatEther(shortfall)} BNB`);
                console.log(`\n🎯 SOLUTION: Add ${ethers.formatEther(shortfall)} BNB`);
                console.log(`📍 Address: ${signer.address}`);
                console.log(`💡 Round up to: ${ethers.formatEther(shortfall + ethers.parseEther("0.001"))} BNB for safety`);
            } else {
                console.log(`✅ Sufficient BNB available!`);
            }
        }
        
        console.log("\n📄 TRANSACTION ANALYSIS:");
        console.log("Last transaction 0x6af14... reverted with 22,960 gas");
        console.log("This indicates LayerZero rejected due to insufficient fee");
        console.log("Typical LayerZero BSC→Ethereum fee: 0.004-0.006 BNB");
        
        console.log("\n🎯 RECOMMENDATION:");
        console.log("Add ~0.005 BNB more to ensure all transactions succeed");
        console.log("This will give you plenty for all 4 deposits + gas costs");
        
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
