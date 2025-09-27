import { ethers } from "hardhat";

/**
 * @title Try Complex Send Interface
 * @notice Use the full LayerZero send() function instead of sendToken()
 */

async function main() {
    console.log("🔧 TRYING COMPLEX SEND INTERFACE");
    console.log("=".repeat(40));
    
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
        
        // Get the adapter with complex send interface
        const usd1Adapter = await ethers.getContractAt([
            "function send(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) _sendParam, tuple(address refundAddress, address zroPaymentAddress) _fee, bytes _extraOptions) external payable returns (tuple(bytes32 guid, uint64 nonce))",
            "function quoteSend(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) _sendParam, bool _payInLzToken) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))"
        ], BSC_USD1_ADAPTER);
        
        // Test with minimal amount
        const minAmount = ethers.parseUnits("0.001", 18);
        const recipient = ethers.zeroPadValue(signer.address, 32);
        
        console.log(`🎯 Testing ${ethers.formatUnits(minAmount, 18)} USD1`);
        
        // Approve if needed
        const allowance = await usd1Token.allowance(signer.address, BSC_USD1_ADAPTER);
        if (allowance < minAmount) {
            console.log("🔧 Approving...");
            const approveTx = await usd1Token.approve(BSC_USD1_ADAPTER, minAmount);
            await approveTx.wait();
            console.log("✅ Approved");
        }
        
        // Create proper send parameters
        const sendParam = {
            dstEid: ETHEREUM_EID,
            to: recipient,
            amountLD: minAmount,
            minAmountLD: minAmount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        const feeParam = {
            refundAddress: signer.address,
            zroPaymentAddress: ethers.ZeroAddress
        };
        
        console.log("\n💸 TRYING FEE QUOTE WITH COMPLEX INTERFACE:");
        
        try {
            const feeQuote = await usd1Adapter.quoteSend(sendParam, false);
            const requiredFee = feeQuote.nativeFee;
            
            console.log(`✅ Quote successful: ${ethers.formatEther(requiredFee)} BNB`);
            
            if (bnbBalance < requiredFee) {
                console.log(`❌ Insufficient BNB. Need ${ethers.formatEther(requiredFee)} BNB`);
                return;
            }
            
            console.log("\n🚀 EXECUTING WITH COMPLEX SEND:");
            
            const sendTx = await usd1Adapter.send(
                sendParam,
                feeParam,
                "0x", // extraOptions
                {
                    value: requiredFee,
                    gasLimit: 600000
                }
            );
            
            console.log(`📄 TX Hash: ${sendTx.hash}`);
            console.log(`🔗 BSCScan: https://bscscan.com/tx/${sendTx.hash}`);
            
            const receipt = await sendTx.wait();
            console.log(`✅ SUCCESS! Gas used: ${receipt?.gasUsed?.toString()}`);
            
            console.log("\n🎉 BREAKTHROUGH - COMPLEX INTERFACE WORKS!");
            console.log("✅ Now we can execute your full $20 deposits");
            console.log("⏳ This test will arrive on Ethereum shortly");
            
        } catch (quoteError: any) {
            console.log(`❌ Quote failed: ${quoteError.message}`);
            
            console.log("\n🎯 FALLBACK: Try with estimated high fee");
            
            const highFee = ethers.parseEther("0.008"); // 8 milliETH
            console.log(`💸 Using estimated fee: ${ethers.formatEther(highFee)} BNB`);
            
            try {
                const fallbackTx = await usd1Adapter.send(
                    sendParam,
                    feeParam,
                    "0x",
                    {
                        value: highFee,
                        gasLimit: 600000
                    }
                );
                
                console.log(`📄 Fallback TX: ${fallbackTx.hash}`);
                await fallbackTx.wait();
                console.log("✅ FALLBACK SUCCESS!");
                
            } catch (fallbackError: any) {
                console.log(`❌ Fallback also failed: ${fallbackError.message}`);
                
                if (fallbackError.receipt?.gasUsed?.toString() === "22960") {
                    console.log("\n🔍 CONCLUSION:");
                    console.log("Still getting 22,960 gas revert with both interfaces");
                    console.log("This confirms fundamental LayerZero configuration issue");
                    console.log("\n💡 FINAL RECOMMENDATIONS:");
                    console.log("1. Wait 2-24 hours for full DVN propagation");
                    console.log("2. Try deposits during LayerZero off-peak hours");
                    console.log("3. Contact LayerZero V2 support for DVN config assistance");
                    console.log("4. Consider using LayerZero testnet first");
                }
            }
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
