import { ethers } from "hardhat";

/**
 * @title Setup DVN Configuration on Ethereum
 * @notice Configure LayerZero V2 DVNs on Ethereum side for BSC connections
 */

async function main() {
    console.log("🔧 ETHEREUM DVN CONFIGURATION");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // LayerZero V2 DVN addresses for Ethereum mainnet
    const ETH_DVN_ADDRESSES = {
        LAYERZERO_DVN: "0x589dEDbD617e0CBcB916A9223F4d1300c294236b",
        GOOGLE_CLOUD_DVN: "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc",
        NETHERMIND_DVN: "0xa7B5189bcA84Cd304D8553977c7C614329750d99"
    };
    
    const BSC_EID = 30102;
    
    // Contract addresses on Ethereum
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const ETH_WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    try {
        console.log("\n📊 ETHEREUM DVN ADDRESSES:");
        console.log("=".repeat(30));
        Object.entries(ETH_DVN_ADDRESSES).forEach(([name, addr]) => {
            console.log(`${name}: ${addr}`);
        });
        
        // Check ETH balance
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
        
        if (ethBalance < ethers.parseEther("0.01")) {
            console.log("❌ Insufficient ETH for configuration transactions");
            return;
        }
        
        // Get contracts
        const endpoint = await ethers.getContractAt([
            "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] calldata _setConfigParams) external",
            "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)",
            "function defaultSendLibrary(uint32 _eid) external view returns (address)",
            "function defaultReceiveLibrary(uint32 _eid) external view returns (address)"
        ], LZ_ENDPOINT);
        
        const usd1Adapter = await ethers.getContractAt([
            "function owner() external view returns (address)",
            "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] calldata _enforcedOptions) external"
        ], ETH_USD1_ADAPTER);
        
        const wlfiAdapter = await ethers.getContractAt([
            "function owner() external view returns (address)",
            "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] calldata _enforcedOptions) external"
        ], ETH_WLFI_ADAPTER);
        
        // Verify ownership
        const usd1Owner = await usd1Adapter.owner();
        const wlfiOwner = await wlfiAdapter.owner();
        
        if (usd1Owner.toLowerCase() !== signer.address.toLowerCase() || 
            wlfiOwner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log("❌ Not owner of Ethereum contracts");
            console.log(`USD1 Owner: ${usd1Owner}`);
            console.log(`WLFI Owner: ${wlfiOwner}`);
            console.log(`Your Address: ${signer.address}`);
            return;
        }
        
        console.log("✅ Ownership verified");
        
        // Get the default libraries
        const sendLibrary = await endpoint.defaultSendLibrary(BSC_EID);
        const receiveLibrary = await endpoint.defaultReceiveLibrary(BSC_EID);
        console.log(`📚 Send Library: ${sendLibrary}`);
        console.log(`📚 Receive Library: ${receiveLibrary}`);
        
        // Create ULN config matching BSC side
        const ulnConfig = {
            confirmations: 15n,
            requiredDVNCount: 2,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [ETH_DVN_ADDRESSES.LAYERZERO_DVN, ETH_DVN_ADDRESSES.GOOGLE_CLOUD_DVN],
            optionalDVNs: []
        };
        
        console.log("\n🔧 ETHEREUM ULN CONFIG:");
        console.log("=".repeat(25));
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
        
        console.log("\n🔧 CONFIGURING ETHEREUM RECEIVE LIBRARIES:");
        console.log("=".repeat(45));
        
        // Set receive config for USD1 adapter
        console.log("Setting USD1 receive config...");
        const setReceiveConfigUsd1Tx = await endpoint.setConfig(
            ETH_USD1_ADAPTER,
            receiveLibrary,
            [{
                eid: BSC_EID,
                configType: 2, // CONFIG_TYPE_ULN
                config: encodedUlnConfig
            }],
            { 
                gasLimit: 500000,
                gasPrice: ethers.parseUnits("20", "gwei")
            }
        );
        await setReceiveConfigUsd1Tx.wait();
        console.log(`✅ USD1 receive config set: ${setReceiveConfigUsd1Tx.hash}`);
        
        // Set receive config for WLFI adapter
        console.log("Setting WLFI receive config...");
        const setReceiveConfigWlfiTx = await endpoint.setConfig(
            ETH_WLFI_ADAPTER,
            receiveLibrary,
            [{
                eid: BSC_EID,
                configType: 2, // CONFIG_TYPE_ULN
                config: encodedUlnConfig
            }],
            { 
                gasLimit: 500000,
                gasPrice: ethers.parseUnits("20", "gwei")
            }
        );
        await setReceiveConfigWlfiTx.wait();
        console.log(`✅ WLFI receive config set: ${setReceiveConfigWlfiTx.hash}`);
        
        console.log("\n🔧 SETTING ETHEREUM ENFORCED OPTIONS:");
        console.log("=".repeat(40));
        
        // Create enforced options for receive gas limits
        const gasLimit = 200000;
        const value = 0;
        const enforcedOptions = ethers.concat([
            "0x0003", // version
            "0x0001", // TYPE_1: lzReceive gas
            "0x0011", // length: 17 bytes
            ethers.zeroPadValue(ethers.toBeHex(gasLimit), 16), // gas limit
            ethers.zeroPadValue(ethers.toBeHex(value), 16) // msg.value
        ]);
        
        // Set enforced options for USD1
        console.log("Setting USD1 enforced options...");
        const setOptionsUsd1Tx = await usd1Adapter.setEnforcedOptions([{
            eid: BSC_EID,
            msgType: 1, // SEND
            options: enforcedOptions
        }], { 
            gasLimit: 200000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        await setOptionsUsd1Tx.wait();
        console.log(`✅ USD1 options set: ${setOptionsUsd1Tx.hash}`);
        
        // Set enforced options for WLFI
        console.log("Setting WLFI enforced options...");
        const setOptionsWlfiTx = await wlfiAdapter.setEnforcedOptions([{
            eid: BSC_EID,
            msgType: 1, // SEND
            options: enforcedOptions
        }], { 
            gasLimit: 200000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        await setOptionsWlfiTx.wait();
        console.log(`✅ WLFI options set: ${setOptionsWlfiTx.hash}`);
        
        console.log("\n🎉 ETHEREUM DVN CONFIGURATION COMPLETE!");
        console.log("=".repeat(45));
        console.log("🔒 Security: LayerZero + Google Cloud DVNs");
        console.log("⏰ Confirmations: 15 blocks");
        console.log("⚙️ Enforced options: 200k gas limit");
        console.log("✅ Receive libraries configured");
        
        const finalEthBalance = await ethers.provider.getBalance(signer.address);
        const ethSpent = ethBalance - finalEthBalance;
        console.log(`💸 ETH spent: ${ethers.formatEther(ethSpent)} ETH`);
        
        console.log("\n🚀 BOTH SIDES NOW CONFIGURED!");
        console.log("🌉 BSC ↔ Ethereum pathway ready");
        console.log("🎊 Ready for cross-chain deposits!");
        
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
