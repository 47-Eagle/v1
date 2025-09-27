import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function deployCompleteOVault() {
    console.log("🚀 DEPLOYING COMPLETE LAYERZERO OVAULT SYSTEM");
    console.log("==============================================");
    console.log("This will deploy the full 5-contract OVault architecture:");
    console.log("1. WLFI Asset OFT (Hub & Spoke)");
    console.log("2. Share OFT Adapter (Hub)");
    console.log("3. VaultComposerSync (Hub)");
    console.log("4. Share OFT (Spoke)");
    console.log("5. Configure all peer connections\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const deploymentResults: any = {
        ethereum: {},
        bsc: {}
    };
    
    try {
        // Step 1: Deploy Ethereum (Hub) contracts
        console.log("🏗️  STEP 1: Deploying Ethereum Hub Contracts");
        console.log("===========================================");
        
        const ethContracts = await deployEthereumHub();
        if (!ethContracts) {
            throw new Error("Ethereum hub deployment failed");
        }
        deploymentResults.ethereum = ethContracts;
        console.log("✅ Ethereum hub contracts deployed successfully");
        
        // Wait between deployments
        console.log("⏳ Waiting 30 seconds before BSC deployment...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Step 2: Deploy BSC (Spoke) contracts  
        console.log("\n🏗️  STEP 2: Deploying BSC Spoke Contracts");
        console.log("========================================");
        
        const bscContracts = await deployBSCSpoke();
        if (!bscContracts) {
            throw new Error("BSC spoke deployment failed");
        }
        deploymentResults.bsc = bscContracts;
        console.log("✅ BSC spoke contracts deployed successfully");
        
        // Step 3: Configure peer connections
        console.log("\n🔧 STEP 3: Configuring Peer Connections");
        console.log("======================================");
        
        const configSuccess = await configurePeerConnections(deploymentResults);
        if (!configSuccess) {
            throw new Error("Peer configuration failed");
        }
        console.log("✅ Peer connections configured successfully");
        
        // Step 4: Set up DVN configurations
        console.log("\n🔧 STEP 4: Configuring DVN Settings");
        console.log("==================================");
        
        const dvnSuccess = await configureDVNForOVault(deploymentResults);
        if (!dvnSuccess) {
            throw new Error("DVN configuration failed");
        }
        console.log("✅ DVN settings configured successfully");
        
        console.log("\n🎊 COMPLETE OVAULT DEPLOYMENT SUCCESSFUL!");
        console.log("=========================================");
        
        // Display all deployed contracts
        displayDeploymentSummary(deploymentResults);
        
        // Generate ready-to-use test command
        generateTestCommand(deploymentResults);
        
        return deploymentResults;
        
    } catch (error: any) {
        console.error(`❌ Complete OVault deployment failed: ${error.message}`);
        
        if (Object.keys(deploymentResults.ethereum).length > 0) {
            console.log("\n🔍 Partial deployment completed:");
            console.log("Ethereum contracts:", deploymentResults.ethereum);
        }
        
        if (Object.keys(deploymentResults.bsc).length > 0) {
            console.log("BSC contracts:", deploymentResults.bsc);
        }
        
        return null;
    }
}

async function deployEthereumHub() {
    const ETHEREUM_CONTRACTS = {
        vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
        wlfiToken: process.env.ETHEREUM_WLFI_ADDRESS!,
        lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
    };
    
    const [deployer] = await ethers.getSigners();
    
    try {
        const contracts: any = {};
        
        // Deploy WLFI Asset OFT
        console.log("🔵 Deploying WLFI Asset OFT (Ethereum)...");
        const WLFIOVaultAssetOFT = await ethers.getContractFactory("WLFIOVaultAssetOFT");
        const wlfiAssetOFT = await WLFIOVaultAssetOFT.deploy(
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
        contracts.wlfiAssetOFT = await wlfiAssetOFT.getAddress();
        console.log(`✅ WLFI Asset OFT: ${contracts.wlfiAssetOFT}`);
        
        // Deploy Share OFT Adapter
        console.log("🔵 Deploying Share OFT Adapter...");
        const ShareOFTAdapter = await ethers.getContractFactory("EagleShareOFTAdapter");
        const shareOFTAdapter = await ShareOFTAdapter.deploy(
            ETHEREUM_CONTRACTS.vault,
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 3000000
            }
        );
        await shareOFTAdapter.waitForDeployment();
        contracts.shareOFTAdapter = await shareOFTAdapter.getAddress();
        console.log(`✅ Share OFT Adapter: ${contracts.shareOFTAdapter}`);
        
        // Deploy VaultComposerSync
        console.log("🔵 Deploying VaultComposerSync...");
        const VaultComposerSync = await ethers.getContractFactory("EagleVaultComposerSync");
        const vaultComposer = await VaultComposerSync.deploy(
            ETHEREUM_CONTRACTS.vault,
            ETHEREUM_CONTRACTS.wlfiToken,
            contracts.shareOFTAdapter,
            ETHEREUM_CONTRACTS.lzEndpoint,
            deployer.address,
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 4000000
            }
        );
        await vaultComposer.waitForDeployment();
        contracts.vaultComposer = await vaultComposer.getAddress();
        console.log(`✅ VaultComposerSync: ${contracts.vaultComposer}`);
        
        // Configure VaultComposer
        console.log("🔧 Configuring VaultComposer...");
        const composer = await ethers.getContractAt("EagleVaultComposerSync", contracts.vaultComposer);
        const setTrustedTx = await composer.setTrustedOApp(contracts.wlfiAssetOFT, true, {
            maxFeePerGas: ethers.parseUnits("12", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 150000
        });
        await setTrustedTx.wait();
        console.log("✅ VaultComposer configured");
        
        return contracts;
        
    } catch (error: any) {
        console.error(`❌ Ethereum hub deployment failed: ${error.message}`);
        return null;
    }
}

async function deployBSCSpoke() {
    // Switch to BSC network for this deployment
    const BSC_CONTRACTS = {
        wlfiToken: process.env.BSC_WLFI_ADDRESS!,
        lzEndpoint: process.env.BNB_LZ_ENDPOINT_V2!
    };
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    try {
        const contracts: any = {};
        
        // Deploy WLFI Asset OFT
        console.log("🟡 Deploying WLFI Asset OFT (BSC)...");
        const WLFIOVaultAssetOFT = await ethers.getContractFactory("WLFIOVaultAssetOFT");
        const wlfiAssetOFT = await WLFIOVaultAssetOFT.connect(bscSigner).deploy(
            "WLFI Asset OFT",
            "WLFI",
            BSC_CONTRACTS.lzEndpoint,
            bscSigner.address,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 3000000
            }
        );
        await wlfiAssetOFT.waitForDeployment();
        contracts.wlfiAssetOFT = await wlfiAssetOFT.getAddress();
        console.log(`✅ WLFI Asset OFT: ${contracts.wlfiAssetOFT}`);
        
        // Deploy Share OFT
        console.log("🟡 Deploying Share OFT (BSC)...");
        const ShareOFT = await ethers.getContractFactory("EagleShareOFT");
        const shareOFT = await ShareOFT.connect(bscSigner).deploy(
            "Eagle Vault Shares",
            "eVault",
            BSC_CONTRACTS.lzEndpoint,
            bscSigner.address,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 3000000
            }
        );
        await shareOFT.waitForDeployment();
        contracts.shareOFT = await shareOFT.getAddress();
        console.log(`✅ Share OFT: ${contracts.shareOFT}`);
        
        return contracts;
        
    } catch (error: any) {
        console.error(`❌ BSC spoke deployment failed: ${error.message}`);
        return null;
    }
}

async function configurePeerConnections(deploymentResults: any) {
    const EndpointId = {
        BSC_V2_MAINNET: 30102,
        ETHEREUM_V2_MAINNET: 30101
    };
    
    try {
        const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
        const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
        const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
        const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
        
        const OFTAbi = ["function setPeer(uint32 _eid, bytes32 _peer) external"];
        
        // Configure Asset OFT peers
        console.log("🔗 Configuring Asset OFT peer connections...");
        
        const bscAssetOFT = new ethers.Contract(deploymentResults.bsc.wlfiAssetOFT, OFTAbi, bscSigner);
        const ethAssetOFT = new ethers.Contract(deploymentResults.ethereum.wlfiAssetOFT, OFTAbi, ethSigner);
        
        // BSC → Ethereum
        const ethPeer = ethers.zeroPadValue(deploymentResults.ethereum.wlfiAssetOFT, 32);
        const bscTx1 = await bscAssetOFT.setPeer(EndpointId.ETHEREUM_V2_MAINNET, ethPeer, {
            gasPrice: ethers.parseUnits("3", "gwei"), gasLimit: 200000
        });
        await bscTx1.wait();
        
        // Ethereum → BSC
        const bscPeer = ethers.zeroPadValue(deploymentResults.bsc.wlfiAssetOFT, 32);
        const ethTx1 = await ethAssetOFT.setPeer(EndpointId.BSC_V2_MAINNET, bscPeer, {
            maxFeePerGas: ethers.parseUnits("15", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
            gasLimit: 200000
        });
        await ethTx1.wait();
        console.log("✅ Asset OFT peers configured");
        
        // Configure Share OFT peers
        console.log("🔗 Configuring Share OFT peer connections...");
        
        const bscShareOFT = new ethers.Contract(deploymentResults.bsc.shareOFT, OFTAbi, bscSigner);
        const ethShareAdapter = new ethers.Contract(deploymentResults.ethereum.shareOFTAdapter, OFTAbi, ethSigner);
        
        // BSC Share OFT → Ethereum Share Adapter
        const ethAdapterPeer = ethers.zeroPadValue(deploymentResults.ethereum.shareOFTAdapter, 32);
        const bscTx2 = await bscShareOFT.setPeer(EndpointId.ETHEREUM_V2_MAINNET, ethAdapterPeer, {
            gasPrice: ethers.parseUnits("3", "gwei"), gasLimit: 200000
        });
        await bscTx2.wait();
        
        // Ethereum Share Adapter → BSC Share OFT
        const bscSharePeer = ethers.zeroPadValue(deploymentResults.bsc.shareOFT, 32);
        const ethTx2 = await ethShareAdapter.setPeer(EndpointId.BSC_V2_MAINNET, bscSharePeer, {
            maxFeePerGas: ethers.parseUnits("15", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
            gasLimit: 200000
        });
        await ethTx2.wait();
        console.log("✅ Share OFT peers configured");
        
        return true;
        
    } catch (error: any) {
        console.error(`❌ Peer configuration failed: ${error.message}`);
        return false;
    }
}

async function configureDVNForOVault(deploymentResults: any) {
    try {
        // Use Google Cloud DVN for universal compatibility
        const GOOGLE_CLOUD_DVN = '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc';
        
        const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
        const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
        const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
        const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
        
        const EndpointAbi = [
            "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external"
        ];
        
        const bscEndpoint = new ethers.Contract(process.env.BNB_LZ_ENDPOINT_V2!, EndpointAbi, bscSigner);
        const ethEndpoint = new ethers.Contract(process.env.ETHEREUM_LZ_ENDPOINT_V2!, EndpointAbi, ethSigner);
        
        // DVN configuration
        const dvnConfig = {
            confirmations: 10,
            requiredDVNCount: 1,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [GOOGLE_CLOUD_DVN],
            optionalDVNs: []
        };
        
        const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
        const encodedConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [dvnConfig]);
        
        console.log("🔧 Configuring DVN on BSC...");
        const bscConfigParams = [{
            eid: 30101, // Ethereum
            configType: 2, // ULN_CONFIG_TYPE
            config: encodedConfig
        }];
        
        const bscDvnTx = await bscEndpoint.setConfig(
            deploymentResults.bsc.wlfiAssetOFT,
            '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE', // BSC SendUln302
            bscConfigParams,
            { gasPrice: ethers.parseUnits("3", "gwei"), gasLimit: 400000 }
        );
        await bscDvnTx.wait();
        console.log("✅ BSC DVN configured");
        
        console.log("🔧 Configuring DVN on Ethereum...");
        const ethConfigParams = [{
            eid: 30102, // BSC
            configType: 2, // ULN_CONFIG_TYPE
            config: encodedConfig
        }];
        
        const ethDvnTx = await ethEndpoint.setConfig(
            deploymentResults.ethereum.wlfiAssetOFT,
            '0xc02Ab410f0734EFa3F14628780e6e695156024C2', // Ethereum ReceiveUln302
            ethConfigParams,
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 400000
            }
        );
        await ethDvnTx.wait();
        console.log("✅ Ethereum DVN configured");
        
        return true;
        
    } catch (error: any) {
        console.error(`❌ DVN configuration failed: ${error.message}`);
        return false;
    }
}

function displayDeploymentSummary(deploymentResults: any) {
    console.log("\n📋 DEPLOYMENT SUMMARY");
    console.log("====================");
    
    console.log("\n🔵 ETHEREUM (HUB):");
    console.log(`WLFI Asset OFT:    ${deploymentResults.ethereum.wlfiAssetOFT}`);
    console.log(`Share OFT Adapter: ${deploymentResults.ethereum.shareOFTAdapter}`);
    console.log(`VaultComposerSync: ${deploymentResults.ethereum.vaultComposer}`);
    
    console.log("\n🟡 BSC (SPOKE):");
    console.log(`WLFI Asset OFT: ${deploymentResults.bsc.wlfiAssetOFT}`);
    console.log(`Share OFT:      ${deploymentResults.bsc.shareOFT}`);
    
    console.log("\n🔗 ETHERSCAN LINKS:");
    console.log(`ETH WLFI Asset OFT: https://etherscan.io/address/${deploymentResults.ethereum.wlfiAssetOFT}`);
    console.log(`ETH Share Adapter:  https://etherscan.io/address/${deploymentResults.ethereum.shareOFTAdapter}`);
    console.log(`ETH Composer:       https://etherscan.io/address/${deploymentResults.ethereum.vaultComposer}`);
    
    console.log("\n🔗 BSCSCAN LINKS:");
    console.log(`BSC WLFI Asset OFT: https://bscscan.com/address/${deploymentResults.bsc.wlfiAssetOFT}`);
    console.log(`BSC Share OFT:      https://bscscan.com/address/${deploymentResults.bsc.shareOFT}`);
}

function generateTestCommand(deploymentResults: any) {
    console.log("\n🧪 READY FOR TESTING");
    console.log("====================");
    
    console.log("Update test-ovault-deposit.ts with these addresses:");
    console.log(`ETHEREUM_OVAULT.wlfiAssetOFT = "${deploymentResults.ethereum.wlfiAssetOFT}"`);
    console.log(`ETHEREUM_OVAULT.shareOFTAdapter = "${deploymentResults.ethereum.shareOFTAdapter}"`);
    console.log(`ETHEREUM_OVAULT.vaultComposer = "${deploymentResults.ethereum.vaultComposer}"`);
    console.log(`BSC_OVAULT.wlfiAssetOFT = "${deploymentResults.bsc.wlfiAssetOFT}"`);
    console.log(`BSC_OVAULT.shareOFT = "${deploymentResults.bsc.shareOFT}"`);
    
    console.log("\nThen run:");
    console.log("npx hardhat run scripts/test-ovault-deposit.ts --network bsc");
}

async function main() {
    const result = await deployCompleteOVault();
    
    if (result) {
        console.log("\n🎊 LAYERZERO OVAULT SYSTEM READY!");
        console.log("================================");
        console.log("✅ All contracts deployed");
        console.log("✅ Peer connections configured");
        console.log("✅ DVN settings applied");
        console.log("🚀 Ready for omnichain vault deposits!");
    } else {
        console.log("\n❌ DEPLOYMENT FAILED");
        console.log("Check error messages above for troubleshooting");
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deployCompleteOVault };
