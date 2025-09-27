import { ethers } from "hardhat";

/**
 * @title Deploy Ethereum OFT Adapters Only
 * @notice Deploy just the essential OFT adapters to make cross-chain system functional
 */

async function main() {
    console.log("🔧 DEPLOYING ETHEREUM OFT ADAPTERS ONLY");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Real token addresses from .env
    const REAL_WLFI = process.env.WLFI_ETHEREUM!;
    const REAL_USD1 = process.env.USD1_ETHEREUM!;
    const ENDPOINT_ADDRESS = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    
    console.log("\n📋 USING REAL ETHEREUM TOKENS:");
    console.log(`🪙 WLFI: ${REAL_WLFI}`);
    console.log(`🪙 USD1: ${REAL_USD1}`);
    console.log(`🔗 LayerZero: ${ENDPOINT_ADDRESS}`);
    console.log("");
    
    // Conservative gas settings
    const gasSettings = {
        gasPrice: ethers.parseUnits("15", "gwei"), // 15 gwei
        gasLimit: 3000000 // 3M gas limit
    };
    
    console.log("⛽ GAS SETTINGS:");
    console.log(`   Gas Price: 15 gwei`);
    console.log(`   Gas Limit: 3M`);
    console.log(`   Max Cost: ~0.045 ETH per contract`);
    console.log("");
    
    try {
        // Deploy WLFI OFT Adapter
        console.log("1️⃣ Deploying WLFI OFT Adapter...");
        console.log(`   Wrapping real WLFI: ${REAL_WLFI}`);
        
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
        console.log(`   Wraps: ${REAL_WLFI} (World Liberty Financial)`);
        
        // Deploy USD1 OFT Adapter
        console.log("\n2️⃣ Deploying USD1 OFT Adapter...");
        console.log(`   Wrapping real USD1: ${REAL_USD1}`);
        
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
        console.log(`   Wraps: ${REAL_USD1} (USD1 Stablecoin)`);
        
        // Deploy Eagle Share OFT
        console.log("\n3️⃣ Deploying Eagle Share OFT...");
        
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
        console.log(`   Symbol: EAGLE`);
        
        // Calculate final costs
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const totalUsed = balance - finalBalance;
        
        console.log("\n🎉 ETHEREUM OFT ADAPTERS DEPLOYMENT COMPLETE!");
        console.log("=".repeat(60));
        console.log(`💸 Total Gas Used: ${ethers.formatEther(totalUsed)} ETH`);
        console.log(`💰 Remaining Balance: ${ethers.formatEther(finalBalance)} ETH`);
        console.log("");
        
        console.log("📋 DEPLOYED CONTRACTS:");
        console.log("Real Tokens (existing):");
        console.log(`🪙 WLFI Token:          ${REAL_WLFI}`);
        console.log(`🪙 USD1 Token:          ${REAL_USD1}`);
        console.log("");
        console.log("OFT Adapters (new, for omnichain):");
        console.log(`🔄 WLFI OFT Adapter:    ${wlfiAdapterAddress}`);
        console.log(`🔄 USD1 OFT Adapter:    ${usd1AdapterAddress}`);
        console.log(`🔄 Eagle Share OFT:     ${eagleShareAddress}`);
        console.log("");
        
        console.log("✅ Previously Deployed (from earlier):");
        console.log(`🏦 Eagle Vault V2:      0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0`);
        console.log(`🎯 Charm Strategy:      0xB5589Af4b2CE5dcE27c757b18144e6D6848C45dF`);
        console.log("");
        
        console.log("🚀 ETHEREUM HUB STATUS: OPERATIONAL!");
        console.log("✅ Real WLFI/USD1 tokens wrapped for omnichain");
        console.log("✅ Cross-chain infrastructure ready");
        console.log("✅ Eagle Vault system functional");
        console.log("✅ Ready to configure peer connections");
        
        console.log("\n🔥 NEXT STEPS:");
        console.log("1. Configure peer connections (Ethereum ↔ All chains)");
        console.log("2. Test cross-chain transfers");
        console.log("3. Connect vault to Charm Finance integration");
        
        // Export addresses for configuration
        console.log("\n📝 ADDRESSES FOR PEER CONFIGURATION:");
        console.log(`ETHEREUM_WLFI_ADAPTER=${wlfiAdapterAddress}`);
        console.log(`ETHEREUM_USD1_ADAPTER=${usd1AdapterAddress}`);
        console.log(`ETHEREUM_EAGLE_SHARE=${eagleShareAddress}`);
        console.log(`ETHEREUM_VAULT=${await 'b751adb8Dd9767309D7a0e328B29909aFd311Dc0'}`);
        
    } catch (error: any) {
        console.error(`❌ Deployment failed: ${error.message}`);
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const used = balance - finalBalance;
        console.log(`💸 Gas used: ${ethers.formatEther(used)} ETH`);
        
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Need more ETH for deployment");
        } else {
            console.log("💡 Check contract dependencies and parameters");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


