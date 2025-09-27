import { ethers } from "hardhat";

async function main() {
    console.log("💰 ETHEREUM DEPLOYMENT REQUIREMENTS");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Current Balance: ${ethers.formatEther(balance)} ETH`);
    console.log("");
    
    // **Estimate gas costs for remaining deployments**
    const DEPLOYMENTS_NEEDED = [
        { name: "USD1 ERC20 Token", gas: 800000, gasPrice: "2" },
        { name: "WLFI OFT Adapter", gas: 2500000, gasPrice: "2" }, 
        { name: "USD1 OFT Adapter", gas: 2500000, gasPrice: "2" },
        { name: "Eagle Share OFT", gas: 2500000, gasPrice: "2" }
    ];
    
    let totalCostWei = ethers.parseEther("0");
    
    console.log("📋 DEPLOYMENT COST BREAKDOWN:");
    console.log("");
    
    for (const deployment of DEPLOYMENTS_NEEDED) {
        const gasPrice = ethers.parseUnits(deployment.gasPrice, "gwei");
        const cost = gasPrice * BigInt(deployment.gas);
        totalCostWei += cost;
        
        console.log(`${deployment.name}:`);
        console.log(`   Gas: ${deployment.gas.toLocaleString()}`);
        console.log(`   Price: ${deployment.gasPrice} gwei`);  
        console.log(`   Cost: ${ethers.formatEther(cost)} ETH`);
        console.log("");
    }
    
    const totalCost = ethers.formatEther(totalCostWei);
    console.log(`💸 TOTAL ESTIMATED COST: ${totalCost} ETH`);
    
    const needed = totalCostWei - balance;
    
    if (needed > 0) {
        console.log(`❌ INSUFFICIENT FUNDS`);
        console.log(`   Need: ${ethers.formatEther(needed)} ETH more`);
        console.log(`   Recommended: Add 0.01 ETH for safety`);
        console.log("");
        console.log("💡 FUNDING OPTIONS:");
        console.log("   1. Add ~0.01 ETH to deployer account");
        console.log("   2. Use ultra-low gas (1 gwei) - riskier");
        console.log("   3. Deploy one contract at a time");
    } else {
        console.log(`✅ SUFFICIENT FUNDS`);
        console.log(`   Extra: ${ethers.formatEther(-needed)} ETH`);
        console.log("");
        console.log("🚀 READY TO DEPLOY ETHEREUM HUB!");
    }
    
    console.log("");
    console.log("🎯 COMPLETION STATUS:");
    console.log("✅ BSC, Arbitrum, Base, Avalanche deployed");
    console.log("✅ Real LayerZero addresses configured");  
    console.log("✅ ULN libraries set with real addresses");
    console.log("❌ Ethereum hub (final piece)");
    console.log("");
    console.log("Once Ethereum is deployed:");
    console.log("🎊 100% Complete Omnichain System");
    console.log("🚀 Ready for LayerZero DVN professional setup");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

