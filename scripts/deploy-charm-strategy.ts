import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    wlfiToken: process.env.WLFI_ETHEREUM!,
    usd1Token: '0x43506849D7C04F9138D1A2050bbF3A0c054402dd', // USD1 on Ethereum
    lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
};

// Charm Finance addresses (we'll use mock for now)
const CHARM_CONTRACTS = {
    alphaFactory: '0x0000000000000000000000000000000000000000', // Mock for now
    wlfiUsd1Pool: '0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d' // Uniswap V3 1% fee pool
};

async function deployCharmStrategy() {
    console.log("🎯 DEPLOYING CHARM ALPHA VAULT STRATEGY");
    console.log("======================================");
    console.log("Integrating Eagle Vault with Charm Finance Alpha Vaults\n");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏛️ Eagle Vault: ${ETHEREUM_CONTRACTS.vault}`);
    console.log(`🪙 WLFI Token: ${ETHEREUM_CONTRACTS.wlfiToken}`);
    console.log(`💵 USD1 Token: ${ETHEREUM_CONTRACTS.usd1Token}`);
    console.log(`🏊 WLFI/USD1 Pool: ${CHARM_CONTRACTS.wlfiUsd1Pool}`);
    
    if (balance < ethers.parseEther("0.008")) {
        console.log("❌ Insufficient ETH - need at least 0.008 ETH");
        return null;
    }
    
    try {
        // Conservative gas settings
        const gasSettings = {
            maxFeePerGas: ethers.parseUnits("3", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("0.2", "gwei"),
            gasLimit: 2500000
        };
        
        console.log("⚙️  Conservative gas settings:");
        console.log(`   Max Fee: 3 gwei`);
        console.log(`   Priority: 0.2 gwei`);
        console.log(`   Limit: 2.5M gas`);
        
        // Deploy CharmAlphaVaultStrategy
        console.log("\n1️⃣  Deploying CharmAlphaVaultStrategy...");
        const CharmAlphaVaultStrategy = await ethers.getContractFactory("CharmAlphaVaultStrategy");
        const charmStrategy = await CharmAlphaVaultStrategy.deploy(
            ETHEREUM_CONTRACTS.vault,         // Eagle Vault
            CHARM_CONTRACTS.alphaFactory,     // Charm Alpha Factory (mock for now)
            ETHEREUM_CONTRACTS.wlfiToken,     // WLFI token
            ETHEREUM_CONTRACTS.usd1Token,     // USD1 token  
            deployer.address,                 // Owner
            gasSettings
        );
        
        console.log("⏳ Waiting for CharmAlphaVaultStrategy deployment...");
        await charmStrategy.waitForDeployment();
        const strategyAddress = await charmStrategy.getAddress();
        console.log(`✅ CharmAlphaVaultStrategy: ${strategyAddress}`);
        
        // Verify deployment
        console.log("\n🔍 Verifying strategy deployment...");
        const strategy = await ethers.getContractAt("CharmAlphaVaultStrategy", strategyAddress);
        
        const eagleVault = await strategy.EAGLE_VAULT();
        const wlfiToken = await strategy.WLFI_TOKEN();
        const usd1Token = await strategy.USD1_TOKEN();
        const isActive = await strategy.active();
        
        console.log(`Eagle Vault: ${eagleVault} ${eagleVault === ETHEREUM_CONTRACTS.vault ? '✅' : '❌'}`);
        console.log(`WLFI Token:  ${wlfiToken} ${wlfiToken === ETHEREUM_CONTRACTS.wlfiToken ? '✅' : '❌'}`);
        console.log(`USD1 Token:  ${usd1Token} ${usd1Token === ETHEREUM_CONTRACTS.usd1Token ? '✅' : '❌'}`);
        console.log(`Active:      ${isActive ? '✅' : '⏳ (needs activation)'}`);
        
        // Check remaining balance
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const spent = balance - finalBalance;
        console.log(`\n💸 Gas Spent: ${ethers.formatEther(spent)} ETH`);
        console.log(`💰 Remaining: ${ethers.formatEther(finalBalance)} ETH`);
        
        console.log("\n🎊 CHARM STRATEGY DEPLOYED!");
        console.log("===========================");
        console.log(`✅ Strategy Address: ${strategyAddress}`);
        console.log(`🔗 Etherscan: https://etherscan.io/address/${strategyAddress}`);
        
        console.log("\n📋 STRATEGY FEATURES:");
        console.log("====================");
        console.log("✅ Integrates with Eagle Vault V2");
        console.log("✅ Manages WLFI/USD1 liquidity positions");
        console.log("✅ Automated rebalancing & fee collection");
        console.log("✅ Slippage protection built-in");
        console.log("✅ Omnichain compatible (via Eagle Vault)");
        
        console.log("\n🔄 READY FOR STEP 3: Configure Vault Strategy");
        
        return {
            strategyAddress,
            eagleVault: ETHEREUM_CONTRACTS.vault,
            wlfiToken: ETHEREUM_CONTRACTS.wlfiToken,
            usd1Token: ETHEREUM_CONTRACTS.usd1Token
        };
        
    } catch (error: any) {
        console.error(`❌ Strategy deployment failed: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
            console.log("💡 Need more ETH for deployment");
        } else if (error.message.includes('constructor')) {
            console.log("💡 Constructor parameter issue - check token addresses");
        }
        
        return null;
    }
}

async function main() {
    const result = await deployCharmStrategy();
    
    if (result) {
        console.log("\n🎯 STEP 2 COMPLETE!");
        console.log("==================");
        console.log("✅ CharmAlphaVaultStrategy deployed successfully");
        console.log("🔄 Ready for vault configuration");
        console.log("🎯 Next: Configure Eagle Vault to use Charm strategy");
        console.log("");
        console.log("Configuration details:");
        console.log(`Strategy: ${result.strategyAddress}`);
        console.log(`Vault:    ${result.eagleVault}`);
    } else {
        console.log("\n❌ STRATEGY DEPLOYMENT FAILED");
        console.log("Check errors above and retry with fixes");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deployCharmStrategy };
