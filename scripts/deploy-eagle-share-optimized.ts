import { ethers } from "hardhat";

/**
 * @title Optimized Eagle Share OFT Deployment  
 * @notice Deploy Eagle Share OFT using proven gas settings (final contract!)
 */

async function main() {
    console.log("🎯 OPTIMIZED EAGLE SHARE OFT DEPLOYMENT (FINAL CONTRACT!)");
    console.log("=".repeat(60));
    
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
    console.log(`   Delegate: ${DELEGATE}`);
    
    // Get current gas price
    const feeData = await ethers.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice!;
    
    // Use proven gas settings from previous deployments
    const gasSettings = {
        gasPrice: currentGasPrice, // Use network minimum
        gasLimit: 2800000 // 2.8M gas limit (worked for both adapters)
    };
    
    const estimatedCost = currentGasPrice * BigInt(gasSettings.gasLimit);
    
    console.log("\n⛽ PROVEN GAS SETTINGS (From WLFI & USD1 success):");
    console.log(`   Gas Price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei (network minimum)`);
    console.log(`   Gas Limit: 2.8M`);
    console.log(`   Estimated Cost: ${ethers.formatEther(estimatedCost)} ETH`);
    
    // Check if we have enough balance
    if (balance < estimatedCost) {
        console.log(`❌ Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH`);
        console.log(`   Shortfall: ${ethers.formatEther(estimatedCost - balance)} ETH`);
        return;
    }
    
    console.log(`✅ Sufficient balance for deployment`);
    
    try {
        console.log("\n🚀 Deploying Eagle Share OFT...");
        
        const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
        const eagleShareOFT = await EagleShareOFT.deploy(
            "Eagle Vault Shares",
            "EAGLE",
            ENDPOINT,
            DELEGATE,
            gasSettings
        );
        
        console.log(`📄 TX Hash: ${eagleShareOFT.deploymentTransaction()?.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        await eagleShareOFT.waitForDeployment();
        const address = await eagleShareOFT.getAddress();
        
        console.log("\n✅ DEPLOYMENT SUCCESS!");
        console.log(`🎉 Eagle Share OFT: ${address}`);
        
        // Get deployment cost
        const receipt = await eagleShareOFT.deploymentTransaction()?.wait();
        if (receipt) {
            const actualCost = receipt.gasUsed * receipt.gasPrice;
            console.log(`💸 Actual cost: ${ethers.formatEther(actualCost)} ETH`);
            console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
            
            const newBalance = await ethers.provider.getBalance(deployer.address);
            console.log(`💰 Remaining: ${ethers.formatEther(newBalance)} ETH`);
        }
        
        // Test the deployment
        console.log("\n🔬 TESTING DEPLOYMENT...");
        const name = await eagleShareOFT.name();
        const symbol = await eagleShareOFT.symbol();
        const decimals = await eagleShareOFT.decimals();
        const owner = await eagleShareOFT.owner();
        
        console.log(`✅ Name: ${name}`);
        console.log(`✅ Symbol: ${symbol}`);
        console.log(`✅ Decimals: ${decimals}`);
        console.log(`✅ Owner: ${owner}`);
        console.log(`✅ Owner correct: ${owner === DELEGATE}`);
        
        console.log("\n🎊 EAGLE SHARE OFT SUCCESSFULLY DEPLOYED!");
        console.log(`📍 Address: ${address}`);
        console.log(`🔗 Etherscan: https://etherscan.io/address/${address}`);
        
        // Show final progress - ALL COMPLETE!
        console.log("\n🏆 ALL ETHEREUM CONTRACTS DEPLOYED!");
        console.log("=".repeat(60));
        console.log(`✅ 1/3: WLFI OFT Adapter: 0x45d452aa571494b896d7926563B41a7b16B74E2F`);
        console.log(`✅ 2/3: USD1 OFT Adapter: 0xba9B60A00fD10323Abbdc1044627B54D3ebF470e`);
        console.log(`✅ 3/3: Eagle Share OFT: ${address}`);
        console.log("=".repeat(60));
        console.log("🎯 ETHEREUM HUB: 100% COMPLETE!");
        console.log("🌐 READY FOR PEER CONNECTIONS!");
        
    } catch (error: any) {
        console.log("\n❌ DEPLOYMENT ERROR:");
        console.log(`Error: ${error.message}`);
        
        if (error.reason) {
            console.log(`Reason: ${error.reason}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
