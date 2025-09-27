import { ethers } from "hardhat";

/**
 * @title Ethereum Bidirectional Configuration
 * @notice Configure BOTH send and receive for complete bidirectional setup
 */

async function main() {
    console.log("🔧 ETHEREUM BIDIRECTIONAL DVN CONFIG");
    console.log("=".repeat(45));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_EID = 30102;
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const ETH_WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    // DVN addresses (same as BSC)
    const LAYERZERO_DVN = "0x589dEDbD617e0CBcB916A9223F4d1300c294236b";
    const GOOGLE_DVN = "0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc";
    
    try {
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
        
        // Use same gas settings as before
        const feeData = await ethers.provider.getFeeData();
        const gasSettings = {
            maxFeePerGas: feeData.maxFeePerGas! * 2n,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas! * 2n,
            gasLimit: 400000
        };
        
        const endpoint = await ethers.getContractAt("ILayerZeroEndpointV2", LZ_ENDPOINT);
        
        // Get both send and receive libraries
        const sendLibrary = await endpoint.defaultSendLibrary(BSC_EID);
        const receiveLibrary = await endpoint.defaultReceiveLibrary(BSC_EID);
        
        console.log(`📚 Send Library: ${sendLibrary}`);
        console.log(`📚 Receive Library: ${receiveLibrary}`);
        
        // Same ULN config as BSC
        const ulnConfig = {
            confirmations: 15n,
            requiredDVNCount: 2,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [LAYERZERO_DVN, GOOGLE_DVN],
            optionalDVNs: []
        };
        
        console.log("\n🔧 CONFIG DETAILS:");
        console.log(`⏰ Confirmations: ${ulnConfig.confirmations}`);
        console.log(`🔒 Required DVNs: ${ulnConfig.requiredDVNCount}`);
        console.log(`📍 LayerZero: ${ulnConfig.requiredDVNs[0]}`);
        console.log(`📍 Google: ${ulnConfig.requiredDVNs[1]}`);
        
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
        
        console.log("\n🚀 CONFIGURING USD1 BIDIRECTIONAL:");
        console.log("=".repeat(40));
        
        // USD1 Send Config (Ethereum → BSC)
        console.log("1️⃣  USD1 send config (ETH→BSC)...");
        const usd1SendTx = await endpoint.setConfig(
            ETH_USD1_ADAPTER,
            sendLibrary,
            [{
                eid: BSC_EID,
                configType: 2,
                config: encodedConfig
            }],
            gasSettings
        );
        console.log(`📄 Send: ${usd1SendTx.hash}`);
        await usd1SendTx.wait();
        console.log("✅ USD1 send configured");
        
        // USD1 Receive Config (BSC → Ethereum) - already done but let's ensure
        console.log("\n2️⃣  USD1 receive config (BSC→ETH)...");
        const usd1ReceiveTx = await endpoint.setConfig(
            ETH_USD1_ADAPTER,
            receiveLibrary,
            [{
                eid: BSC_EID,
                configType: 2,
                config: encodedConfig
            }],
            gasSettings
        );
        console.log(`📄 Receive: ${usd1ReceiveTx.hash}`);
        await usd1ReceiveTx.wait();
        console.log("✅ USD1 receive configured");
        
        console.log("\n🚀 CONFIGURING WLFI BIDIRECTIONAL:");
        console.log("=".repeat(40));
        
        // WLFI Send Config (Ethereum → BSC)
        console.log("3️⃣  WLFI send config (ETH→BSC)...");
        const wlfiSendTx = await endpoint.setConfig(
            ETH_WLFI_ADAPTER,
            sendLibrary,
            [{
                eid: BSC_EID,
                configType: 2,
                config: encodedConfig
            }],
            gasSettings
        );
        console.log(`📄 Send: ${wlfiSendTx.hash}`);
        await wlfiSendTx.wait();
        console.log("✅ WLFI send configured");
        
        // WLFI Receive Config (BSC → Ethereum) - already done but let's ensure
        console.log("\n4️⃣  WLFI receive config (BSC→ETH)...");
        const wlfiReceiveTx = await endpoint.setConfig(
            ETH_WLFI_ADAPTER,
            receiveLibrary,
            [{
                eid: BSC_EID,
                configType: 2,
                config: encodedConfig
            }],
            gasSettings
        );
        console.log(`📄 Receive: ${wlfiReceiveTx.hash}`);
        await wlfiReceiveTx.wait();
        console.log("✅ WLFI receive configured");
        
        const finalBalance = await ethers.provider.getBalance(signer.address);
        const spent = ethBalance - finalBalance;
        
        console.log("\n🎉 BIDIRECTIONAL CONFIG COMPLETE!");
        console.log("=".repeat(40));
        console.log(`💸 ETH spent: ${ethers.formatEther(spent)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\n✅ FULLY CONFIGURED PATHWAYS:");
        console.log("🔗 BSC USD1 → Ethereum USD1 ✅");
        console.log("🔗 BSC WLFI → Ethereum WLFI ✅");
        console.log("🔗 Ethereum USD1 → BSC USD1 ✅");
        console.log("🔗 Ethereum WLFI → BSC WLFI ✅");
        
        console.log("\n🚀 NOW TEST YOUR DEPOSITS!");
        console.log("Both tokens should work in both directions");
        
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
