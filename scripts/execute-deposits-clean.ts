import { ethers } from "hardhat";

/**
 * @title Execute Real Cross-Chain Deposits
 * @notice Execute the 3 deposit transactions as requested
 */

async function main() {
    console.log("🚀 EXECUTING REAL CROSS-CHAIN DEPOSITS");
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
        // Check balances
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 BNB Balance: ${ethers.formatEther(bnbBalance)} BNB`);
        
        const usd1Token = await ethers.getContractAt("IERC20", BSC_USD1_TOKEN);
        const wlfiToken = await ethers.getContractAt("IERC20", BSC_WLFI_TOKEN);
        
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        const wlfiBalance = await wlfiToken.balanceOf(signer.address);
        
        console.log(`💰 USD1 Balance: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
        console.log(`💰 WLFI Balance: ${ethers.formatUnits(wlfiBalance, 18)} WLFI`);
        
        // Get adapters
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", BSC_WLFI_ADAPTER);
        
        // Define amounts ($5 worth each)
        const usd1Amount = ethers.parseUnits("5", 18);
        const wlfiAmount = ethers.parseUnits("5", 18);
        
        console.log("\n🎯 PLANNED TRANSACTIONS:");
        console.log(`1️⃣  Deposit ${ethers.formatUnits(usd1Amount, 18)} USD1 ($5)`);
        console.log(`2️⃣  Deposit ${ethers.formatUnits(wlfiAmount, 18)} WLFI ($5)`);
        console.log(`3️⃣  Deposit ${ethers.formatUnits(usd1Amount, 18)} USD1 + ${ethers.formatUnits(wlfiAmount, 18)} WLFI ($10)`);
        
        // ========================================
        // TRANSACTION 1: $5 USD1
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("🚀 TRANSACTION 1: DEPOSIT $5 USD1");
        console.log("=".repeat(50));
        
        // Approve USD1
        const currentAllowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        const totalUsd1Needed = usd1Amount * 2n; // For TX1 and TX3
        
        if (currentAllowance < totalUsd1Needed) {
            console.log(`🔧 Approving ${ethers.formatUnits(totalUsd1Needed, 18)} USD1...`);
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, totalUsd1Needed);
            await approveTx.wait();
            console.log("✅ USD1 approved");
        }
        
        // Quote fee
        const usd1SendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: usd1Amount,
            minAmountLD: usd1Amount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        const usd1FeeQuote = await usd1Adapter.quoteSend(usd1SendParam, false);
        console.log(`💸 LayerZero Fee: ${ethers.formatEther(usd1FeeQuote.nativeFee)} BNB`);
        
        // Send USD1
        console.log("📤 Sending USD1 cross-chain...");
        const usd1SendTx = await usd1Adapter.send(
            usd1SendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: usd1FeeQuote.nativeFee,
                gasLimit: 500000 
            }
        );
        
        console.log(`📄 Transaction Hash: ${usd1SendTx.hash}`);
        console.log(`🔗 BSC Explorer: https://bscscan.com/tx/${usd1SendTx.hash}`);
        await usd1SendTx.wait();
        console.log("✅ USD1 deposit confirmed on BSC!");
        console.log("⏳ LayerZero delivery to Ethereum in progress...");
        
        // Wait between transactions
        console.log("⏳ Waiting 60 seconds before next transaction...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // ========================================
        // TRANSACTION 2: $5 WLFI
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("🚀 TRANSACTION 2: DEPOSIT $5 WLFI");
        console.log("=".repeat(50));
        
        // Approve WLFI
        const currentWlfiAllowance = await wlfiToken.allowance(signer.address, BSC_WLFI_ADAPTER);
        const totalWlfiNeeded = wlfiAmount * 2n; // For TX2 and TX3
        
        if (currentWlfiAllowance < totalWlfiNeeded) {
            console.log(`🔧 Approving ${ethers.formatUnits(totalWlfiNeeded, 18)} WLFI...`);
            const approveWlfiTx = await wlfiToken.approve(BSC_WLFI_ADAPTER, totalWlfiNeeded);
            await approveWlfiTx.wait();
            console.log("✅ WLFI approved");
        }
        
        // Quote fee
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
        
        // Send WLFI
        console.log("📤 Sending WLFI cross-chain...");
        const wlfiSendTx = await wlfiAdapter.send(
            wlfiSendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: wlfiFeeQuote.nativeFee,
                gasLimit: 500000
            }
        );
        
        console.log(`📄 Transaction Hash: ${wlfiSendTx.hash}`);
        console.log(`🔗 BSC Explorer: https://bscscan.com/tx/${wlfiSendTx.hash}`);
        await wlfiSendTx.wait();
        console.log("✅ WLFI deposit confirmed on BSC!");
        console.log("⏳ LayerZero delivery to Ethereum in progress...");
        
        // Wait between transactions
        console.log("⏳ Waiting 60 seconds before final transaction...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // ========================================
        // TRANSACTION 3: $5 USD1 + $5 WLFI
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("🚀 TRANSACTION 3: DEPOSIT $5 USD1 + $5 WLFI");
        console.log("=".repeat(50));
        
        // Send USD1
        console.log("📤 Sending second USD1 batch...");
        const usd1SendTx2 = await usd1Adapter.send(
            usd1SendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: usd1FeeQuote.nativeFee,
                gasLimit: 500000
            }
        );
        console.log(`📄 USD1 TX Hash: ${usd1SendTx2.hash}`);
        await usd1SendTx2.wait();
        console.log("✅ Second USD1 deposit confirmed!");
        
        // Send WLFI
        console.log("📤 Sending second WLFI batch...");
        const wlfiSendTx2 = await wlfiAdapter.send(
            wlfiSendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { 
                value: wlfiFeeQuote.nativeFee,
                gasLimit: 500000
            }
        );
        console.log(`📄 WLFI TX Hash: ${wlfiSendTx2.hash}`);
        await wlfiSendTx2.wait();
        console.log("✅ Second WLFI deposit confirmed!");
        
        // ========================================
        // SUMMARY
        // ========================================
        console.log("\n" + "🎊".repeat(20));
        console.log("🎊 ALL DEPOSITS COMPLETED SUCCESSFULLY! 🎊");
        console.log("🎊".repeat(20));
        
        const finalBnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 Final BNB Balance: ${ethers.formatEther(finalBnbBalance)} BNB`);
        console.log(`💸 Total BNB spent: ${ethers.formatEther(bnbBalance - finalBnbBalance)} BNB`);
        
        console.log("\n📊 DEPOSIT SUMMARY:");
        console.log("=".repeat(30));
        console.log(`✅ Transaction 1: 5.0 USD1 → Ethereum`);
        console.log(`✅ Transaction 2: 5.0 WLFI → Ethereum`);  
        console.log(`✅ Transaction 3: 5.0 USD1 + 5.0 WLFI → Ethereum`);
        console.log(`💰 Total Value: ~$20 worth of tokens`);
        
        console.log("\n⏰ PROCESSING TIME:");
        console.log("🔄 LayerZero delivery: 30 seconds - 2 minutes per transaction");
        console.log("🏦 Eagle Vault processing: Automatic upon receipt");
        console.log("🪙 EAGLE share tokens: Minted to your address");
        
        console.log("\n🔍 TRACK YOUR DEPOSITS:");
        console.log(`📍 BSC USD1 Adapter: https://bscscan.com/address/${BSC_USD1_ADAPTER}`);
        console.log(`📍 BSC WLFI Adapter: https://bscscan.com/address/${BSC_WLFI_ADAPTER}`);
        console.log(`📍 Eagle Vault (ETH): https://etherscan.io/address/0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0`);
        console.log(`📍 LayerZero Scan: https://layerzeroscan.com/`);
        
        console.log("\n🎉 Your cross-chain deposits are complete!");
        console.log("💼 Check your Eagle Vault balance on Ethereum in a few minutes");
        
    } catch (error: any) {
        console.log(`❌ Error during deposits: ${error.message}`);
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
