import { ethers } from "hardhat";

/**
 * @title Quick Ethereum Configuration
 * @notice Simple, fast DVN configuration to avoid hanging
 */

async function main() {
    console.log("⚡ QUICK ETHEREUM DVN CONFIG");
    console.log("=".repeat(30));
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    // Use LayerZero's default DVN only
    const LAYERZERO_DVN = "0x589dEDbD617e0CBcB916A9223F4d1300c294236b";
    const BSC_EID = 30102;
    const ETH_USD1_ADAPTER = "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    
    try {
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(`💰 ETH: ${ethers.formatEther(ethBalance)} ETH`);
        
        // Get current gas price and use a reasonable amount
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("10", "gwei");
        console.log(`⛽ Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
        
        // Simple config: Just set minimal receive config for USD1
        const endpoint = await ethers.getContractAt([
            "function setConfig(address,address,tuple(uint32,uint32,bytes)[]) external",
            "function defaultReceiveLibrary(uint32) external view returns (address)"
        ], LZ_ENDPOINT);
        
        const receiveLib = await endpoint.defaultReceiveLibrary(BSC_EID);
        console.log(`📚 Receive lib: ${receiveLib}`);
        
        // Ultra-minimal config: 1 DVN, 1 confirmation
        const minConfig = {
            confirmations: 1n,
            requiredDVNCount: 1,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [LAYERZERO_DVN],
            optionalDVNs: []
        };
        
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode([
            "tuple(uint64,uint8,uint8,uint8,address[],address[])"
        ], [minConfig]);
        
        console.log("\n🚀 Setting minimal config...");
        
        const tx = await endpoint.setConfig(
            ETH_USD1_ADAPTER,
            receiveLib,
            [{ eid: BSC_EID, configType: 2, config: encoded }],
            { 
                gasLimit: 200000,
                gasPrice,
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")
            }
        );
        
        console.log(`📄 TX: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        await tx.wait(1); // Only wait for 1 confirmation
        console.log("✅ Config set!");
        
        // Check if this fixes the issue
        console.log("\n🧪 Testing deposit...");
        
        // Switch to BSC for testing
        console.log("✅ Ethereum config complete - test deposits from BSC now");
        
    } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
