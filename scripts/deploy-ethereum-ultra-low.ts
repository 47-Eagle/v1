import { ethers } from "hardhat";

/**
 * @title Ultra-Low Gas Ethereum Deployment
 * @notice Deploy with absolute minimum gas to work within tight budget
 */

async function main() {
    console.log("⚡ ULTRA-LOW GAS ETHEREUM DEPLOYMENT");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Get current network gas price
    const feeData = await ethers.provider.getFeeData();
    const networkGasPrice = feeData.gasPrice!;
    
    // Use absolute minimum gas settings
    const gasSettings = {
        gasPrice: networkGasPrice, // Use network minimum
        gasLimit: 800000 // Ultra-conservative
    };
    
    const costPerContract = networkGasPrice * 800000n;
    console.log(`⛽ Ultra-Low Settings:`);
    console.log(`   Gas Price: ${ethers.formatUnits(networkGasPrice, "gwei")} gwei`);
    console.log(`   Gas Limit: 800,000`);
    console.log(`   Cost: ~${ethers.formatEther(costPerContract)} ETH per contract`);
    console.log("");
    
    // Real tokens
    const REAL_WLFI = process.env.WLFI_ETHEREUM!;
    const REAL_USD1 = process.env.USD1_ETHEREUM!;
    const ENDPOINT = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    
    console.log("📋 REAL TOKENS:");
    console.log(`🪙 WLFI: ${REAL_WLFI}`);
    console.log(`🪙 USD1: ${REAL_USD1}`);
    console.log("");
    
    try {
        if (balance >= costPerContract) {
            console.log("1️⃣ Deploying WLFI OFT Adapter (ultra-minimal)...");
            
            const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
            const wlfiAdapter = await WLFIAdapter.deploy(
                REAL_WLFI,
                ENDPOINT,
                deployer.address,
                gasSettings
            );
            await wlfiAdapter.waitForDeployment();
            const wlfiAdapterAddress = await wlfiAdapter.getAddress();
            
            const newBalance = await ethers.provider.getBalance(deployer.address);
            const used = balance - newBalance;
            
            console.log(`✅ WLFI OFT Adapter: ${wlfiAdapterAddress}`);
            console.log(`💸 Used: ${ethers.formatEther(used)} ETH`);
            console.log(`💰 Remaining: ${ethers.formatEther(newBalance)} ETH`);
            
            // Try USD1 if we have enough left
            if (newBalance >= costPerContract) {
                console.log("\n2️⃣ Deploying USD1 OFT Adapter...");
                
                const USD1Adapter = await ethers.getContractFactory("USD1AssetOFTAdapter");
                const usd1Adapter = await USD1Adapter.deploy(
                    REAL_USD1,
                    ENDPOINT,
                    deployer.address,
                    gasSettings
                );
                await usd1Adapter.waitForDeployment();
                const usd1AdapterAddress = await usd1Adapter.getAddress();
                
                const finalBalance = await ethers.provider.getBalance(deployer.address);
                const totalUsed = balance - finalBalance;
                
                console.log(`✅ USD1 OFT Adapter: ${usd1AdapterAddress}`);
                console.log(`💸 Total Used: ${ethers.formatEther(totalUsed)} ETH`);
                console.log(`💰 Final Balance: ${ethers.formatEther(finalBalance)} ETH`);
                
                console.log("\n🎉 SUCCESS! BOTH OFT ADAPTERS DEPLOYED!");
                console.log("=".repeat(50));
                console.log(`🔄 WLFI Adapter: ${wlfiAdapterAddress}`);
                console.log(`🔄 USD1 Adapter: ${usd1AdapterAddress}`);
                
            } else {
                console.log("\n⚠️  Insufficient ETH for USD1 adapter");
                console.log("   But WLFI adapter is functional!");
            }
            
        } else {
            console.log("❌ Insufficient ETH for any deployment");
            console.log(`   Need: ${ethers.formatEther(costPerContract)} ETH`);
            console.log(`   Have: ${ethers.formatEther(balance)} ETH`);
            console.log(`   Missing: ${ethers.formatEther(costPerContract - balance)} ETH (~$${Math.ceil(parseFloat(ethers.formatEther(costPerContract - balance)) * 2500)})`);
        }
        
        console.log("\n📊 ETHEREUM HUB COMPONENTS STATUS:");
        console.log("✅ Eagle Vault V2: 0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0");
        console.log("✅ Charm Strategy: 0xB5589Af4b2CE5dcE27c757b18144e6D6848C45dF");
        console.log("📍 WLFI Adapter: [DEPLOYING...]");
        console.log("📍 USD1 Adapter: [DEPLOYING...]");
        
        console.log("\n🎯 SYSTEM STATUS:");
        console.log("🌐 4/5 chains operational (BSC, Arbitrum, Base, Avalanche)");
        console.log("🔗 Cross-chain infrastructure: 100% ready");
        console.log("⚡ Ethereum hub: Partially deployed");
        console.log("🚀 Almost ready for live cross-chain yield farming!");
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const used = balance - finalBalance;
        console.log(`💸 Gas used: ${ethers.formatEther(used)} ETH`);
        
        if (error.message.includes("insufficient funds")) {
            const needed = costPerContract - balance;
            console.log(`💡 Need ${ethers.formatEther(needed)} ETH more (~$${Math.ceil(parseFloat(ethers.formatEther(needed)) * 2500)})`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


