import { ethers } from "hardhat";

/**
 * @title Execute with Current Balance
 * @notice Try deposits with available BNB, adjusting fees as needed
 */

async function main() {
    console.log("🚀 EXECUTING DEPOSITS WITH CURRENT BALANCE");
    console.log("=".repeat(45));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_TOKEN = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
    const BSC_WLFI_TOKEN = "0x47474747477b199288bF72a1D702f7Fe0Fb1DEeA";
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    const ETHEREUM_EID = 30101;
    
    try {
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 BNB Balance: ${ethers.formatEther(bnbBalance)} BNB`);
        
        // Calculate per-transaction fee based on available balance
        const availableBnb = bnbBalance - ethers.parseEther("0.001"); // Keep 0.001 BNB for safety
        const feePerTx = availableBnb / 4n; // Divide among 4 transactions
        
        console.log(`💸 Fee per transaction: ${ethers.formatEther(feePerTx)} BNB`);
        console.log(`💸 Total for 4 txs: ${ethers.formatEther(feePerTx * 4n)} BNB`);
        
        if (feePerTx < ethers.parseEther("0.001")) {
            console.log("❌ Fee too low - need more BNB");
            console.log("💡 Add just a tiny bit more BNB (~0.002 BNB more)");
            return;
        }
        
        const usd1Token = await ethers.getContractAt("IERC20", BSC_USD1_TOKEN);
        const wlfiToken = await ethers.getContractAt("IERC20", BSC_WLFI_TOKEN);
        
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        const wlfiBalance = await wlfiToken.balanceOf(signer.address);
        
        console.log(`💰 USD1: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
        console.log(`💰 WLFI: ${ethers.formatUnits(wlfiBalance, 18)} WLFI`);
        
        // Get adapters
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
        
        console.log("\n🎯 EXECUTING WITH ADJUSTED FEES:");
        console.log(`Amount per deposit: $5 worth`);
        console.log(`LayerZero fee: ${ethers.formatEther(feePerTx)} BNB per tx`);
        
        // Check and approve tokens
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
        
        // EXECUTE DEPOSITS
        console.log("\n🚀 STARTING DEPOSITS:");
        
        // Transaction 1: USD1
        console.log("\n💎 TX1: $5 USD1");
        try {
            const tx1 = await usd1Adapter.sendToken(
                ETHEREUM_EID,
                recipient,
                usd1Amount,
                {
                    value: feePerTx,
                    gasLimit: 400000
                }
            );
            console.log(`📄 TX1: ${tx1.hash}`);
            await tx1.wait();
            console.log("✅ TX1 confirmed!");
        } catch (tx1Error: any) {
            console.log(`❌ TX1 failed: ${tx1Error.message}`);
            if (tx1Error.data && tx1Error.data.includes("6780cfaf")) {
                console.log("🔧 LayerZero config issue - fee might be too low");
                console.log("💡 Try adding a bit more BNB for higher fees");
            }
            return;
        }
        
        console.log("⏳ Waiting 30 seconds...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Transaction 2: WLFI
        console.log("\n🔥 TX2: $5 WLFI");
        const tx2 = await wlfiAdapter.sendToken(
            ETHEREUM_EID,
            recipient,
            wlfiAmount,
            {
                value: feePerTx,
                gasLimit: 400000
            }
        );
        console.log(`📄 TX2: ${tx2.hash}`);
        await tx2.wait();
        console.log("✅ TX2 confirmed!");
        
        console.log("⏳ Waiting 30 seconds...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Transaction 3: USD1 again
        console.log("\n💰 TX3: $5 USD1 (combo part 1)");
        const tx3 = await usd1Adapter.sendToken(
            ETHEREUM_EID,
            recipient,
            usd1Amount,
            {
                value: feePerTx,
                gasLimit: 400000
            }
        );
        console.log(`📄 TX3: ${tx3.hash}`);
        await tx3.wait();
        console.log("✅ TX3 confirmed!");
        
        // Transaction 4: WLFI again
        console.log("\n💰 TX4: $5 WLFI (combo part 2)");
        const tx4 = await wlfiAdapter.sendToken(
            ETHEREUM_EID,
            recipient,
            wlfiAmount,
            {
                value: feePerTx,
                gasLimit: 400000
            }
        );
        console.log(`📄 TX4: ${tx4.hash}`);
        await tx4.wait();
        console.log("✅ TX4 confirmed!");
        
        console.log("\n🎉 ALL $20 DEPOSITS COMPLETED!");
        console.log("=".repeat(40));
        
        const finalBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 Final BNB: ${ethers.formatEther(finalBalance)} BNB`);
        console.log(`💸 BNB spent: ${ethers.formatEther(bnbBalance - finalBalance)} BNB`);
        
        console.log("\n✅ DEPOSITS SUMMARY:");
        console.log("1️⃣  5.0 USD1 → Ethereum Eagle Vault");
        console.log("2️⃣  5.0 WLFI → Ethereum Eagle Vault");  
        console.log("3️⃣  5.0 USD1 → Ethereum Eagle Vault");
        console.log("4️⃣  5.0 WLFI → Ethereum Eagle Vault");
        console.log("💰 Total: $20 worth deposited!");
        
        console.log("\n⏳ LayerZero delivery: 30s-2min per transaction");
        console.log("🏦 Eagle Vault: Auto-processing deposits");
        console.log("🪙 EAGLE shares: Being minted to your address");
        
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
