import { ethers } from "hardhat";

async function main() {
    console.log("⛽ ETH DEPLOYMENT COST ESTIMATOR");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Current Balance: ${ethers.formatEther(balance)} ETH`);
    console.log("");
    
    // Get current gas prices
    try {
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("15", "gwei");
        
        console.log("🏷️ CURRENT GAS PRICES:");
        console.log(`   Current: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
        console.log(`   Low (8 gwei): ${ethers.formatUnits(ethers.parseUnits("8", "gwei"), "gwei")} gwei`);
        console.log(`   Medium (15 gwei): ${ethers.formatUnits(ethers.parseUnits("15", "gwei"), "gwei")} gwei`);
        console.log(`   High (25 gwei): ${ethers.formatUnits(ethers.parseUnits("25", "gwei"), "gwei")} gwei`);
        console.log("");
        
        // Estimate gas for each contract
        const lzEndpoint = "0x1a44076050125825900e736c501f859c50fE728c";
        const wlfiAddress = process.env.WLFI_ETHEREUM || "";
        const usd1Address = process.env.USD1_ETHEREUM || "";
        
        if (!wlfiAddress || !usd1Address) {
            console.log("⚠️ Missing token addresses - using mock estimates");
            console.log("   Add WLFI_ETHEREUM and USD1_ETHEREUM to .env for accurate estimates");
            console.log("");
        }
        
        // Rough gas estimates based on similar contracts
        const gasEstimates = {
            wlfiAdapter: 1200000,  // OFT Adapter deployment
            usd1Adapter: 1200000,  // OFT Adapter deployment
            shareOFT: 1500000      // ERC20 OFT deployment
        };
        
        console.log("📊 GAS COST ESTIMATES:");
        console.log("");
        
        // Calculate costs at different gas prices
        const gasPrices = [
            { name: "Ultra Low (8 gwei)", price: ethers.parseUnits("8", "gwei") },
            { name: "Low (10 gwei)", price: ethers.parseUnits("10", "gwei") },
            { name: "Current", price: gasPrice },
            { name: "High (25 gwei)", price: ethers.parseUnits("25", "gwei") }
        ];
        
        for (const { name, price } of gasPrices) {
            console.log(`🏷️ ${name}:`);
            
            const wlfiCost = (price * BigInt(gasEstimates.wlfiAdapter));
            const usd1Cost = (price * BigInt(gasEstimates.usd1Adapter));
            const shareCost = (price * BigInt(gasEstimates.shareOFT));
            const totalCost = wlfiCost + usd1Cost + shareCost;
            
            console.log(`   WLFI Adapter: ${ethers.formatEther(wlfiCost)} ETH`);
            console.log(`   USD1 Adapter: ${ethers.formatEther(usd1Cost)} ETH`);
            console.log(`   Share OFT: ${ethers.formatEther(shareCost)} ETH`);
            console.log(`   🎯 TOTAL: ${ethers.formatEther(totalCost)} ETH`);
            
            // Check if user has enough
            const hasEnough = balance >= totalCost;
            const shortfall = hasEnough ? 0n : totalCost - balance;
            
            if (hasEnough) {
                console.log(`   ✅ You have enough ETH!`);
            } else {
                console.log(`   ❌ Need ${ethers.formatEther(shortfall)} ETH more`);
            }
            console.log("");
        }
        
        // Recommendations
        console.log("💡 RECOMMENDATIONS:");
        console.log("");
        
        if (balance < ethers.parseEther("0.003")) {
            console.log("🚨 CRITICAL: Very low ETH balance");
            console.log("   • Add at least 0.01 ETH for safe deployment");
            console.log("   • Use Ultra Low gas price (8 gwei) for cheapest deployment");
        } else if (balance < ethers.parseEther("0.01")) {
            console.log("⚠️ LOW: Limited ETH for deployment");
            console.log("   • Deploy one contract at a time");
            console.log("   • Use deploy-ethereum-minimal.ts script");
            console.log("   • Wait for gas prices below 10 gwei");
        } else {
            console.log("✅ SUFFICIENT: Good ETH balance for deployment");
            console.log("   • Can deploy all contracts at once");
            console.log("   • Consider waiting for gas prices below 15 gwei for savings");
        }
        
        console.log("");
        console.log("🛠️ DEPLOYMENT SCRIPTS:");
        console.log("   1. npm run deploy:eth-minimal     (cheapest, one by one)");
        console.log("   2. npm run deploy:eth-create2     (CREATE2 factory)");
        console.log("   3. npm run deploy:eth-standard    (standard deployment)");
        
    } catch (error: any) {
        console.error("❌ Error estimating costs:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

