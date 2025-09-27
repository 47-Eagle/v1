import { ethers } from "hardhat";

/**
 * @title Execute Real Deposits from BSC
 * @notice Make actual cross-chain deposits to Eagle Vault
 */

async function main() {
    console.log("💰 EXECUTING REAL DEPOSITS FROM BSC TO ETHEREUM VAULT");
    console.log("=".repeat(60));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const bnbBalance = await ethers.provider.getBalance(signer.address);
    console.log(`💰 BNB Balance: ${ethers.formatEther(bnbBalance)} BNB`);
    
    // Contract addresses on BSC
    const BSC_USD1_TOKEN = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
    const BSC_WLFI_TOKEN = "0x47474747477b199288bF72a1D702f7Fe0Fb1DEeA"; // Different on BSC
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    
    const ETHEREUM_EID = 30101;
    
    try {
        // Check token balances
        console.log("\n📊 CHECKING CURRENT BALANCES:");
        console.log("=".repeat(35));
        
        const usd1Token = await ethers.getContractAt("IERC20Metadata", BSC_USD1_TOKEN);
        const wlfiToken = await ethers.getContractAt("IERC20Metadata", BSC_WLFI_TOKEN);
        
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        const wlfiBalance = await wlfiToken.balanceOf(signer.address);
        const usd1Decimals = await usd1Token.decimals();
        const wlfiDecimals = await wlfiToken.decimals();
        
        console.log(`💰 USD1 Balance: ${ethers.formatUnits(usd1Balance, usd1Decimals)} USD1`);
        console.log(`💰 WLFI Balance: ${ethers.formatUnits(wlfiBalance, wlfiDecimals)} WLFI`);
        
        // Calculate $5 worth of each token (assuming $1 per token for simplicity)
        const usd1Amount = ethers.parseUnits("5", usd1Decimals); // $5 worth
        const wlfiAmount = ethers.parseUnits("5", wlfiDecimals); // $5 worth
        
        console.log(`\n🎯 PLANNED DEPOSITS:`);
        console.log(`   Transaction 1: ${ethers.formatUnits(usd1Amount, usd1Decimals)} USD1 ($5)`);
        console.log(`   Transaction 2: ${ethers.formatUnits(wlfiAmount, wlfiDecimals)} WLFI ($5)`);
        console.log(`   Transaction 3: ${ethers.formatUnits(usd1Amount, usd1Decimals)} USD1 + ${ethers.formatUnits(wlfiAmount, wlfiDecimals)} WLFI ($10)`);
        
        // Check if we have enough tokens
        if (usd1Balance < usd1Amount * 2n) {
            console.log(`❌ Insufficient USD1. Need ${ethers.formatUnits(usd1Amount * 2n, usd1Decimals)}, have ${ethers.formatUnits(usd1Balance, usd1Decimals)}`);
            return;
        }
        
        if (wlfiBalance < wlfiAmount * 2n) {
            console.log(`❌ Insufficient WLFI. Need ${ethers.formatUnits(wlfiAmount * 2n, wlfiDecimals)}, have ${ethers.formatUnits(wlfiBalance, wlfiDecimals)}`);
            return;
        }
        
        console.log(`✅ Sufficient token balances for all transactions`);
        
        // Get OFT adapters
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", BSC_WLFI_ADAPTER);
        
        // TRANSACTION 1: $5 USD1
        console.log("\n🚀 TRANSACTION 1: DEPOSIT $5 USD1");
        console.log("=".repeat(35));
        
        // Check USD1 allowance
        const usd1Allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        if (usd1Allowance < usd1Amount) {
            console.log("🔧 Approving USD1...");
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, usd1Amount * 3n); // Approve for all transactions
            await approveTx.wait();
            console.log("✅ USD1 approved");
        }
        
        // Get LayerZero fee for USD1
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
        console.log(`💸 LayerZero fee: ${ethers.formatEther(usd1FeeQuote.nativeFee)} BNB`);
        
        if (bnbBalance < usd1FeeQuote.nativeFee * 3n) {
            console.log(`❌ Insufficient BNB for fees. Need ~${ethers.formatEther(usd1FeeQuote.nativeFee * 3n)} BNB`);
            return;
        }
        
        // Execute USD1 deposit
        console.log("📤 Sending USD1 cross-chain...");
        const usd1SendTx = await usd1Adapter.send(
            usd1SendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { value: usd1FeeQuote.nativeFee }
        );
        
        console.log(`📄 USD1 TX Hash: ${usd1SendTx.hash}`);
        await usd1SendTx.wait();
        console.log("✅ USD1 deposit transaction confirmed!");
        
        // Wait a bit before next transaction
        console.log("⏳ Waiting 30 seconds before next transaction...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // TRANSACTION 2: $5 WLFI
        console.log("\n🚀 TRANSACTION 2: DEPOSIT $5 WLFI");
        console.log("=".repeat(35));
        
        // Check WLFI allowance
        const wlfiAllowance = await wlfiToken.allowance(signer.address, BSC_WLFI_ADAPTER);
        if (wlfiAllowance < wlfiAmount) {
            console.log("🔧 Approving WLFI...");
            const approveWlfiTx = await wlfiToken.approve(BSC_WLFI_ADAPTER, wlfiAmount * 2n);
            await approveWlfiTx.wait();
            console.log("✅ WLFI approved");
        }
        
        // Get LayerZero fee for WLFI
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
        console.log(`💸 LayerZero fee: ${ethers.formatEther(wlfiFeeQuote.nativeFee)} BNB`);
        
        // Execute WLFI deposit
        console.log("📤 Sending WLFI cross-chain...");
        const wlfiSendTx = await wlfiAdapter.send(
            wlfiSendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { value: wlfiFeeQuote.nativeFee }
        );
        
        console.log(`📄 WLFI TX Hash: ${wlfiSendTx.hash}`);
        await wlfiSendTx.wait();
        console.log("✅ WLFI deposit transaction confirmed!");
        
        // Wait before final transaction
        console.log("⏳ Waiting 30 seconds before final transaction...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // TRANSACTION 3: $5 USD1 + $5 WLFI (two separate sends)
        console.log("\n🚀 TRANSACTION 3: DEPOSIT $5 USD1 + $5 WLFI");
        console.log("=".repeat(45));
        
        // Send USD1
        console.log("📤 Sending additional USD1...");
        const usd1SendTx2 = await usd1Adapter.send(
            usd1SendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { value: usd1FeeQuote.nativeFee }
        );
        console.log(`📄 USD1 TX2 Hash: ${usd1SendTx2.hash}`);
        await usd1SendTx2.wait();
        console.log("✅ Additional USD1 deposit confirmed!");
        
        // Send WLFI
        console.log("📤 Sending additional WLFI...");
        const wlfiSendTx2 = await wlfiAdapter.send(
            wlfiSendParam,
            { refundAddress: signer.address, zroPaymentAddress: ethers.ZeroAddress },
            { value: wlfiFeeQuote.nativeFee }
        );
        console.log(`📄 WLFI TX2 Hash: ${wlfiSendTx2.hash}`);
        await wlfiSendTx2.wait();
        console.log("✅ Additional WLFI deposit confirmed!");
        
        console.log("\n🎊 ALL DEPOSITS COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(40));
        
        const finalBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 Final BNB Balance: ${ethers.formatEther(finalBalance)} BNB`);
        
        console.log("\n📊 SUMMARY:");
        console.log(`✅ Deposited: $5 USD1 (TX1)`);
        console.log(`✅ Deposited: $5 WLFI (TX2)`);  
        console.log(`✅ Deposited: $5 USD1 + $5 WLFI (TX3)`);
        console.log(`💰 Total deposited: $20 worth of tokens`);
        console.log(`⏳ LayerZero processing: 30s-2min per transaction`);
        console.log(`🎯 Eagle Vault will receive all deposits automatically`);
        console.log(`🪙 EAGLE shares will be minted for your vault position`);
        
        console.log("\n🔗 TRACK YOUR DEPOSITS:");
        console.log(`📍 BSC USD1 Adapter: https://bscscan.com/address/${BSC_USD1_ADAPTER}`);
        console.log(`📍 BSC WLFI Adapter: https://bscscan.com/address/${BSC_WLFI_ADAPTER}`);
        console.log(`📍 Eagle Vault: https://etherscan.io/address/0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0`);
        
    } catch (error: any) {
        console.log(`❌ Error executing deposits: ${error.message}`);
        console.log("🔧 Please check your token balances and BNB for gas");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
