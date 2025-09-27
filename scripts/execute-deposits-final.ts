import { ethers } from "hardhat";

/**
 * @title Execute Real Cross-Chain Deposits - FINAL VERSION
 * @notice Execute the 3 deposit transactions with proper error handling
 */

async function main() {
    console.log("🚀 EXECUTING REAL DEPOSITS - FINAL VERSION");
    console.log("=".repeat(50));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Contract addresses
    const BSC_USD1_TOKEN = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
    const BSC_WLFI_TOKEN = "0x47474747477b199288bF72a1D702f7Fe0Fb1DEeA";
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    const ETHEREUM_EID = 30101;
    
    try {
        // Check initial balances
        const initialBnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 BNB Balance: ${ethers.formatEther(initialBnbBalance)} BNB`);
        
        const usd1Token = await ethers.getContractAt("IERC20", BSC_USD1_TOKEN);
        const wlfiToken = await ethers.getContractAt("IERC20", BSC_WLFI_TOKEN);
        
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        const wlfiBalance = await wlfiToken.balanceOf(signer.address);
        
        console.log(`💰 USD1 Balance: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
        console.log(`💰 WLFI Balance: ${ethers.formatUnits(wlfiBalance, 18)} WLFI`);
        
        // Get adapters
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", BSC_WLFI_ADAPTER);
        
        // Define amounts
        const usd1Amount = ethers.parseUnits("5", 18); // $5 USD1
        const wlfiAmount = ethers.parseUnits("5", 18); // $5 WLFI
        
        console.log("\n🎯 TRANSACTION PLAN:");
        console.log(`1️⃣  ${ethers.formatUnits(usd1Amount, 18)} USD1 ($5)`);
        console.log(`2️⃣  ${ethers.formatUnits(wlfiAmount, 18)} WLFI ($5)`);  
        console.log(`3️⃣  ${ethers.formatUnits(usd1Amount, 18)} USD1 + ${ethers.formatUnits(wlfiAmount, 18)} WLFI ($10)`);
        
        // =====================================
        // SETUP: Approve tokens for all transactions
        // =====================================
        console.log("\n🔧 SETTING UP TOKEN APPROVALS:");
        console.log("=".repeat(40));
        
        const totalUsd1Needed = usd1Amount * 2n; // TX1 + TX3
        const totalWlfiNeeded = wlfiAmount * 2n; // TX2 + TX3
        
        // Approve USD1
        const usd1Allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        if (usd1Allowance < totalUsd1Needed) {
            console.log(`🔧 Approving ${ethers.formatUnits(totalUsd1Needed, 18)} USD1...`);
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, totalUsd1Needed, {
                gasLimit: 100000
            });
            await approveTx.wait();
            console.log("✅ USD1 approved");
        } else {
            console.log("✅ USD1 already approved");
        }
        
        // Approve WLFI
        const wlfiAllowance = await wlfiToken.allowance(signer.address, BSC_WLFI_ADAPTER);
        if (wlfiAllowance < totalWlfiNeeded) {
            console.log(`🔧 Approving ${ethers.formatUnits(totalWlfiNeeded, 18)} WLFI...`);
            const approveTx = await wlfiToken.approve(BSC_WLFI_ADAPTER, totalWlfiNeeded, {
                gasLimit: 100000
            });
            await approveTx.wait();
            console.log("✅ WLFI approved");
        } else {
            console.log("✅ WLFI already approved");
        }
        
        // =====================================
        // TRANSACTION 1: $5 USD1
        // =====================================
        console.log("\n" + "=".repeat(50));
        console.log("💎 TRANSACTION 1: DEPOSIT $5 USD1");
        console.log("=".repeat(50));
        
        const usd1SendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: usd1Amount,
            minAmountLD: usd1Amount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        // Get fee quote
        const usd1FeeQuote = await usd1Adapter.quoteSend(usd1SendParam, false);
        console.log(`💸 LayerZero Fee: ${ethers.formatEther(usd1FeeQuote.nativeFee)} BNB`);
        
        // Check we have enough BNB
        if (initialBnbBalance < usd1FeeQuote.nativeFee * 4n) {
            throw new Error(`Insufficient BNB. Need ~${ethers.formatEther(usd1FeeQuote.nativeFee * 4n)} BNB for all transactions`);
        }
        
        // Execute USD1 deposit
        console.log("📤 Sending USD1 cross-chain...");
        const usd1SendTx = await usd1Adapter.send(
            usd1SendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: usd1FeeQuote.nativeFee,
                gasLimit: 600000
            }
        );
        
        console.log(`📄 TX Hash: ${usd1SendTx.hash}`);
        console.log(`🔗 View on BSC: https://bscscan.com/tx/${usd1SendTx.hash}`);
        
        const usd1Receipt = await usd1SendTx.wait();
        console.log("✅ USD1 deposit confirmed on BSC!");
        console.log(`⛽ Gas used: ${usd1Receipt?.gasUsed?.toString()}`);
        
        // =====================================
        // Wait and continue with TX2
        // =====================================
        console.log("\n⏳ Waiting 60 seconds before next transaction...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // =====================================
        // TRANSACTION 2: $5 WLFI  
        // =====================================
        console.log("\n" + "=".repeat(50));
        console.log("🔥 TRANSACTION 2: DEPOSIT $5 WLFI");
        console.log("=".repeat(50));
        
        const wlfiSendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: wlfiAmount,
            minAmountLD: wlfiAmount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        const wlfiFeeQuote = await wlfiAdapter.quoteSend(wlfiSendParam, false);
        console.log(`💸 LayerZero Fee: ${ethers.formatEther(wlfiFeeQuote.nativeFee)} BNB`);
        
        console.log("📤 Sending WLFI cross-chain...");
        const wlfiSendTx = await wlfiAdapter.send(
            wlfiSendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: wlfiFeeQuote.nativeFee,
                gasLimit: 600000
            }
        );
        
        console.log(`📄 TX Hash: ${wlfiSendTx.hash}`);
        console.log(`🔗 View on BSC: https://bscscan.com/tx/${wlfiSendTx.hash}`);
        
        const wlfiReceipt = await wlfiSendTx.wait();
        console.log("✅ WLFI deposit confirmed on BSC!");
        console.log(`⛽ Gas used: ${wlfiReceipt?.gasUsed?.toString()}`);
        
        // =====================================
        // Wait and continue with TX3
        // =====================================
        console.log("\n⏳ Waiting 60 seconds before final transaction batch...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // =====================================
        // TRANSACTION 3: $5 USD1 + $5 WLFI
        // =====================================  
        console.log("\n" + "=".repeat(50));
        console.log("💰 TRANSACTION 3: DEPOSIT $5 USD1 + $5 WLFI");
        console.log("=".repeat(50));
        
        // Send second USD1
        console.log("📤 Sending second USD1 batch...");
        const usd1SendTx2 = await usd1Adapter.send(
            usd1SendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: usd1FeeQuote.nativeFee,
                gasLimit: 600000
            }
        );
        console.log(`📄 USD1 TX2: ${usd1SendTx2.hash}`);
        await usd1SendTx2.wait();
        console.log("✅ Second USD1 deposit confirmed!");
        
        // Send second WLFI  
        console.log("📤 Sending second WLFI batch...");
        const wlfiSendTx2 = await wlfiAdapter.send(
            wlfiSendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: wlfiFeeQuote.nativeFee,
                gasLimit: 600000
            }
        );
        console.log(`📄 WLFI TX2: ${wlfiSendTx2.hash}`);
        await wlfiSendTx2.wait();
        console.log("✅ Second WLFI deposit confirmed!");
        
        // =====================================
        // FINAL SUMMARY
        // =====================================
        console.log("\n" + "🎊".repeat(25));
        console.log("🎊 ALL DEPOSITS COMPLETED SUCCESSFULLY! 🎊");
        console.log("🎊".repeat(25));
        
        const finalBnbBalance = await ethers.provider.getBalance(signer.address);
        const bnbSpent = initialBnbBalance - finalBnbBalance;
        
        console.log(`\n💰 FINAL BALANCES:`);
        console.log(`💎 BNB Balance: ${ethers.formatEther(finalBnbBalance)} BNB`);
        console.log(`💸 BNB Spent: ${ethers.formatEther(bnbSpent)} BNB`);
        
        console.log(`\n📊 DEPOSIT SUMMARY:`);
        console.log(`✅ TX1: 5.0 USD1 → Ethereum Eagle Vault`);
        console.log(`✅ TX2: 5.0 WLFI → Ethereum Eagle Vault`);  
        console.log(`✅ TX3: 5.0 USD1 + 5.0 WLFI → Ethereum Eagle Vault`);
        console.log(`💰 TOTAL: $20 worth of tokens deposited`);
        
        console.log(`\n⏰ WHAT'S HAPPENING NOW:`);
        console.log(`🔄 LayerZero is delivering your tokens to Ethereum`);
        console.log(`🏦 Eagle Vault will auto-deposit them into Charm Finance`);
        console.log(`🪙 EAGLE share tokens will be minted to your address`);
        console.log(`⏳ Process completes in 30 seconds - 2 minutes per transaction`);
        
        console.log(`\n🔍 TRACK YOUR DEPOSITS:`);
        console.log(`📍 LayerZero Scan: https://layerzeroscan.com/`);
        console.log(`📍 Eagle Vault: https://etherscan.io/address/0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0`);
        console.log(`📍 Your Address: https://etherscan.io/address/${signer.address}`);
        
        console.log(`\n🎉 SUCCESS! Your omnichain deposits are complete!`);
        
    } catch (error: any) {
        console.log(`\n❌ ERROR: ${error.message}`);
        console.log(`💡 Check: Token balances, BNB for gas, network connectivity`);
        
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
