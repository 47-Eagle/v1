import { ethers } from "hardhat";

/**
 * @title Ethereum Enforced Options
 * @notice Set enforced options on Ethereum side to complete configuration
 */

async function main() {
    console.log("⚙️ SETTING ETHEREUM ENFORCED OPTIONS");
    console.log("=".repeat(40));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const BSC_EID = 30102;
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const ETH_WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    
    try {
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
        
        // Get adapters
        const usd1Adapter = await ethers.getContractAt([
            "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] calldata _enforcedOptions) external"
        ], ETH_USD1_ADAPTER);
        
        const wlfiAdapter = await ethers.getContractAt([
            "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] calldata _enforcedOptions) external"
        ], ETH_WLFI_ADAPTER);
        
        // Create enforced options (same as BSC side)
        const gasLimit = 200000;
        const value = 0;
        const enforcedOptions = ethers.concat([
            "0x0003", // version
            "0x0001", // TYPE_1: lzReceive gas
            "0x0011", // length: 17 bytes
            ethers.zeroPadValue(ethers.toBeHex(gasLimit), 16), // gas limit
            ethers.zeroPadValue(ethers.toBeHex(value), 16) // msg.value
        ]);
        
        console.log(`⚙️ Enforced options: ${enforcedOptions}`);
        
        // Use moderate gas settings
        const gasSettings = {
            maxFeePerGas: ethers.parseUnits("15", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 150000
        };
        
        console.log("\n🔧 SETTING USD1 ENFORCED OPTIONS:");
        const setOptionsUsd1Tx = await usd1Adapter.setEnforcedOptions([{
            eid: BSC_EID,
            msgType: 1, // SEND
            options: enforcedOptions
        }], gasSettings);
        
        console.log(`📄 USD1: ${setOptionsUsd1Tx.hash}`);
        await setOptionsUsd1Tx.wait();
        console.log("✅ USD1 enforced options set");
        
        console.log("\n🔧 SETTING WLFI ENFORCED OPTIONS:");
        const setOptionsWlfiTx = await wlfiAdapter.setEnforcedOptions([{
            eid: BSC_EID,
            msgType: 1, // SEND
            options: enforcedOptions
        }], gasSettings);
        
        console.log(`📄 WLFI: ${setOptionsWlfiTx.hash}`);
        await setOptionsWlfiTx.wait();
        console.log("✅ WLFI enforced options set");
        
        const finalBalance = await ethers.provider.getBalance(signer.address);
        const spent = ethBalance - finalBalance;
        
        console.log("\n✅ ENFORCED OPTIONS COMPLETE!");
        console.log("=".repeat(35));
        console.log(`💸 ETH spent: ${ethers.formatEther(spent)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\n🎯 CONFIGURATION SUMMARY:");
        console.log("✅ BSC send configs + enforced options");
        console.log("✅ Ethereum receive configs");
        console.log("✅ Ethereum send configs");
        console.log("✅ Ethereum enforced options");
        
        console.log("\n🧪 NOW TRY DEPOSITS!");
        console.log("Everything should be properly configured");
        
        // Wait a moment for configuration to propagate
        console.log("\n⏳ Waiting 10 seconds for config propagation...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log("✅ Ready to test!");
        
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
