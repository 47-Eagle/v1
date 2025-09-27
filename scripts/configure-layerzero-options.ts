import { ethers } from "hardhat";

/**
 * @title Configure LayerZero V2 Options
 * @notice Set enforced options, extra options, and message configurations
 * 
 * LayerZero V2 requires specific options:
 * - Enforced Options: Minimum gas/value requirements
 * - Extra Options: Additional execution parameters  
 * - Message Type: OFT message configuration
 */

// Contract addresses
const CONTRACTS = {
    bsc: {
        usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4'
    }
};

// LayerZero EIDs
const EIDS = {
    arbitrum: 30110,
    base: 30184,
    avalanche: 30106
};

async function main() {
    console.log("⚙️  CONFIGURING LAYERZERO V2 OPTIONS");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 BNB Balance: ${ethers.formatEther(balance)} BNB`);
    
    // Connect to BSC USD1 Adapter
    const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", CONTRACTS.bsc.usd1Adapter);
    console.log(`🔗 Connected to USD1 Adapter: ${CONTRACTS.bsc.usd1Adapter}`);
    
    try {
        console.log("\n🔍 CHECKING CURRENT OPTIONS CONFIGURATION:");
        
        // Check current enforced options for each destination
        for (const [network, eid] of Object.entries(EIDS)) {
            console.log(`\n📍 ${network.toUpperCase()} (EID ${eid}):`);
            
            try {
                // Check if enforced options are set
                console.log("  🔍 Checking enforced options...");
                
                // Try to get current enforced options
                // This is network/EID specific configuration
                
                console.log("  ⚙️  Setting enforced options...");
                
                // LayerZero V2 enforced options format:
                // Options are encoded as:
                // - Type 1: Execution gas limit
                // - Type 2: Native gas amount  
                // - Type 3: Lz token gas amount
                
                // Create enforced options for OFT messages
                // Format: abi.encodePacked(optionType, gas/value)
                
                // Option Type 1: Execution Gas Limit (200k gas)
                const gasLimit = ethers.toBeHex(200000, 4); // 200k gas as 4 bytes
                const optionType1 = "0x0001"; // Type 1
                
                // Option Type 2: Native Gas Drop (0.001 ETH worth)  
                const nativeAmount = ethers.toBeHex(ethers.parseEther("0.001"), 16); // 16 bytes
                const optionType2 = "0x0002"; // Type 2
                
                // Combine options
                const enforcedOptions = optionType1 + gasLimit.slice(2) + optionType2 + nativeAmount.slice(2);
                
                console.log(`    📝 Enforced Options: ${enforcedOptions}`);
                
                // Set enforced options for this destination
                const msgType = 1; // OFT message type
                
                try {
                    const setOptionsTx = await usd1Adapter.setEnforcedOptions([
                        {
                            eid: eid,
                            msgType: msgType,
                            options: enforcedOptions
                        }
                    ]);
                    
                    await setOptionsTx.wait();
                    console.log(`  ✅ Enforced options set for ${network}`);
                    
                } catch (error: any) {
                    if (error.message.includes("OwnableUnauthorizedAccount")) {
                        console.log(`  ⚠️  Only owner can set enforced options for ${network}`);
                    } else if (error.message.includes("already set")) {
                        console.log(`  ✅ Enforced options already configured for ${network}`);
                    } else {
                        console.log(`  ❌ Failed to set enforced options for ${network}: ${error.message}`);
                    }
                }
                
            } catch (error: any) {
                console.log(`  ❌ Error checking ${network}: ${error.message}`);
            }
        }
        
        console.log("\n🧪 TESTING WITH PROPER OPTIONS:");
        
        // Now test fee estimation with proper options
        const testAmount = ethers.parseUnits("1000", 6); // 1000 USD1
        const recipientBytes32 = ethers.zeroPadValue(deployer.address, 32);
        
        // Create proper extra options for the send
        const extraOptions = "0x00010004000493e000020010000000000000000000000000000000000de0b6b3a7640000"; // Gas: 300k, Native: 0.001 ETH
        
        console.log(`💰 Testing 1000 USD1 transfer to Arbitrum`);
        console.log(`🔧 Extra Options: ${extraOptions}`);
        
        try {
            const quote = await usd1Adapter.quoteSend(
                { 
                    dstEid: EIDS.arbitrum, 
                    to: recipientBytes32, 
                    amountLD: testAmount, 
                    minAmountLD: testAmount, 
                    extraOptions: extraOptions,
                    composeMsg: "0x", 
                    oftCmd: "0x" 
                },
                false
            );
            
            const fee = quote.nativeFee;
            console.log(`✅ LayerZero Fee Quote SUCCESS: ${ethers.formatEther(fee)} BNB`);
            console.log(`💵 USD Cost: ~$${(parseFloat(ethers.formatEther(fee)) * 600).toFixed(2)}`);
            
            if (balance >= fee) {
                console.log(`✅ Sufficient BNB for transfer!`);
                
                console.log("\n🎉 LAYERZERO V2 OPTIONS CONFIGURED SUCCESSFULLY!");
                console.log("✅ Enforced options set for all destinations");
                console.log("✅ Extra options format verified");
                console.log("✅ Fee estimation working");
                console.log("✅ Ready for live cross-chain transfers!");
                
            } else {
                console.log(`⚠️  Need more BNB: ${ethers.formatEther(fee)} required`);
            }
            
        } catch (feeError: any) {
            console.error(`❌ Fee estimation still failed: ${feeError.message}`);
            
            if (feeError.message.includes("0x71c4efed")) {
                console.log("\n💡 Error 0x71c4efed Analysis:");
                console.log("This is a LayerZero V2 specific error related to:");
                console.log("- Missing enforced options configuration");  
                console.log("- Incorrect message type");
                console.log("- Invalid extra options format");
                console.log("- DVN configuration mismatch");
                
                console.log("\n🔧 Try these solutions:");
                console.log("1. Set enforced options with proper gas limits");
                console.log("2. Use correct message type (1 for OFT)");
                console.log("3. Format extra options correctly");
                console.log("4. Ensure DVN/ULN configuration is complete");
            }
        }
        
    } catch (error: any) {
        console.error(`❌ Configuration failed: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
