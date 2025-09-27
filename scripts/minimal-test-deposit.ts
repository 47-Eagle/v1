import { ethers } from "hardhat";

/**
 * @title Minimal Test Deposit
 * @notice Try the absolute smallest deposit to test LayerZero connectivity
 */

async function main() {
    console.log("🧪 MINIMAL TEST DEPOSIT");
    console.log("=".repeat(30));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_USD1_TOKEN = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const ETHEREUM_EID = 30101;
    
    try {
        const bnbBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 BNB: ${ethers.formatEther(bnbBalance)} BNB`);
        
        const usd1Token = await ethers.getContractAt("IERC20", BSC_USD1_TOKEN);
        const usd1Balance = await usd1Token.balanceOf(signer.address);
        console.log(`💰 USD1: ${ethers.formatUnits(usd1Balance, 18)} USD1`);
        
        // Try the ABSOLUTE minimum: 0.001 USD1 ($0.001)
        const minAmount = ethers.parseUnits("0.001", 18);
        console.log(`🎯 Test amount: ${ethers.formatUnits(minAmount, 18)} USD1`);
        
        // Use a VERY high LayerZero fee to ensure it's not a fee issue
        const highFee = ethers.parseEther("0.01"); // 10 milliETH - very high
        console.log(`💸 High LayerZero fee: ${ethers.formatEther(highFee)} BNB`);
        
        // Check allowance
        const allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        if (allowance < minAmount) {
            console.log("🔧 Approving tiny amount...");
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, minAmount);
            await approveTx.wait();
            console.log("✅ Approved");
        }
        
        // Get the adapter with sendToken interface
        const usd1Adapter = await ethers.getContractAt([
            "function sendToken(uint32 dstEid, bytes32 to, uint256 amountLD) external payable"
        ], BSC_USD1_ADAPTER);
        
        const recipient = ethers.zeroPadValue(signer.address, 32);
        
        console.log("\n🚀 ATTEMPTING MINIMAL DEPOSIT:");
        console.log(`Amount: ${ethers.formatUnits(minAmount, 18)} USD1`);
        console.log(`Fee: ${ethers.formatEther(highFee)} BNB (very high)`);
        console.log(`Destination: Ethereum (${ETHEREUM_EID})`);
        
        try {
            const testTx = await usd1Adapter.sendToken(
                ETHEREUM_EID,
                recipient,
                minAmount,
                {
                    value: highFee,
                    gasLimit: 500000 // High gas limit
                }
            );
            
            console.log(`📄 TX Hash: ${testTx.hash}`);
            console.log(`🔗 BSCScan: https://bscscan.com/tx/${testTx.hash}`);
            
            const receipt = await testTx.wait();
            console.log(`✅ SUCCESS! Gas used: ${receipt?.gasUsed?.toString()}`);
            
            console.log("\n🎉 BREAKTHROUGH!");
            console.log("✅ LayerZero connection works!");
            console.log("✅ Ready for full $20 deposits!");
            console.log("⏳ This test deposit will arrive on Ethereum shortly");
            
        } catch (testError: any) {
            console.log(`❌ Test failed: ${testError.message}`);
            
            // Check the gas usage to understand the failure
            if (testError.receipt) {
                const gasUsed = testError.receipt.gasUsed?.toString();
                console.log(`⛽ Gas used: ${gasUsed}`);
                
                if (gasUsed === "22960") {
                    console.log("\n🔍 DIAGNOSIS:");
                    console.log("Still getting early revert with 22,960 gas");
                    console.log("This suggests LayerZero DVN configuration issue persists");
                    
                    console.log("\n💡 POSSIBLE SOLUTIONS:");
                    console.log("1. Wait for DVN config to fully propagate (can take time)");
                    console.log("2. LayerZero might need official lz:oapp:wire command");
                    console.log("3. Some OApp parameters may still be missing");
                    console.log("4. Try switching to different DVN configuration");
                } else {
                    console.log("\n🔍 Different error pattern - investigating...");
                }
            }
            
            console.log("\n🔧 DEBUGGING NEXT STEPS:");
            console.log("- Check LayerZero endpoint configuration");
            console.log("- Verify DVN propagation status");
            console.log("- Try alternative OApp setup approach");
        }
        
    } catch (error: any) {
        console.log(`❌ Setup error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
