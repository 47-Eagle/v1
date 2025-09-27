import { ethers } from "hardhat";

/**
 * @title Setup LayerZero V2 DVN Configuration
 * @notice Configure DVNs and security parameters for cross-chain messaging
 */

async function main() {
    console.log("🔧 SETTING UP LAYERZERO V2 DVN CONFIGURATION");
    console.log("=".repeat(50));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // LayerZero V2 DVN addresses for mainnet
    const DVN_ADDRESSES = {
        // LayerZero's default DVNs
        LAYERZERO_DVN: "0x589dEDbD617e0CBcB916A9223F4d1300c294236b", // LayerZero DVN
        GOOGLE_CLOUD_DVN: "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc", // Google Cloud DVN
        NETHERMIND_DVN: "0xa7b5189bcA84Cd304D8553977c7C614329750d99", // Nethermind DVN
        POLYHEDRA_DVN: "0x8dF8b414993390A4d4d8A73aF4c613fE5B698F5C"  // Polyhedra DVN
    };
    
    const ETHEREUM_EID = 30101;
    const BSC_EID = 30102;
    
    // Contract addresses
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    try {
        // Get LayerZero endpoint contract
        const endpoint = await ethers.getContractAt("ILayerZeroEndpointV2", LZ_ENDPOINT);
        
        // Get our OFT contracts
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", BSC_WLFI_ADAPTER);
        
        console.log("\n📊 CURRENT DVN CONFIGURATION:");
        console.log("=".repeat(35));
        
        // Check current send config
        try {
            const sendConfig = await endpoint.getConfig(BSC_USD1_ADAPTER, ETHEREUM_EID, 2, 1); // CONFIG_TYPE_ULN = 2, SEND = 1
            console.log(`📤 Current Send Config: ${sendConfig}`);
        } catch (error) {
            console.log("⚠️  Could not get send config");
        }
        
        // Check current receive config  
        try {
            const receiveConfig = await endpoint.getConfig(BSC_USD1_ADAPTER, ETHEREUM_EID, 2, 2); // CONFIG_TYPE_ULN = 2, RECEIVE = 2
            console.log(`📥 Current Receive Config: ${receiveConfig}`);
        } catch (error) {
            console.log("⚠️  Could not get receive config");
        }
        
        console.log("\n🔧 SETTING UP DVN CONFIGURATION:");
        console.log("=".repeat(35));
        
        // Create ULN config structure
        const ulnConfig = {
            confirmations: 15, // Block confirmations needed
            requiredDVNCount: 2, // Number of required DVNs
            optionalDVNCount: 0, // Optional DVNs
            optionalDVNThreshold: 0, // Threshold for optional DVNs
            requiredDVNs: [DVN_ADDRESSES.LAYERZERO_DVN, DVN_ADDRESSES.GOOGLE_CLOUD_DVN], // Required DVNs
            optionalDVNs: [] // Optional DVNs
        };
        
        console.log("📋 ULN Config:");
        console.log(`   Confirmations: ${ulnConfig.confirmations}`);
        console.log(`   Required DVNs: ${ulnConfig.requiredDVNCount}`);
        console.log(`   DVN1: ${ulnConfig.requiredDVNs[0]}`);
        console.log(`   DVN2: ${ulnConfig.requiredDVNs[1]}`);
        
        // Encode the ULN config
        const abiCoder = new ethers.AbiCoder();
        const encodedConfig = abiCoder.encode(
            ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
            [ulnConfig]
        );
        
        console.log("\n🔧 CONFIGURING USD1 ADAPTER:");
        console.log("=".repeat(35));
        
        // Set send config for USD1 adapter
        const setSendConfigTx = await usd1Adapter.setConfig([{
            eid: ETHEREUM_EID,
            configType: 2, // CONFIG_TYPE_ULN
            config: encodedConfig
        }]);
        console.log(`📤 Setting send config: ${setSendConfigTx.hash}`);
        await setSendConfigTx.wait();
        console.log("✅ USD1 send config set");
        
        // Set receive config for USD1 adapter
        const setReceiveConfigTx = await usd1Adapter.setConfig([{
            eid: ETHEREUM_EID,
            configType: 2, // CONFIG_TYPE_ULN
            config: encodedConfig
        }]);
        console.log(`📥 Setting receive config: ${setReceiveConfigTx.hash}`);
        await setReceiveConfigTx.wait();
        console.log("✅ USD1 receive config set");
        
        console.log("\n🔧 CONFIGURING WLFI ADAPTER:");
        console.log("=".repeat(35));
        
        // Set send config for WLFI adapter
        const setSendConfigWlfiTx = await wlfiAdapter.setConfig([{
            eid: ETHEREUM_EID,
            configType: 2, // CONFIG_TYPE_ULN
            config: encodedConfig
        }]);
        console.log(`📤 Setting send config: ${setSendConfigWlfiTx.hash}`);
        await setSendConfigWlfiTx.wait();
        console.log("✅ WLFI send config set");
        
        // Set receive config for WLFI adapter
        const setReceiveConfigWlfiTx = await wlfiAdapter.setConfig([{
            eid: ETHEREUM_EID,
            configType: 2, // CONFIG_TYPE_ULN
            config: encodedConfig
        }]);
        console.log(`📥 Setting receive config: ${setReceiveConfigWlfiTx.hash}`);
        await setReceiveConfigWlfiTx.wait();
        console.log("✅ WLFI receive config set");
        
        console.log("\n🔧 SETTING ENFORCED OPTIONS:");
        console.log("=".repeat(30));
        
        // Set enforced options for gas limits
        const enforcedOptions = "0x00030100110100000000000000000000000000030d40"; // Example enforced options
        
        const setEnforcedOptionsUsd1 = await usd1Adapter.setEnforcedOptions([{
            eid: ETHEREUM_EID,
            msgType: 1, // SEND message type
            options: enforcedOptions
        }]);
        console.log(`⚙️ Setting USD1 enforced options: ${setEnforcedOptionsUsd1.hash}`);
        await setEnforcedOptionsUsd1.wait();
        console.log("✅ USD1 enforced options set");
        
        const setEnforcedOptionsWlfi = await wlfiAdapter.setEnforcedOptions([{
            eid: ETHEREUM_EID,
            msgType: 1, // SEND message type
            options: enforcedOptions
        }]);
        console.log(`⚙️ Setting WLFI enforced options: ${setEnforcedOptionsWlfi.hash}`);
        await setEnforcedOptionsWlfi.wait();
        console.log("✅ WLFI enforced options set");
        
        console.log("\n✅ DVN CONFIGURATION COMPLETE!");
        console.log("=".repeat(35));
        console.log("🔒 Security: 2 required DVNs (LayerZero + Google Cloud)");
        console.log("⏰ Confirmations: 15 blocks");
        console.log("⚙️ Enforced options: Set for gas limits");
        console.log("🚀 Ready for cross-chain deposits!");
        
    } catch (error: any) {
        console.log(`❌ Error setting up DVN: ${error.message}`);
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
