import { ethers } from "hardhat";

/**
 * @title Minimal Ethereum DVN Configuration
 * @notice Ultra-low gas approach for limited ETH budget
 */

async function main() {
    console.log("🔧 MINIMAL ETHEREUM DVN CONFIG (LOW GAS)");
    console.log("=".repeat(45));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Use only 1 DVN to reduce costs
    const ETH_DVN_ADDRESSES = {
        LAYERZERO_DVN: "0x589dEDbD617e0CBcB916A9223F4d1300c294236b"
    };
    
    const BSC_EID = 30102;
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const ETH_WLFI_ADAPTER = "0x45d452aa571494b896d7926563B41a7b16B74E2F";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    try {
        // Check balance
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
        
        // Get current gas price
        const gasPrice = (await ethers.provider.getFeeData()).gasPrice || ethers.parseUnits("1", "gwei");
        const ultraLowGasPrice = gasPrice / 2n; // Use half of current gas price
        console.log(`⛽ Using ultra-low gas: ${ethers.formatUnits(ultraLowGasPrice, "gwei")} gwei`);
        
        // Estimate total cost
        const estimatedCost = ultraLowGasPrice * 400000n * 4n; // 4 transactions, 400k gas each
        console.log(`💸 Estimated total cost: ${ethers.formatEther(estimatedCost)} ETH`);
        
        if (ethBalance < estimatedCost * 12n / 10n) { // 20% buffer
            console.log("❌ Still insufficient ETH even with ultra-low gas");
            console.log(`💡 Need ${ethers.formatEther(estimatedCost * 12n / 10n - ethBalance)} ETH more`);
            console.log("\n🔧 ALTERNATIVE: Try with minimal single DVN config");
        }
        
        // Get contracts
        const endpoint = await ethers.getContractAt([
            "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] calldata _setConfigParams) external",
            "function defaultReceiveLibrary(uint32 _eid) external view returns (address)"
        ], LZ_ENDPOINT);
        
        // Create minimal ULN config with only 1 DVN
        const minimalUlnConfig = {
            confirmations: 5n, // Reduce confirmations to save cost
            requiredDVNCount: 1, // Only 1 DVN
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [ETH_DVN_ADDRESSES.LAYERZERO_DVN],
            optionalDVNs: []
        };
        
        console.log("\n🔧 MINIMAL ULN CONFIG:");
        console.log("=".repeat(25));
        console.log(`⏰ Confirmations: ${minimalUlnConfig.confirmations} (reduced)`);
        console.log(`🔒 Required DVNs: ${minimalUlnConfig.requiredDVNCount} (minimal)`);
        console.log(`📍 DVN: ${minimalUlnConfig.requiredDVNs[0]}`);
        
        const receiveLibrary = await endpoint.defaultReceiveLibrary(BSC_EID);
        console.log(`📚 Receive Library: ${receiveLibrary}`);
        
        // Encode config
        const abiCoder = new ethers.AbiCoder();
        const encodedConfig = abiCoder.encode([
            "tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"
        ], [minimalUlnConfig]);
        
        console.log("\n🚀 ATTEMPTING MINIMAL CONFIGURATION:");
        console.log("=".repeat(40));
        
        // Try USD1 first
        console.log("1️⃣  Configuring USD1 receive...");
        try {
            const setConfigUsd1Tx = await endpoint.setConfig(
                ETH_USD1_ADAPTER,
                receiveLibrary,
                [{
                    eid: BSC_EID,
                    configType: 2,
                    config: encodedConfig
                }],
                { 
                    gasLimit: 300000, // Reduced gas limit
                    gasPrice: ultraLowGasPrice
                }
            );
            console.log(`📄 TX: ${setConfigUsd1Tx.hash}`);
            await setConfigUsd1Tx.wait();
            console.log("✅ USD1 configured successfully");
        } catch (usd1Error: any) {
            console.log(`❌ USD1 config failed: ${usd1Error.message}`);
        }
        
        // Try WLFI
        console.log("\n2️⃣  Configuring WLFI receive...");
        try {
            const setConfigWlfiTx = await endpoint.setConfig(
                ETH_WLFI_ADAPTER,
                receiveLibrary,
                [{
                    eid: BSC_EID,
                    configType: 2,
                    config: encodedConfig
                }],
                { 
                    gasLimit: 300000,
                    gasPrice: ultraLowGasPrice
                }
            );
            console.log(`📄 TX: ${setConfigWlfiTx.hash}`);
            await setConfigWlfiTx.wait();
            console.log("✅ WLFI configured successfully");
        } catch (wlfiError: any) {
            console.log(`❌ WLFI config failed: ${wlfiError.message}`);
        }
        
        console.log("\n🧪 Testing deposits after minimal config...");
        
        // Final balance check
        const finalBalance = await ethers.provider.getBalance(signer.address);
        const spent = ethBalance - finalBalance;
        console.log(`💸 ETH spent: ${ethers.formatEther(spent)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\n✅ MINIMAL DVN CONFIGURATION COMPLETE!");
        console.log("🎯 Try deposits now - should work with 1 DVN setup");
        
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
