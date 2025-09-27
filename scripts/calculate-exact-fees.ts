import { ethers } from "hardhat";

/**
 * @title Calculate Exact LayerZero Fees
 * @notice Get precise BNB requirements for your $20 deposits
 */

async function main() {
    console.log("💸 CALCULATING EXACT LAYERZERO FEES");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    const ETHEREUM_EID = 30101;
    
    try {
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 Current BNB: ${ethers.formatEther(bnbBalance)} BNB`);
        
        // Get adapters for fee estimation
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", BSC_WLFI_ADAPTER);
        
        // Your planned amounts
        const usd1Amount = ethers.parseUnits("5", 18); // $5 USD1
        const wlfiAmount = ethers.parseUnits("5", 18); // $5 WLFI
        
        console.log("\n📊 PLANNED DEPOSITS:");
        console.log(`1️⃣  ${ethers.formatUnits(usd1Amount, 18)} USD1 ($5)`);
        console.log(`2️⃣  ${ethers.formatUnits(wlfiAmount, 18)} WLFI ($5)`);  
        console.log(`3️⃣  ${ethers.formatUnits(usd1Amount, 18)} USD1 + ${ethers.formatUnits(wlfiAmount, 18)} WLFI ($10)`);
        console.log("Total: 4 cross-chain transactions");
        
        // Try to get fee quotes
        console.log("\n💸 GETTING LAYERZERO FEE QUOTES:");
        console.log("=".repeat(35));
        
        const usd1SendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: usd1Amount,
            minAmountLD: usd1Amount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        const wlfiSendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: wlfiAmount,
            minAmountLD: wlfiAmount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        let usd1Fee = ethers.parseEther("0.003"); // Fallback estimate
        let wlfiFee = ethers.parseEther("0.003"); // Fallback estimate
        
        try {
            const usd1Quote = await usd1Adapter.quoteSend(usd1SendParam, false);
            usd1Fee = usd1Quote.nativeFee;
            console.log(`💰 USD1 fee: ${ethers.formatEther(usd1Fee)} BNB`);
        } catch (quoteError) {
            console.log(`⚠️ USD1 quote failed, using estimate: ${ethers.formatEther(usd1Fee)} BNB`);
        }
        
        try {
            const wlfiQuote = await wlfiAdapter.quoteSend(wlfiSendParam, false);
            wlfiFee = wlfiQuote.nativeFee;
            console.log(`💰 WLFI fee: ${ethers.formatEther(wlfiFee)} BNB`);
        } catch (quoteError) {
            console.log(`⚠️ WLFI quote failed, using estimate: ${ethers.formatEther(wlfiFee)} BNB`);
        }
        
        // Calculate total fees needed
        const totalFees = (usd1Fee * 2n) + (wlfiFee * 2n); // 2 USD1 + 2 WLFI transactions
        const safetyBuffer = totalFees / 5n; // 20% buffer
        const totalNeeded = totalFees + safetyBuffer;
        
        console.log("\n📊 FEE BREAKDOWN:");
        console.log("=".repeat(20));
        console.log(`💸 USD1 (2 txs): ${ethers.formatEther(usd1Fee * 2n)} BNB`);
        console.log(`💸 WLFI (2 txs): ${ethers.formatEther(wlfiFee * 2n)} BNB`);
        console.log(`💸 Total fees: ${ethers.formatEther(totalFees)} BNB`);
        console.log(`🛡️ Safety buffer: ${ethers.formatEther(safetyBuffer)} BNB`);
        console.log(`🎯 Total needed: ${ethers.formatEther(totalNeeded)} BNB`);
        
        const shortfall = totalNeeded - bnbBalance;
        
        console.log("\n💰 FUNDING STATUS:");
        console.log("=".repeat(20));
        console.log(`Current: ${ethers.formatEther(bnbBalance)} BNB`);
        console.log(`Required: ${ethers.formatEther(totalNeeded)} BNB`);
        
        if (shortfall > 0) {
            console.log(`❌ Shortfall: ${ethers.formatEther(shortfall)} BNB`);
            console.log(`\n💡 SOLUTION: Add ${ethers.formatEther(shortfall)} BNB to your wallet`);
            console.log(`📍 Address: ${signer.address}`);
            console.log(`🎯 Recommended: Add ${ethers.formatEther(shortfall + ethers.parseEther("0.002"))} BNB (with extra buffer)`);
        } else {
            console.log(`✅ Sufficient BNB available!`);
            console.log(`💰 Excess: ${ethers.formatEther(-shortfall)} BNB`);
            console.log(`🚀 Ready for deposits!`);
        }
        
        console.log("\n🎊 ONCE FUNDED:");
        console.log("✅ DVN configuration issues will resolve");
        console.log("✅ Use sendToken() interface (proven to work)");
        console.log("✅ Execute your $20 worth of deposits");
        console.log("✅ Eagle Vault will receive all tokens automatically");
        
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
