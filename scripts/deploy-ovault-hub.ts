import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// Existing contracts
const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0', // Existing EagleOVaultV2
    wlfiToken: process.env.ETHEREUM_WLFI_ADDRESS!, // Underlying WLFI token
    lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function deployOVaultHub() {
    console.log("🏗️  DEPLOYING LAYERZERO OVAULT HUB (ETHEREUM)");
    console.log("===============================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`🏛️ Existing Vault: ${ETHEREUM_CONTRACTS.vault}`);
    console.log(`🪙 WLFI Token: ${ETHEREUM_CONTRACTS.wlfiToken}`);
    console.log(`📡 LZ Endpoint: ${ETHEREUM_CONTRACTS.lzEndpoint}`);
    
    if (balance < ethers.parseEther("0.02")) {
        console.log("❌ Insufficient ETH for OVault hub deployment");
        console.log("💡 Need at least 0.02 ETH for gas fees");
        return;
    }
    
    const deployedContracts: any = {};
    
    try {
        // Step 1: Deploy WLFI Asset OFT (hub side)
        console.log("\n1️⃣  Deploying WLFI Asset OFT (Hub)...");
        const WLFIAssetOFT = await ethers.getContractFactory("WLFIAssetOFT");
        const wlfiAssetOFT = await WLFIAssetOFT.deploy(
            "WLFI Asset OFT",
            "WLFI",
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 3000000
            }
        );
        await wlfiAssetOFT.waitForDeployment();
        deployedContracts.wlfiAssetOFT = await wlfiAssetOFT.getAddress();
        console.log(`✅ WLFI Asset OFT: ${deployedContracts.wlfiAssetOFT}`);
        
        // Step 2: Deploy Share OFT Adapter
        console.log("\n2️⃣  Deploying Share OFT Adapter...");
        const ShareOFTAdapter = await ethers.getContractFactory("EagleShareOFTAdapter");
        const shareOFTAdapter = await ShareOFTAdapter.deploy(
            ETHEREUM_CONTRACTS.vault, // Wrap the vault shares
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 3000000
            }
        );
        await shareOFTAdapter.waitForDeployment();
        deployedContracts.shareOFTAdapter = await shareOFTAdapter.getAddress();
        console.log(`✅ Share OFT Adapter: ${deployedContracts.shareOFTAdapter}`);
        
        // Step 3: Deploy VaultComposerSync
        console.log("\n3️⃣  Deploying VaultComposerSync...");
        const VaultComposerSync = await ethers.getContractFactory("EagleVaultComposerSync");
        const vaultComposer = await VaultComposerSync.deploy(
            ETHEREUM_CONTRACTS.vault,
            ETHEREUM_CONTRACTS.wlfiToken, // Underlying asset
            deployedContracts.shareOFTAdapter,
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 4000000
            }
        );
        await vaultComposer.waitForDeployment();
        deployedContracts.vaultComposer = await vaultComposer.getAddress();
        console.log(`✅ VaultComposerSync: ${deployedContracts.vaultComposer}`);
        
        // Step 4: Configure trusted OApp
        console.log("\n4️⃣  Configuring VaultComposer...");
        const composer = await ethers.getContractAt("EagleVaultComposerSync", deployedContracts.vaultComposer);
        
        // Set WLFI Asset OFT as trusted OApp
        const setTrustedTx = await composer.setTrustedOApp(
            deployedContracts.wlfiAssetOFT,
            true,
            {
                maxFeePerGas: ethers.parseUnits("12", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                gasLimit: 150000
            }
        );
        await setTrustedTx.wait();
        console.log(`✅ WLFI Asset OFT set as trusted OApp`);
        
        console.log("\n🎊 OVAULT HUB DEPLOYMENT COMPLETE!");
        console.log("==================================");
        console.log("Deployed Contracts:");
        console.log(`WLFI Asset OFT: ${deployedContracts.wlfiAssetOFT}`);
        console.log(`Share OFT Adapter: ${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync: ${deployedContracts.vaultComposer}`);
        
        console.log("\nExisting Contracts:");
        console.log(`EagleOVaultV2: ${ETHEREUM_CONTRACTS.vault}`);
        console.log(`WLFI Token: ${ETHEREUM_CONTRACTS.wlfiToken}`);
        
        console.log("\nEtherscan Links:");
        console.log(`WLFI Asset OFT: https://etherscan.io/address/${deployedContracts.wlfiAssetOFT}`);
        console.log(`Share OFT Adapter: https://etherscan.io/address/${deployedContracts.shareOFTAdapter}`);
        console.log(`VaultComposerSync: https://etherscan.io/address/${deployedContracts.vaultComposer}`);
        
        console.log("\n📋 NEXT STEPS:");
        console.log("==============");
        console.log("1. Deploy spoke chain contracts (BSC)");
        console.log("2. Configure peer connections");
        console.log("3. Set enforced options");
        console.log("4. Test omnichain deposits");
        
        // Save deployment addresses
        const deploymentData = {
            network: 'ethereum',
            chainId: 1,
            contracts: deployedContracts,
            existing: ETHEREUM_CONTRACTS,
            timestamp: new Date().toISOString()
        };
        
        console.log("\n💾 Deployment data:");
        console.log(JSON.stringify(deploymentData, null, 2));
        
        return deployedContracts;
        
    } catch (error: any) {
        console.error(`❌ Hub deployment failed: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
            console.log("💡 Need more ETH for deployment");
        } else if (error.message.includes('constructor')) {
            console.log("💡 Constructor parameter issue - check contract addresses");
        }
        
        return null;
    }
}

async function main() {
    const result = await deployOVaultHub();
    
    if (result) {
        console.log("\n🚀 Ready to deploy spoke chain contracts!");
        console.log("Run: npx hardhat run scripts/deploy-ovault-spoke.ts --network bsc");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deployOVaultHub };
