import { ethers } from "hardhat";

/**
 * @title Ultra-Minimal Ethereum Deployment (Extreme Low Gas)
 * @notice Deploy with absolute minimum gas to work within tight ETH budget
 */

async function main() {
    console.log("⚡ ULTRA-MINIMAL ETHEREUM DEPLOYMENT (EXTREME LOW GAS)");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    console.log("");
    
    // Get current gas price from network
    const feeData = await ethers.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice!;
    
    // Use MINIMUM possible gas settings
    const gasSettings = {
        gasPrice: currentGasPrice, // Use network minimum
        gasLimit: 800000 // Ultra-conservative 800K
    };
    
    console.log("⛽ ULTRA-LOW GAS SETTINGS:");
    console.log(`   Gas Price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei (network minimum)`);
    console.log(`   Gas Limit: 800,000`);
    console.log(`   Max Cost: ~${ethers.formatEther(currentGasPrice * 800000n)} ETH per contract`);
    console.log("");
    
    // LayerZero Endpoint
    const ENDPOINT_ADDRESS = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    console.log(`🔗 LayerZero Endpoint: ${ENDPOINT_ADDRESS}`);
    
    // REAL TOKEN ADDRESSES
    const REAL_WLFI = process.env.WLFI_ETHEREUM!;
    const REAL_USD1 = process.env.USD1_ETHEREUM!;
    
    console.log("\n📋 REAL TOKENS TO WRAP:");
    console.log(`🪙 WLFI: ${REAL_WLFI}`);
    console.log(`🪙 USD1: ${REAL_USD1}`);
    console.log("");
    
    try {
        // Try deploying ONE contract at a time with absolute minimum gas
        
        console.log("1️⃣ Deploying WLFI OFT Adapter (ultra-minimal gas)...");
        
        const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
        const wlfiAdapter = await WLFIAdapter.deploy(
            REAL_WLFI,
            ENDPOINT_ADDRESS,
            deployer.address,
            gasSettings
        );
        
        console.log("⏳ Waiting for deployment...");
        await wlfiAdapter.waitForDeployment();
        const wlfiAdapterAddress = await wlfiAdapter.getAddress();
        
        const newBalance = await ethers.provider.getBalance(deployer.address);
        const used = balance - newBalance;
        
        console.log(`✅ WLFI OFT Adapter: ${wlfiAdapterAddress}`);
        console.log(`💸 Gas used: ${ethers.formatEther(used)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(newBalance)} ETH`);
        console.log("");
        
        // Check if we have enough for the next contract
        const estimatedCost = used; // Use actual cost from first deployment
        
        if (newBalance > estimatedCost) {
            console.log("2️⃣ Deploying USD1 OFT Adapter...");
            
            const USD1Adapter = await ethers.getContractFactory("USD1AssetOFTAdapter");
            const usd1Adapter = await USD1Adapter.deploy(
                REAL_USD1,
                ENDPOINT_ADDRESS,
                deployer.address,
                gasSettings
            );
            
            await usd1Adapter.waitForDeployment();
            const usd1AdapterAddress = await usd1Adapter.getAddress();
            
            const finalBalance = await ethers.provider.getBalance(deployer.address);
            const totalUsed = balance - finalBalance;
            
            console.log(`✅ USD1 OFT Adapter: ${usd1AdapterAddress}`);
            console.log(`💸 Total gas used: ${ethers.formatEther(totalUsed)} ETH`);
            console.log(`💰 Final balance: ${ethers.formatEther(finalBalance)} ETH`);
            console.log("");
            
            console.log("🎉 SUCCESS! BOTH OFT ADAPTERS DEPLOYED!");
            console.log("=".repeat(60));
            console.log("REAL TOKENS (wrapped for omnichain):");
            console.log(`🪙 WLFI → ${wlfiAdapterAddress}`);
            console.log(`🪙 USD1 → ${usd1AdapterAddress}`);
            console.log("=".repeat(60));
            
            console.log("\n🚀 OMNICHAIN SYSTEM STATUS:");
            console.log("✅ Ethereum OFT Adapters deployed");
            console.log("✅ Real WLFI/USD1 tokens wrapped");
            console.log("✅ No token migration required");
            console.log("✅ Ready for cross-chain peer connections!");
            
            console.log("\n📝 FOR CONFIGURATION:");
            console.log(`ETHEREUM_WLFI_ADAPTER=${wlfiAdapterAddress}`);
            console.log(`ETHEREUM_USD1_ADAPTER=${usd1AdapterAddress}`);
            
        } else {
            console.log("⚠️  Insufficient ETH for USD1 adapter");
            console.log(`   Need: ${ethers.formatEther(estimatedCost)} ETH`);
            console.log(`   Have: ${ethers.formatEther(newBalance)} ETH`);
            console.log("   But WLFI adapter is deployed and functional!");
            
            console.log("\n📝 DEPLOYED:");
            console.log(`ETHEREUM_WLFI_ADAPTER=${wlfiAdapterAddress}`);
        }
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const used = balance - finalBalance;
        console.log(`💸 Gas used: ${ethers.formatEther(used)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 SOLUTIONS:");
            console.log("1. Add more ETH to deployer account");
            console.log("2. Wait for lower gas prices");
            console.log("3. Deploy contracts individually");
            console.log(`4. Current balance: ${ethers.formatEther(finalBalance)} ETH`);
            console.log(`5. Estimated need: 0.01-0.02 ETH total`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
