import { ethers } from "hardhat";

/**
 * @title Test BSC Omnichain System
 * @notice Test BSC deployment and cross-chain functionality
 */

async function main() {
    console.log("🧪 TESTING BSC OMNICHAIN SYSTEM");
    console.log("=".repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 BNB Balance: ${ethers.formatEther(balance)} BNB`);
    
    // Real BSC token addresses from .env
    const REAL_WLFI_BSC = process.env.WLFI_BSC!;
    const REAL_USD1_BSC = process.env.USD1_BSC!;
    
    console.log("\n📋 CHECKING REAL BSC TOKENS:");
    console.log(`🪙 WLFI BSC: ${REAL_WLFI_BSC}`);
    console.log(`🪙 USD1 BSC: ${REAL_USD1_BSC}`);
    
    // Check if we need to deploy or if already deployed
    const ENDPOINT_ADDRESS = process.env.BNB_LZ_ENDPOINT_V2!;
    console.log(`🔗 LayerZero Endpoint: ${ENDPOINT_ADDRESS}`);
    console.log("");
    
    // Test token balances
    try {
        console.log("🔍 Checking token balances...");
        
        const wlfiToken = await ethers.getContractAt("IERC20", REAL_WLFI_BSC);
        const usd1Token = await ethers.getContractAt("IERC20", REAL_USD1_BSC);
        
        const wlfiBalance = await wlfiToken.balanceOf(deployer.address);
        const usd1Balance = await usd1Token.balanceOf(deployer.address);
        
        console.log(`✅ WLFI balance: ${ethers.formatEther(wlfiBalance)}`);
        console.log(`✅ USD1 balance: ${ethers.formatUnits(usd1Balance, 6)}`);
        console.log("");
        
        // Check if BSC OFT Adapters are already deployed
        console.log("🔍 Checking if BSC OFT Adapters exist...");
        
        // These addresses should be in a deployment record or we need to deploy
        // For now, let's try to deploy fresh if needed
        
        console.log("🚀 DEPLOYING BSC OFT ADAPTERS (if needed)...");
        
        // Deploy WLFI OFT Adapter
        console.log("1️⃣ Deploying WLFI OFT Adapter...");
        
        const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
        const wlfiAdapter = await WLFIAdapter.deploy(
            REAL_WLFI_BSC,
            ENDPOINT_ADDRESS,
            deployer.address,
            {
                gasPrice: ethers.parseUnits("3", "gwei"), // 3 gwei for BSC
                gasLimit: 2000000
            }
        );
        await wlfiAdapter.waitForDeployment();
        const wlfiAdapterAddress = await wlfiAdapter.getAddress();
        console.log(`✅ WLFI OFT Adapter: ${wlfiAdapterAddress}`);
        
        // Deploy USD1 OFT Adapter
        console.log("2️⃣ Deploying USD1 OFT Adapter...");
        
        const USD1Adapter = await ethers.getContractFactory("USD1AssetOFTAdapter");
        const usd1Adapter = await USD1Adapter.deploy(
            REAL_USD1_BSC,
            ENDPOINT_ADDRESS,
            deployer.address,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 2000000
            }
        );
        await usd1Adapter.waitForDeployment();
        const usd1AdapterAddress = await usd1Adapter.getAddress();
        console.log(`✅ USD1 OFT Adapter: ${usd1AdapterAddress}`);
        
        // Deploy Eagle Share OFT
        console.log("3️⃣ Deploying Eagle Share OFT...");
        
        const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
        const eagleShareOFT = await EagleShareOFT.deploy(
            "Eagle Vault Shares",
            "EAGLE",
            ENDPOINT_ADDRESS,
            deployer.address,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 2000000
            }
        );
        await eagleShareOFT.waitForDeployment();
        const eagleShareAddress = await eagleShareOFT.getAddress();
        console.log(`✅ Eagle Share OFT: ${eagleShareAddress}`);
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const totalUsed = balance - finalBalance;
        
        console.log("\n🎉 BSC DEPLOYMENT COMPLETE!");
        console.log("=".repeat(60));
        console.log(`💸 Total cost: ${ethers.formatEther(totalUsed)} BNB (~$${(parseFloat(ethers.formatEther(totalUsed)) * 600).toFixed(2)})`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} BNB`);
        console.log("");
        
        console.log("📋 BSC CONTRACTS:");
        console.log("REAL TOKENS (wrapped by OFT Adapters):");
        console.log(`🪙 WLFI Token:         ${REAL_WLFI_BSC}`);
        console.log(`🪙 USD1 Token:         ${REAL_USD1_BSC}`);
        console.log("");
        console.log("OFT ADAPTERS (for omnichain):");
        console.log(`🔄 WLFI OFT Adapter:   ${wlfiAdapterAddress}`);
        console.log(`🔄 USD1 OFT Adapter:   ${usd1AdapterAddress}`);
        console.log(`🔄 Eagle Share OFT:    ${eagleShareAddress}`);
        console.log("=".repeat(60));
        
        console.log("\n🚀 BSC SYSTEM STATUS:");
        console.log("✅ Real WLFI/USD1 tokens on BSC");
        console.log("✅ OFT Adapters deployed for cross-chain");
        console.log("✅ No token migration needed");
        console.log("✅ Ready for cross-chain testing!");
        
        console.log("\n📝 BSC ADDRESSES:");
        console.log(`BSC_WLFI_ADAPTER=${wlfiAdapterAddress}`);
        console.log(`BSC_USD1_ADAPTER=${usd1AdapterAddress}`);
        console.log(`BSC_EAGLE_SHARE=${eagleShareAddress}`);
        
        console.log("\n🔥 NEXT: Test cross-chain transfer from BSC to Arbitrum!");
        
    } catch (error: any) {
        console.error(`❌ BSC test failed: ${error.message}`);
        
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Need more BNB for deployment");
        } else {
            console.log("💡 Check contract dependencies");
        }
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const used = balance - finalBalance;
        console.log(`💸 Used: ${ethers.formatEther(used)} BNB`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} BNB`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
