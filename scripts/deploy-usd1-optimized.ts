import { ethers } from "hardhat";

/**
 * @title Optimized USD1 OFT Adapter Deployment
 * @notice Deploy USD1 OFT adapter using proven gas settings from WLFI success
 */

async function main() {
    console.log("🎯 OPTIMIZED USD1 OFT ADAPTER DEPLOYMENT");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Constants
    const REAL_USD1 = process.env.USD1_ETHEREUM!;
    const ENDPOINT = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    const DELEGATE = deployer.address;
    
    console.log("\n📋 DEPLOYMENT INFO:");
    console.log(`   USD1 Token: ${REAL_USD1}`);
    console.log(`   LayerZero: ${ENDPOINT}`);
    console.log(`   Delegate: ${DELEGATE}`);
    
    // Get current gas price
    const feeData = await ethers.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice!;
    
    // Use proven gas settings from WLFI deployment
    const gasSettings = {
        gasPrice: currentGasPrice, // Use network minimum
        gasLimit: 2800000 // 2.8M gas limit (worked for WLFI)
    };
    
    const estimatedCost = currentGasPrice * BigInt(gasSettings.gasLimit);
    
    console.log("\n⛽ PROVEN GAS SETTINGS (From WLFI success):");
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
        console.log("\n🚀 Deploying USD1 OFT Adapter...");
        
        const USD1Adapter = await ethers.getContractFactory("USD1AssetOFTAdapter");
        const usd1Adapter = await USD1Adapter.deploy(
            REAL_USD1,
            ENDPOINT,
            DELEGATE,
            gasSettings
        );
        
        console.log(`📄 TX Hash: ${usd1Adapter.deploymentTransaction()?.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        await usd1Adapter.waitForDeployment();
        const address = await usd1Adapter.getAddress();
        
        console.log("\n✅ DEPLOYMENT SUCCESS!");
        console.log(`🎉 USD1 OFT Adapter: ${address}`);
        
        // Get deployment cost
        const receipt = await usd1Adapter.deploymentTransaction()?.wait();
        if (receipt) {
            const actualCost = receipt.gasUsed * receipt.gasPrice;
            console.log(`💸 Actual cost: ${ethers.formatEther(actualCost)} ETH`);
            console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
            
            const newBalance = await ethers.provider.getBalance(deployer.address);
            console.log(`💰 Remaining: ${ethers.formatEther(newBalance)} ETH`);
        }
        
        // Test the deployment
        console.log("\n🔬 TESTING DEPLOYMENT...");
        const wrappedToken = await usd1Adapter.usd1Token();
        console.log(`✅ Wrapped token: ${wrappedToken}`);
        console.log(`✅ Matches USD1: ${wrappedToken === REAL_USD1}`);
        
        const tokenInfo = await usd1Adapter.tokenInfo();
        console.log(`✅ Token info: ${tokenInfo[0]} (${tokenInfo[1]}) - ${tokenInfo[2]} decimals`);
        
        console.log("\n🎊 USD1 OFT ADAPTER SUCCESSFULLY DEPLOYED!");
        console.log(`📍 Address: ${address}`);
        console.log(`🔗 Etherscan: https://etherscan.io/address/${address}`);
        
        // Show progress
        console.log("\n📊 DEPLOYMENT PROGRESS:");
        console.log(`✅ 1/3: WLFI OFT Adapter: 0x45d452aa571494b896d7926563B41a7b16B74E2F`);
        console.log(`✅ 2/3: USD1 OFT Adapter: ${address}`);
        console.log(`⏳ 3/3: Eagle Share OFT: Pending`);
        
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
