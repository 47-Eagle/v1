import { ethers } from "hardhat";

/**
 * @title Debug Eagle Share OFT Deployment
 * @notice Identify the exact issue with EagleShareOFT deployment
 */

async function main() {
    console.log("🔬 DEBUG EAGLE SHARE OFT DEPLOYMENT");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Constants
    const ENDPOINT = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    const NAME = "Eagle Vault Shares";
    const SYMBOL = "EAGLE";
    const DELEGATE = deployer.address;
    
    console.log("\n📋 CONSTRUCTOR PARAMETERS:");
    console.log(`   Name: ${NAME}`);
    console.log(`   Symbol: ${SYMBOL}`);
    console.log(`   Endpoint: ${ENDPOINT}`);
    console.log(`   Delegate: ${DELEGATE}`);
    
    try {
        // First, let's estimate gas for the deployment
        console.log("\n📊 GAS ESTIMATION:");
        const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
        
        const deployTx = EagleShareOFT.getDeployTransaction(
            NAME,
            SYMBOL,
            ENDPOINT,
            DELEGATE
        );
        
        const gasEstimate = await ethers.provider.estimateGas(deployTx);
        console.log(`   Estimated gas: ${gasEstimate.toString()}`);
        
        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice!;
        console.log(`   Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
        
        const estimatedCost = gasPrice * gasEstimate;
        console.log(`   Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
        
        if (balance < estimatedCost * 2n) {
            console.log(`⚠️  Low balance for safe deployment`);
        }
        
        // Try deployment with proper gas settings
        const gasSettings = {
            gasPrice: gasPrice,
            gasLimit: gasEstimate + 100000n // Add buffer
        };
        
        console.log("\n🚀 Attempting deployment with estimated gas...");
        console.log(`   Gas limit: ${gasSettings.gasLimit.toString()}`);
        
        const eagleShareOFT = await EagleShareOFT.deploy(
            NAME,
            SYMBOL,
            ENDPOINT,
            DELEGATE,
            gasSettings
        );
        
        console.log(`📄 TX Hash: ${eagleShareOFT.deploymentTransaction()?.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        await eagleShareOFT.waitForDeployment();
        const address = await eagleShareOFT.getAddress();
        
        console.log("\n✅ SUCCESS! DEPLOYMENT WORKED!");
        console.log(`📍 Address: ${address}`);
        
        // Test basic functionality
        const name = await eagleShareOFT.name();
        const symbol = await eagleShareOFT.symbol();
        const owner = await eagleShareOFT.owner();
        
        console.log(`✅ Name: ${name}`);
        console.log(`✅ Symbol: ${symbol}`);
        console.log(`✅ Owner: ${owner}`);
        
    } catch (error: any) {
        console.log("\n❌ DEPLOYMENT ERROR:");
        console.log(`Error: ${error.message}`);
        
        if (error.reason) {
            console.log(`Reason: ${error.reason}`);
        }
        
        // Try to decode the error
        if (error.data) {
            try {
                console.log(`Error data: ${error.data}`);
                // Try to decode the revert reason
                if (error.data.startsWith('0x08c379a0')) {
                    const reason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + error.data.slice(10));
                    console.log(`Decoded reason: ${reason[0]}`);
                }
            } catch (decodeError) {
                console.log("Could not decode error data");
            }
        }
        
        // If gas estimation failed, that's the issue
        if (error.message.includes('gas')) {
            console.log("\n💡 GAS ISSUE IDENTIFIED:");
            console.log("   - Contract might be too complex");
            console.log("   - Try with higher gas limit");
            console.log("   - Check for infinite loops or expensive operations");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
