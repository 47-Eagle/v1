import { ethers } from "hardhat";

/**
 * @title Setup DVN Configuration Manually 
 * @notice Manually configure LayerZero V2 DVNs and security settings
 */

async function main() {
    console.log("🔧 MANUAL DVN CONFIGURATION");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // LayerZero V2 DVN addresses for BSC mainnet (properly checksummed)
    const BSC_DVN_ADDRESSES = {
        LAYERZERO_DVN: "0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE",
        GOOGLE_CLOUD_DVN: "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc",
        NETHERMIND_DVN: "0xa7B5189bcA84Cd304D8553977c7C614329750d99"
    };
    
    const ETHEREUM_EID = 30101;
    const BSC_EID = 30102;
    
    // Contract addresses
    const BSC_USD1_ADAPTER = "0x283AbE84811318a873FB98242FC0FE008e7036D4";
    const BSC_WLFI_ADAPTER = "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    try {
        console.log("\n📊 DVN ADDRESSES:");
        console.log("=".repeat(20));
        Object.entries(BSC_DVN_ADDRESSES).forEach(([name, addr]) => {
            console.log(`${name}: ${addr}`);
        });
        
        // Get the LayerZero endpoint with minimal ABI
        const endpoint = await ethers.getContractAt([
            "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] calldata _setConfigParams) external",
            "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)",
            "function defaultSendLibrary(uint32 _eid) external view returns (address)"
        ], LZ_ENDPOINT);
        
        // Get the OFT contracts 
        const usd1Adapter = await ethers.getContractAt([
            "function owner() external view returns (address)",
            "function setPeer(uint32 _eid, bytes32 _peer) external",
            "function peers(uint32 _eid) external view returns (bytes32)",
            "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] calldata _enforcedOptions) external"
        ], BSC_USD1_ADAPTER);
        
        const wlfiAdapter = await ethers.getContractAt([
            "function owner() external view returns (address)",
            "function setPeer(uint32 _eid, bytes32 _peer) external", 
            "function peers(uint32 _eid) external view returns (bytes32)",
            "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] calldata _enforcedOptions) external"
        ], BSC_WLFI_ADAPTER);
        
        // Verify ownership
        const usd1Owner = await usd1Adapter.owner();
        const wlfiOwner = await wlfiAdapter.owner();
        
        if (usd1Owner.toLowerCase() !== signer.address.toLowerCase() || 
            wlfiOwner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log("❌ Not owner of contracts");
            return;
        }
        
        console.log("✅ Ownership verified");
        
        // Get the default send library for BSC -> Ethereum
        const sendLibrary = await endpoint.defaultSendLibrary(ETHEREUM_EID);
        console.log(`📚 Default Send Library: ${sendLibrary}`);
        
        // Create ULN config
        const ulnConfig = {
            confirmations: 15n,
            requiredDVNCount: 2,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [BSC_DVN_ADDRESSES.LAYERZERO_DVN, BSC_DVN_ADDRESSES.GOOGLE_CLOUD_DVN],
            optionalDVNs: []
        };
        
        console.log("\n🔧 ULN CONFIG:");
        console.log("=".repeat(15));
        console.log(`⏰ Confirmations: ${ulnConfig.confirmations}`);
        console.log(`🔒 Required DVNs: ${ulnConfig.requiredDVNCount}`);
        ulnConfig.requiredDVNs.forEach((dvn, i) => {
            console.log(`📍 DVN ${i + 1}: ${dvn}`);
        });
        
        // Encode the ULN config
        const abiCoder = new ethers.AbiCoder();
        const encodedUlnConfig = abiCoder.encode([
            "tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"
        ], [ulnConfig]);
        
        console.log("\n🔧 CONFIGURING SEND LIBRARIES:");
        console.log("=".repeat(35));
        
        // Set config for USD1 adapter
        console.log("Setting USD1 send config...");
        const setConfigUsd1Tx = await endpoint.setConfig(
            BSC_USD1_ADAPTER,
            sendLibrary,
            [{
                eid: ETHEREUM_EID,
                configType: 2, // CONFIG_TYPE_ULN
                config: encodedUlnConfig
            }],
            { gasLimit: 500000 }
        );
        await setConfigUsd1Tx.wait();
        console.log(`✅ USD1 config set: ${setConfigUsd1Tx.hash}`);
        
        // Set config for WLFI adapter  
        console.log("Setting WLFI send config...");
        const setConfigWlfiTx = await endpoint.setConfig(
            BSC_WLFI_ADAPTER,
            sendLibrary,
            [{
                eid: ETHEREUM_EID,
                configType: 2, // CONFIG_TYPE_ULN
                config: encodedUlnConfig
            }],
            { gasLimit: 500000 }
        );
        await setConfigWlfiTx.wait();
        console.log(`✅ WLFI config set: ${setConfigWlfiTx.hash}`);
        
        console.log("\n🔧 SETTING ENFORCED OPTIONS:");
        console.log("=".repeat(35));
        
        // Create enforced options for gas limits
        // Format: 0x0003 (type) + 0x0001 (option type = gas) + 0x0011 (length = 17 bytes) + gas limit + value
        const gasLimit = 200000; // 200k gas
        const value = 0;
        const enforcedOptions = ethers.concat([
            "0x0003", // version
            "0x0001", // TYPE_1: lzReceive gas
            "0x0011", // length: 17 bytes (16 for gas + value)
            ethers.zeroPadValue(ethers.toBeHex(gasLimit), 16), // gas limit
            ethers.zeroPadValue(ethers.toBeHex(value), 16) // msg.value
        ]);
        
        // Set enforced options for USD1
        console.log("Setting USD1 enforced options...");
        const setOptionsUsd1Tx = await usd1Adapter.setEnforcedOptions([{
            eid: ETHEREUM_EID,
            msgType: 1, // SEND
            options: enforcedOptions
        }], { gasLimit: 200000 });
        await setOptionsUsd1Tx.wait();
        console.log(`✅ USD1 options set: ${setOptionsUsd1Tx.hash}`);
        
        // Set enforced options for WLFI
        console.log("Setting WLFI enforced options...");
        const setOptionsWlfiTx = await wlfiAdapter.setEnforcedOptions([{
            eid: ETHEREUM_EID,
            msgType: 1, // SEND
            options: enforcedOptions
        }], { gasLimit: 200000 });
        await setOptionsWlfiTx.wait();
        console.log(`✅ WLFI options set: ${setOptionsWlfiTx.hash}`);
        
        console.log("\n🎉 DVN CONFIGURATION COMPLETE!");
        console.log("=".repeat(35));
        console.log("🔒 Security: LayerZero + Google Cloud DVNs");
        console.log("⏰ Confirmations: 15 blocks");
        console.log("⚙️ Enforced options: 200k gas limit");
        console.log("✅ Send libraries configured");
        
        console.log("\n🚀 Testing deposit after configuration...");
        
        // Test if deposits work now
        const testAmount = ethers.parseUnits("0.1", 18);
        const sendParam = {
            dstEid: ETHEREUM_EID,
            to: ethers.zeroPadValue(signer.address, 32),
            amountLD: testAmount,
            minAmountLD: testAmount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        // Get USD1 adapter with full interface
        const usd1AdapterFull = await ethers.getContractAt("USD1AssetOFTAdapter", BSC_USD1_ADAPTER);
        
        try {
            const feeQuote = await usd1AdapterFull.quoteSend(sendParam, false);
            console.log(`✅ Quote successful! Fee: ${ethers.formatEther(feeQuote.nativeFee)} BNB`);
            console.log("🎊 DEPOSITS ARE NOW READY!");
        } catch (testError: any) {
            console.log(`⚠️  Quote test: ${testError.message}`);
            console.log("Configuration set, but may need Ethereum side config too");
        }
        
    } catch (error: any) {
        console.log(`❌ Configuration error: ${error.message}`);
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
