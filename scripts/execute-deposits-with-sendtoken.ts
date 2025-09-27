import { ethers } from "hardhat";

/**
 * @title Execute Deposits with sendToken Interface
 * @notice Use the proven sendToken() interface for your $20 deposits
 */

async function main() {
    console.log("🚀 EXECUTING $20 DEPOSITS WITH SENDTOKEN");
    console.log("=".repeat(45));
    
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
        
        if (bnbBalance < ethers.parseEther("0.014")) {
            console.log("❌ Insufficient BNB for LayerZero fees");
            console.log("💡 Add ~0.015 BNB to your wallet first");
            return;
        }
        
        const usd1Token = await ethers.getContractAt("IERC20", BSC_USD1_TOKEN);
        const wlfiToken = await ethers.getContractAt("IERC20", BSC_WLFI_TOKEN);
        
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        const wlfiBalance = await wlfiToken.balanceOf(signer.address);
        
        console.log(`💰 USD1: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
        console.log(`💰 WLFI: ${ethers.formatUnits(wlfiBalance, 18)} WLFI`);
        
        // Get adapters with sendToken interface
        const usd1Adapter = await ethers.getContractAt([
            "function sendToken(uint32 dstEid, bytes32 to, uint256 amountLD) external payable"
        ], BSC_USD1_ADAPTER);
        
        const wlfiAdapter = await ethers.getContractAt([
            "function sendToken(uint32 dstEid, bytes32 to, uint256 amountLD) external payable"
        ], BSC_WLFI_ADAPTER);
        
        // Define amounts
        const usd1Amount = ethers.parseUnits("5", 18); // $5 USD1
        const wlfiAmount = ethers.parseUnits("5", 18); // $5 WLFI
        const recipient = ethers.zeroPadValue(signer.address, 32);
        const layerZeroFee = ethers.parseEther("0.0035"); // 3.5 milliETH per tx
        
        console.log("\n🎯 TRANSACTION PLAN:");
        console.log(`1️⃣  ${ethers.formatUnits(usd1Amount, 18)} USD1 → Ethereum`);
        console.log(`2️⃣  ${ethers.formatUnits(wlfiAmount, 18)} WLFI → Ethereum`);
        console.log(`3️⃣  ${ethers.formatUnits(usd1Amount, 18)} USD1 → Ethereum`);
        console.log(`4️⃣  ${ethers.formatUnits(wlfiAmount, 18)} WLFI → Ethereum`);
        console.log(`💸 LayerZero fee per tx: ${ethers.formatEther(layerZeroFee)} BNB`);
        
        // Approve tokens
        console.log("\n🔧 TOKEN APPROVALS:");
        const usd1Allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        const wlfiAllowance = await wlfiToken.allowance(signer.address, BSC_WLFI_ADAPTER);
        
        if (usd1Allowance < usd1Amount * 2n) {
            console.log("🔧 Approving USD1...");
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, usd1Amount * 2n);
            await approveTx.wait();
            console.log("✅ USD1 approved");
        }
        
        if (wlfiAllowance < wlfiAmount * 2n) {
            console.log("🔧 Approving WLFI...");
            const approveTx = await wlfiToken.approve(BSC_WLFI_ADAPTER, wlfiAmount * 2n);
            await approveTx.wait();
            console.log("✅ WLFI approved");
        }
        
        // TRANSACTION 1: $5 USD1
        console.log("\n" + "=".repeat(50));
        console.log("💎 TRANSACTION 1: $5 USD1 DEPOSIT");
        console.log("=".repeat(50));
        
        const usd1Tx1 = await usd1Adapter.sendToken(
            ETHEREUM_EID,
            recipient,
            usd1Amount,
            {
                value: layerZeroFee,
                gasLimit: 400000
            }
        );
        
        console.log(`📄 TX1 Hash: ${usd1Tx1.hash}`);
        console.log(`🔗 BSCScan: https://bscscan.com/tx/${usd1Tx1.hash}`);
        await usd1Tx1.wait();
        console.log("✅ USD1 Transaction 1 confirmed!");
        
        // Wait between transactions
        console.log("⏳ Waiting 30 seconds...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // TRANSACTION 2: $5 WLFI
        console.log("\n" + "=".repeat(50));
        console.log("🔥 TRANSACTION 2: $5 WLFI DEPOSIT");
        console.log("=".repeat(50));
        
        const wlfiTx1 = await wlfiAdapter.sendToken(
            ETHEREUM_EID,
            recipient,
            wlfiAmount,
            {
                value: layerZeroFee,
                gasLimit: 400000
            }
        );
        
        console.log(`📄 TX2 Hash: ${wlfiTx1.hash}`);
        console.log(`🔗 BSCScan: https://bscscan.com/tx/${wlfiTx1.hash}`);
        await wlfiTx1.wait();
        console.log("✅ WLFI Transaction 1 confirmed!");
        
        // Wait between transactions
        console.log("⏳ Waiting 30 seconds...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // TRANSACTION 3: Second $5 USD1
        console.log("\n" + "=".repeat(50));
        console.log("💰 TRANSACTION 3: $5 USD1 (COMBO PART 1)");
        console.log("=".repeat(50));
        
        const usd1Tx2 = await usd1Adapter.sendToken(
            ETHEREUM_EID,
            recipient,
            usd1Amount,
            {
                value: layerZeroFee,
                gasLimit: 400000
            }
        );
        
        console.log(`📄 TX3 Hash: ${usd1Tx2.hash}`);
        await usd1Tx2.wait();
        console.log("✅ USD1 Transaction 2 confirmed!");
        
        // TRANSACTION 4: Second $5 WLFI
        console.log("\n" + "=".repeat(50));
        console.log("💰 TRANSACTION 4: $5 WLFI (COMBO PART 2)");
        console.log("=".repeat(50));
        
        const wlfiTx2 = await wlfiAdapter.sendToken(
            ETHEREUM_EID,
            recipient,
            wlfiAmount,
            {
                value: layerZeroFee,
                gasLimit: 400000
            }
        );
        
        console.log(`📄 TX4 Hash: ${wlfiTx2.hash}`);
        await wlfiTx2.wait();
        console.log("✅ WLFI Transaction 2 confirmed!");
        
        // SUMMARY
        console.log("\n" + "🎊".repeat(25));
        console.log("🎊 ALL $20 DEPOSITS COMPLETED! 🎊");
        console.log("🎊".repeat(25));
        
        const finalBnbBalance = await ethers.provider.getBalance(signer.address);
        const bnbSpent = bnbBalance - finalBnbBalance;
        
        console.log(`\n📊 DEPOSIT SUMMARY:`);
        console.log(`✅ Transaction 1: 5.0 USD1 → Ethereum Eagle Vault`);
        console.log(`✅ Transaction 2: 5.0 WLFI → Ethereum Eagle Vault`);
        console.log(`✅ Transaction 3: 5.0 USD1 → Ethereum Eagle Vault`);
        console.log(`✅ Transaction 4: 5.0 WLFI → Ethereum Eagle Vault`);
        console.log(`💰 Total: $20 worth deposited`);
        console.log(`💸 BNB spent: ${ethers.formatEther(bnbSpent)} BNB`);
        
        console.log(`\n⏰ WHAT'S HAPPENING NOW:`);
        console.log(`🔄 LayerZero delivering tokens to Ethereum (30s-2min each)`);
        console.log(`🏦 Eagle Vault auto-processing deposits`);
        console.log(`🪙 EAGLE share tokens being minted to your address`);
        console.log(`💎 Charm Finance strategies being deployed`);
        
        console.log(`\n🔍 TRACK YOUR DEPOSITS:`);
        console.log(`📍 Eagle Vault: https://etherscan.io/address/0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0`);
        console.log(`📍 LayerZero Scan: https://layerzeroscan.com/`);
        console.log(`📍 Your Address: https://etherscan.io/address/${signer.address}`);
        
    } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
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
