import { ethers } from "hardhat";

/**
 * @title Optimized WLFI OFT Adapter Deployment
 * @notice Deploy with correct gas limits after identifying the issue
 */

async function main() {
    console.log("🎯 OPTIMIZED WLFI OFT ADAPTER DEPLOYMENT");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Constants
    const REAL_WLFI = process.env.WLFI_ETHEREUM!;
    const ENDPOINT = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    const DELEGATE = deployer.address;
    
    console.log("\n📋 DEPLOYMENT INFO:");
    console.log(`   WLFI Token: ${REAL_WLFI}`);
    console.log(`   LayerZero: ${ENDPOINT}`);
    console.log(`   Delegate: ${DELEGATE}`);
    
    // Get current gas price
    const feeData = await ethers.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice!;
    
    // Optimized gas settings
    const gasSettings = {
        gasPrice: currentGasPrice, // Use network minimum
        gasLimit: 2800000 // 2.8M gas limit (sufficient for OFT adapter)
    };
    
    const estimatedCost = currentGasPrice * BigInt(gasSettings.gasLimit);
    
    console.log("\n⛽ OPTIMIZED GAS SETTINGS:");
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
        console.log("\n🚀 Deploying WLFI OFT Adapter...");
        
        const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
        const wlfiAdapter = await WLFIAdapter.deploy(
            REAL_WLFI,
            ENDPOINT,
            DELEGATE,
            gasSettings
        );
        
        console.log(`📄 TX Hash: ${wlfiAdapter.deploymentTransaction()?.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        await wlfiAdapter.waitForDeployment();
        const address = await wlfiAdapter.getAddress();
        
        console.log("\n✅ DEPLOYMENT SUCCESS!");
        console.log(`🎉 WLFI OFT Adapter: ${address}`);
        
        // Get deployment cost
        const receipt = await wlfiAdapter.deploymentTransaction()?.wait();
        if (receipt) {
            const actualCost = receipt.gasUsed * receipt.gasPrice;
            console.log(`💸 Actual cost: ${ethers.formatEther(actualCost)} ETH`);
            console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
            
            const newBalance = await ethers.provider.getBalance(deployer.address);
            console.log(`💰 Remaining: ${ethers.formatEther(newBalance)} ETH`);
        }
        
        // Test the deployment
        console.log("\n🔬 TESTING DEPLOYMENT...");
        const wrappedToken = await wlfiAdapter.wlfiToken();
        console.log(`✅ Wrapped token: ${wrappedToken}`);
        console.log(`✅ Matches WLFI: ${wrappedToken === REAL_WLFI}`);
        
        const tokenInfo = await wlfiAdapter.tokenInfo();
        console.log(`✅ Token info: ${tokenInfo[0]} (${tokenInfo[1]}) - ${tokenInfo[2]} decimals`);
        
        console.log("\n🎊 WLFI OFT ADAPTER SUCCESSFULLY DEPLOYED!");
        console.log(`📍 Address: ${address}`);
        console.log(`🔗 Etherscan: https://etherscan.io/address/${address}`);
        
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
