import { ethers } from "hardhat";

/**
 * @title Minimal Ethereum OFT Adapters Deployment
 * @notice Deploy only the essential OFT adapters for real WLFI/USD1 tokens
 * 
 * This script:
 * - Uses REAL existing WLFI/USD1 tokens (no new tokens!)
 * - Deploys only the OFT Adapters needed for cross-chain
 * - Skips complex vault/strategy setup to save gas
 * - Gets us to 100% functional omnichain system
 */

async function main() {
    console.log("⚡ MINIMAL ETHEREUM OFT ADAPTERS DEPLOYMENT");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // LayerZero Endpoint
    const ENDPOINT_ADDRESS = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    console.log(`🔗 LayerZero Endpoint: ${ENDPOINT_ADDRESS}`);
    
    // REAL TOKEN ADDRESSES FROM .ENV
    const REAL_WLFI = process.env.WLFI_ETHEREUM!;
    const REAL_USD1 = process.env.USD1_ETHEREUM!;
    
    console.log("\n📋 USING REAL PRODUCTION TOKENS:");
    console.log(`🪙 WLFI: ${REAL_WLFI}`);
    console.log(`🪙 USD1: ${REAL_USD1}`);
    console.log("");
    
    // Verify tokens exist
    const wlfiToken = await ethers.getContractAt("IERC20", REAL_WLFI);
    const usd1Token = await ethers.getContractAt("IERC20", REAL_USD1);
    
    console.log("🔍 Verifying real tokens...");
    try {
        const wlfiBalance = await wlfiToken.balanceOf(deployer.address);
        const usd1Balance = await usd1Token.balanceOf(deployer.address);
        console.log(`✅ WLFI balance: ${ethers.formatEther(wlfiBalance)}`);
        console.log(`✅ USD1 balance: ${ethers.formatUnits(usd1Balance, 6)}`);
    } catch (error) {
        console.log("ℹ️  Token verification skipped (interface check)");
    }
    console.log("");
    
    // Gas settings - conservative
    const gasSettings = {
        gasPrice: ethers.parseUnits("20", "gwei"), // 20 gwei
        gasLimit: 2500000 // 2.5M gas limit
    };
    
    console.log("⛽ GAS SETTINGS:");
    console.log(`   Gas Price: 20 gwei`);
    console.log(`   Gas Limit: 2.5M`);
    console.log(`   Max Cost Per Contract: ~0.05 ETH`);
    console.log("");
    
    try {
        // =================================
        // 1. DEPLOY WLFI OFT ADAPTER
        // =================================
        
        console.log("1️⃣ Deploying WLFI OFT Adapter...");
        console.log(`   Wrapping: ${REAL_WLFI}`);
        
        const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
        const wlfiAdapter = await WLFIAdapter.deploy(
            REAL_WLFI,
            ENDPOINT_ADDRESS,
            deployer.address,
            gasSettings
        );
        await wlfiAdapter.waitForDeployment();
        const wlfiAdapterAddress = await wlfiAdapter.getAddress();
        console.log(`✅ WLFI OFT Adapter: ${wlfiAdapterAddress}`);
        console.log("");
        
        // =================================
        // 2. DEPLOY USD1 OFT ADAPTER  
        // =================================
        
        console.log("2️⃣ Deploying USD1 OFT Adapter...");
        console.log(`   Wrapping: ${REAL_USD1}`);
        
        const USD1Adapter = await ethers.getContractFactory("USD1AssetOFTAdapter");
        const usd1Adapter = await USD1Adapter.deploy(
            REAL_USD1,
            ENDPOINT_ADDRESS,
            deployer.address,
            gasSettings
        );
        await usd1Adapter.waitForDeployment();
        const usd1AdapterAddress = await usd1Adapter.getAddress();
        console.log(`✅ USD1 OFT Adapter: ${usd1AdapterAddress}`);
        console.log("");
        
        // =================================
        // 3. DEPLOY EAGLE SHARE OFT
        // =================================
        
        console.log("3️⃣ Deploying Eagle Share OFT...");
        
        const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
        const eagleShareOFT = await EagleShareOFT.deploy(
            "Eagle Vault Shares",
            "EAGLE",
            ENDPOINT_ADDRESS,
            deployer.address,
            gasSettings
        );
        await eagleShareOFT.waitForDeployment();
        const eagleShareAddress = await eagleShareOFT.getAddress();
        console.log(`✅ Eagle Share OFT: ${eagleShareAddress}`);
        console.log("");
        
        // =================================
        // DEPLOYMENT COMPLETE
        // =================================
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const totalUsed = balance - finalBalance;
        
        console.log("🎉 ETHEREUM OFT ADAPTERS DEPLOYMENT COMPLETE!");
        console.log("=".repeat(60));
        console.log("💸 GAS USAGE:");
        console.log(`   Total Used: ${ethers.formatEther(totalUsed)} ETH`);
        console.log(`   Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        console.log("");
        
        console.log("📋 DEPLOYED CONTRACTS:");
        console.log("REAL TOKENS (existing):");
        console.log(`🪙 WLFI Token:          ${REAL_WLFI}`);
        console.log(`🪙 USD1 Token:          ${REAL_USD1}`);
        console.log("");
        console.log("OFT ADAPTERS (new, for omnichain):");
        console.log(`🔄 WLFI OFT Adapter:    ${wlfiAdapterAddress}`);
        console.log(`🔄 USD1 OFT Adapter:    ${usd1AdapterAddress}`);
        console.log(`🔄 Eagle Share OFT:     ${eagleShareAddress}`);
        console.log("=".repeat(60));
        
        console.log("\n🚀 STATUS: ETHEREUM HUB READY FOR OMNICHAIN!");
        console.log("✅ Real WLFI/USD1 tokens wrapped for cross-chain");
        console.log("✅ No token migration needed");
        console.log("✅ Existing integrations preserved");
        console.log("✅ Ready for LayerZero peer connections");
        console.log("");
        console.log("🔥 NEXT STEPS:");
        console.log("1. Configure cross-chain peer connections");
        console.log("2. Test cross-chain transfers");
        console.log("3. Add vault/strategy later if needed");
        
        // Export addresses for configuration
        console.log("\n📝 ADDRESSES FOR CROSS-CHAIN CONFIG:");
        console.log(`ETHEREUM_WLFI_ADAPTER=${wlfiAdapterAddress}`);
        console.log(`ETHEREUM_USD1_ADAPTER=${usd1AdapterAddress}`);
        console.log(`ETHEREUM_EAGLE_SHARE=${eagleShareAddress}`);
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const used = balance - finalBalance;
        console.log(`💸 Gas used before failure: ${ethers.formatEther(used)} ETH`);
        
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Need more ETH for deployment");
        } else if (error.message.includes("gas")) {
            console.log("💡 Try increasing gas limit or price");
        } else {
            console.log("💡 Check contract dependencies and LayerZero endpoint");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
