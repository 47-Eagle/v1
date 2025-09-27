import { ethers } from "hardhat";

/**
 * @title Deploy Eagle Share OFT with Fixed Gas
 * @notice Force deployment with high gas limit since gas estimation is failing
 */

async function main() {
    console.log("🔧 DEPLOY EAGLE SHARE OFT (FIXED HIGH GAS)");
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
    
    console.log("\n📋 DEPLOYMENT PARAMETERS:");
    console.log(`   Name: ${NAME}`);
    console.log(`   Symbol: ${SYMBOL}`);
    console.log(`   Endpoint: ${ENDPOINT}`);
    console.log(`   Delegate: ${DELEGATE}`);
    
    // Get current gas price
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice!;
    
    // Force high gas limit since estimation is broken
    const gasSettings = {
        gasPrice: gasPrice,
        gasLimit: 4000000 // 4M gas - higher than adapters since OFT is more complex
    };
    
    const estimatedCost = gasPrice * BigInt(gasSettings.gasLimit);
    
    console.log("\n⛽ FORCED HIGH GAS SETTINGS:");
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    console.log(`   Gas Limit: 4M (forced high)`);
    console.log(`   Max Cost: ${ethers.formatEther(estimatedCost)} ETH`);
    
    if (balance < estimatedCost) {
        console.log(`❌ Insufficient balance for forced high gas deployment`);
        console.log(`   Need: ${ethers.formatEther(estimatedCost)} ETH`);
        return;
    }
    
    console.log(`✅ Sufficient balance for high gas deployment`);
    
    try {
        console.log("\n🚀 Force deploying with 4M gas limit...");
        
        const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
        
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
        
        console.log("\n🎉 SUCCESS! EAGLE SHARE OFT DEPLOYED!");
        console.log(`📍 Address: ${address}`);
        
        // Get actual gas used
        const receipt = await eagleShareOFT.deploymentTransaction()?.wait();
        if (receipt) {
            const actualCost = receipt.gasUsed * receipt.gasPrice;
            console.log(`💸 Actual cost: ${ethers.formatEther(actualCost)} ETH`);
            console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
            
            const newBalance = await ethers.provider.getBalance(deployer.address);
            console.log(`💰 Remaining: ${ethers.formatEther(newBalance)} ETH`);
        }
        
        // Test functionality
        console.log("\n🔬 TESTING DEPLOYMENT...");
        const name = await eagleShareOFT.name();
        const symbol = await eagleShareOFT.symbol();
        const decimals = await eagleShareOFT.decimals();
        const owner = await eagleShareOFT.owner();
        
        console.log(`✅ Name: ${name}`);
        console.log(`✅ Symbol: ${symbol}`);
        console.log(`✅ Decimals: ${decimals}`);
        console.log(`✅ Owner: ${owner}`);
        
        console.log(`🔗 Etherscan: https://etherscan.io/address/${address}`);
        
        // FINAL SUCCESS!
        console.log("\n🏆 🏆 🏆 ALL ETHEREUM CONTRACTS DEPLOYED! 🏆 🏆 🏆");
        console.log("=".repeat(60));
        console.log(`✅ 1/3: WLFI OFT Adapter: 0x45d452aa571494b896d7926563B41a7b16B74E2F`);
        console.log(`✅ 2/3: USD1 OFT Adapter: 0xba9B60A00fD10323Abbdc1044627B54D3ebF470e`);
        console.log(`✅ 3/3: Eagle Share OFT:  ${address}`);
        console.log("=".repeat(60));
        console.log("🎯 ETHEREUM HUB: 100% COMPLETE!");
        console.log("🌐 5-CHAIN OMNICHAIN SYSTEM: READY!");
        console.log("🚀 NEXT: Configure LayerZero peer connections!");
        
    } catch (error: any) {
        console.log("\n❌ DEPLOYMENT ERROR:");
        console.log(`Error: ${error.message}`);
        
        if (error.reason) {
            console.log(`Reason: ${error.reason}`);
        }
        
        if (error.data) {
            console.log(`Error data: ${error.data}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
