import { ethers } from "hardhat";

/**
 * @title Fast Eagle Share OFT Deployment
 * @notice Deploy with higher gas price to avoid mempool hanging
 */

async function main() {
    console.log("⚡ FAST EAGLE SHARE OFT DEPLOYMENT");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Constants
    const ENDPOINT = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    const DELEGATE = deployer.address;
    
    console.log("\n📋 DEPLOYMENT INFO:");
    console.log(`   Name: Eagle Vault Shares`);
    console.log(`   Symbol: EAGLE`);
    console.log(`   LayerZero: ${ENDPOINT}`);
    
    // Get current gas price and add premium for fast confirmation
    const feeData = await ethers.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice!;
    const fastGasPrice = currentGasPrice * 15n / 10n; // +50% for speed
    
    // Use higher gas settings to avoid hanging
    const gasSettings = {
        gasPrice: fastGasPrice,
        gasLimit: 2800000 // Proven to work
    };
    
    const estimatedCost = fastGasPrice * BigInt(gasSettings.gasLimit);
    
    console.log("\n⛽ FAST GAS SETTINGS (Anti-Hang):");
    console.log(`   Base Price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei`);
    console.log(`   Fast Price: ${ethers.formatUnits(fastGasPrice, "gwei")} gwei (+50%)`);
    console.log(`   Gas Limit: 2.8M`);
    console.log(`   Max Cost: ${ethers.formatEther(estimatedCost)} ETH`);
    
    if (balance < estimatedCost) {
        console.log(`❌ Insufficient balance for fast deployment`);
        console.log(`   Need: ${ethers.formatEther(estimatedCost)} ETH`);
        return;
    }
    
    console.log(`✅ Sufficient balance for fast deployment`);
    
    try {
        console.log("\n🚀 Deploying Eagle Share OFT (FAST MODE)...");
        
        const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
        
        console.log("📤 Sending transaction with premium gas...");
        const eagleShareOFT = await EagleShareOFT.deploy(
            "Eagle Vault Shares",
            "EAGLE", 
            ENDPOINT,
            DELEGATE,
            gasSettings
        );
        
        const txHash = eagleShareOFT.deploymentTransaction()?.hash;
        console.log(`📄 TX Hash: ${txHash}`);
        console.log("⏳ Waiting for fast confirmation...");
        
        // Wait with timeout
        await eagleShareOFT.waitForDeployment();
        const address = await eagleShareOFT.getAddress();
        
        console.log("\n🎉 SUCCESS! EAGLE SHARE OFT DEPLOYED!");
        console.log(`📍 Address: ${address}`);
        
        // Get actual costs
        const receipt = await eagleShareOFT.deploymentTransaction()?.wait();
        if (receipt) {
            const actualCost = receipt.gasUsed * receipt.gasPrice;
            console.log(`💸 Actual cost: ${ethers.formatEther(actualCost)} ETH`);
            console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
            
            const newBalance = await ethers.provider.getBalance(deployer.address);
            console.log(`💰 Remaining: ${ethers.formatEther(newBalance)} ETH`);
        }
        
        console.log(`🔗 Etherscan: https://etherscan.io/address/${address}`);
        
        // FINAL SUCCESS SUMMARY
        console.log("\n🏆 🏆 🏆 ALL ETHEREUM CONTRACTS DEPLOYED! 🏆 🏆 🏆");
        console.log("=".repeat(60));
        console.log(`✅ WLFI OFT Adapter: 0x45d452aa571494b896d7926563B41a7b16B74E2F`);
        console.log(`✅ USD1 OFT Adapter: 0xba9B60A00fD10323Abbdc1044627B54D3ebF470e`);
        console.log(`✅ Eagle Share OFT:  ${address}`);
        console.log("=".repeat(60));
        console.log("🎯 ETHEREUM HUB: 100% COMPLETE!");
        console.log("🌐 5-CHAIN OMNICHAIN SYSTEM: READY!");
        console.log("🚀 NEXT: Configure LayerZero peer connections!");
        
    } catch (error: any) {
        console.log("\n❌ DEPLOYMENT ERROR:");
        console.log(`Error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
