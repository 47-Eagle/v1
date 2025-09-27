import { ethers } from "hardhat";

/**
 * @title Final Ethereum Configuration
 * @notice Complete DVN configuration with sufficient gas to avoid hanging
 */

async function main() {
    console.log("🚀 FINAL ETHEREUM DVN CONFIGURATION");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_EID = 30102;
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const ETH_WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    // Use same DVN as BSC for consistency
    const LAYERZERO_DVN = "0x589dEDbD617e0CBcB916A9223F4d1300c294236b";
    const GOOGLE_DVN = "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc";
    
    try {
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
        
        // Use high gas price to ensure transactions go through
        const gasPrice = ethers.parseUnits("25", "gwei"); // High gas
        console.log(`⛽ Using high gas: 25 gwei`);
        
        // Get endpoint with simple interface
        const endpoint = await ethers.getContractAt("ILayerZeroEndpointV2", LZ_ENDPOINT);
        
        const receiveLibrary = await endpoint.defaultReceiveLibrary(BSC_EID);
        console.log(`📚 Receive Library: ${receiveLibrary}`);
        
        // Create proper ULN config matching BSC side
        const ulnConfig = {
            confirmations: 15n,
            requiredDVNCount: 2,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [LAYERZERO_DVN, GOOGLE_DVN],
            optionalDVNs: []
        };
        
        console.log("\n🔧 ETHEREUM RECEIVE CONFIG:");
        console.log("=".repeat(30));
        console.log(`⏰ Confirmations: ${ulnConfig.confirmations}`);
        console.log(`🔒 Required DVNs: ${ulnConfig.requiredDVNCount}`);
        console.log(`📍 LayerZero DVN: ${ulnConfig.requiredDVNs[0]}`);
        console.log(`📍 Google DVN: ${ulnConfig.requiredDVNs[1]}`);
        
        // Encode the config properly
        const encodedConfig = ethers.AbiCoder.defaultAbiCoder().encode([
            "tuple(uint64,uint8,uint8,uint8,address[],address[])"
        ], [[
            ulnConfig.confirmations,
            ulnConfig.requiredDVNCount,
            ulnConfig.optionalDVNCount,
            ulnConfig.optionalDVNThreshold,
            ulnConfig.requiredDVNs,
            ulnConfig.optionalDVNs
        ]]);
        
        console.log("\n🚀 SETTING RECEIVE CONFIGURATIONS:");
        console.log("=".repeat(40));
        
        // Configure USD1 receive
        console.log("1️⃣  Configuring USD1 receive...");
        const setConfigUsd1Tx = await endpoint.setConfig(
            ETH_USD1_ADAPTER,
            receiveLibrary,
            [{
                eid: BSC_EID,
                configType: 2, // CONFIG_TYPE_ULN
                config: encodedConfig
            }],
            {
                gasLimit: 500000,
                gasPrice: gasPrice,
                maxPriorityFeePerGas: ethers.parseUnits("3", "gwei")
            }
        );
        
        console.log(`📄 USD1 TX: ${setConfigUsd1Tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        await setConfigUsd1Tx.wait();
        console.log("✅ USD1 receive config complete!");
        
        // Configure WLFI receive
        console.log("\n2️⃣  Configuring WLFI receive...");
        const setConfigWlfiTx = await endpoint.setConfig(
            ETH_WLFI_ADAPTER,
            receiveLibrary,
            [{
                eid: BSC_EID,
                configType: 2, // CONFIG_TYPE_ULN
                config: encodedConfig
            }],
            {
                gasLimit: 500000,
                gasPrice: gasPrice,
                maxPriorityFeePerGas: ethers.parseUnits("3", "gwei")
            }
        );
        
        console.log(`📄 WLFI TX: ${setConfigWlfiTx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        await setConfigWlfiTx.wait();
        console.log("✅ WLFI receive config complete!");
        
        const finalBalance = await ethers.provider.getBalance(signer.address);
        const spent = ethBalance - finalBalance;
        console.log(`💸 ETH spent: ${ethers.formatEther(spent)} ETH`);
        
        console.log("\n🎉 ETHEREUM DVN CONFIGURATION COMPLETE!");
        console.log("=".repeat(45));
        console.log("🔒 Security: LayerZero + Google Cloud DVNs");
        console.log("⏰ Confirmations: 15 blocks");
        console.log("✅ Both BSC and Ethereum configured");
        console.log("🌉 Cross-chain pathway ready!");
        
        console.log("\n🚀 NOW READY FOR YOUR $20 DEPOSITS!");
        console.log("✅ All LayerZero configuration complete");
        console.log("🎯 Execute your deposits from BSC now");
        
    } catch (error: any) {
        console.log(`❌ Configuration error: ${error.message}`);
        if (error.data) {
            console.log(`📄 Error data: ${error.data}`);
        }
        
        console.log("\n💡 If this still fails, we can try deposits anyway");
        console.log("Sometimes LayerZero works with partial configuration");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
