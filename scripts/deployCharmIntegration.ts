import { ethers } from "hardhat";
import { Contract } from "ethers";

/**
 * Deploy script for EagleOVault V2 with Charm Alpha Vault integration
 * 
 * This script demonstrates how to:
 * 1. Deploy the enhanced EagleOVaultV2 with strategy support
 * 2. Deploy the CharmAlphaVaultStrategy wrapper
 * 3. Initialize and connect the strategy to the vault
 * 4. Test basic deposit/withdrawal functionality
 */

async function main() {
    console.log("🚀 Deploying EagleOVault V2 with Charm Integration...\n");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

    // =================================
    // MOCK TOKEN DEPLOYMENT (for testing)
    // =================================
    
    console.log("📦 Deploying mock tokens...");
    
    // Deploy mock WLFI token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const wlfiToken = await MockERC20.deploy("World Liberty Financial", "WLFI");
    await wlfiToken.waitForDeployment();
    console.log("✅ WLFI Token deployed to:", await wlfiToken.getAddress());
    
    // Deploy mock USD1 token
    const usd1Token = await MockERC20.deploy("USD1", "USD1");
    await usd1Token.waitForDeployment();
    console.log("✅ USD1 Token deployed to:", await usd1Token.getAddress());

    // =================================
    // MOCK CHARM FACTORY DEPLOYMENT
    // =================================
    
    console.log("\n📦 Deploying mock Charm Alpha Vault Factory...");
    
    // Deploy mock factory
    const MockAlphaFactory = await ethers.getContractFactory("MockAlphaProVaultFactory");
    const alphaFactory = await MockAlphaFactory.deploy();
    await alphaFactory.waitForDeployment();
    console.log("✅ Mock Alpha Factory deployed to:", await alphaFactory.getAddress());

    // =================================
    // EAGLE OVAULT V2 DEPLOYMENT
    // =================================
    
    console.log("\n📦 Deploying EagleOVault V2...");
    
    const EagleOVaultV2 = await ethers.getContractFactory("EagleOVaultV2");
    const eagleVault = await EagleOVaultV2.deploy(
        await wlfiToken.getAddress(),
        await usd1Token.getAddress(),
        deployer.address
    );
    await eagleVault.waitForDeployment();
    console.log("✅ EagleOVault V2 deployed to:", await eagleVault.getAddress());

    // =================================
    // CHARM STRATEGY DEPLOYMENT
    // =================================
    
    console.log("\n📦 Deploying Charm Alpha Vault Strategy...");
    
    const CharmStrategy = await ethers.getContractFactory("CharmAlphaVaultStrategy");
    const charmStrategy = await CharmStrategy.deploy(
        await eagleVault.getAddress(),
        await alphaFactory.getAddress(),
        await wlfiToken.getAddress(),
        await usd1Token.getAddress(),
        deployer.address
    );
    await charmStrategy.waitForDeployment();
    console.log("✅ Charm Strategy deployed to:", await charmStrategy.getAddress());

    // =================================
    // INITIALIZATION
    // =================================
    
    console.log("\n⚙️  Initializing integration...");
    
    // Initialize the Charm strategy vault
    const initTx = await charmStrategy.initializeVault(ethers.parseEther("1000000")); // 1M max supply
    await initTx.wait();
    console.log("✅ Charm strategy initialized");
    
    // Add strategy to EagleOVault with 50% allocation
    const addStrategyTx = await eagleVault.addStrategy(await charmStrategy.getAddress(), 5000); // 50%
    await addStrategyTx.wait();
    console.log("✅ Strategy added to vault with 50% allocation");

    console.log("✅ Integration deployed successfully!");
    
    // =================================
    // DEPLOYMENT SUMMARY
    // =================================
    
    console.log("\n📋 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`WLFI Token:           ${await wlfiToken.getAddress()}`);
    console.log(`USD1 Token:           ${await usd1Token.getAddress()}`);
    console.log(`Alpha Factory:        ${await alphaFactory.getAddress()}`);
    console.log(`EagleOVault V2:       ${await eagleVault.getAddress()}`);
    console.log(`Charm Strategy:       ${await charmStrategy.getAddress()}`);
    console.log("=".repeat(50));
    
    console.log("\n✨ Next Steps:");
    console.log("1. Verify contracts on Etherscan");
    console.log("2. Set up governance for strategy management");
    console.log("3. Deploy LayerZero OFT adapters");
    console.log("4. Initialize cross-chain composer");
    console.log("5. Run full integration tests");

    // Return deployed addresses for testing
    return {
        wlfiToken: await wlfiToken.getAddress(),
        usd1Token: await usd1Token.getAddress(),
        alphaFactory: await alphaFactory.getAddress(),
        eagleVault: await eagleVault.getAddress(),
        charmStrategy: await charmStrategy.getAddress()
    };
}

// Handle script execution
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exit(1);
        });
}

export { main as deployCharmIntegration };
