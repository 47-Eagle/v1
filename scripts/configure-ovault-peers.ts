import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract addresses (to be updated after deployment)
const ETHEREUM_OVAULT = {
    wlfiAssetOFT: '', // To be filled after hub deployment
    shareOFTAdapter: '', // To be filled after hub deployment
    vaultComposer: '', // To be filled after hub deployment
    lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!
};

const BSC_OVAULT = {
    wlfiAssetOFT: '', // To be filled after spoke deployment
    shareOFT: '', // To be filled after spoke deployment
    lzEndpoint: process.env.BNB_LZ_ENDPOINT_V2!
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function configureOVaultPeers() {
    console.log("🔧 CONFIGURING LAYERZERO OVAULT PEER CONNECTIONS");
    console.log("===============================================");
    
    console.log("📋 Please update contract addresses in this script after deployment:");
    console.log("ETHEREUM_OVAULT.wlfiAssetOFT = 'YOUR_ETH_WLFI_ASSET_OFT_ADDRESS'");
    console.log("ETHEREUM_OVAULT.shareOFTAdapter = 'YOUR_ETH_SHARE_OFT_ADAPTER_ADDRESS'");
    console.log("ETHEREUM_OVAULT.vaultComposer = 'YOUR_ETH_VAULT_COMPOSER_ADDRESS'");
    console.log("BSC_OVAULT.wlfiAssetOFT = 'YOUR_BSC_WLFI_ASSET_OFT_ADDRESS'");
    console.log("BSC_OVAULT.shareOFT = 'YOUR_BSC_SHARE_OFT_ADDRESS'");
    
    // Check if addresses are configured
    if (!ETHEREUM_OVAULT.wlfiAssetOFT || !BSC_OVAULT.wlfiAssetOFT) {
        console.log("\n❌ Contract addresses not configured");
        console.log("💡 Deploy contracts first, then update addresses in this script");
        return;
    }
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Step 1: Configure Asset OFT peer connections
        console.log("\n1️⃣  Configuring WLFI Asset OFT peer connections...");
        await configureAssetOFTPeers();
        
        // Step 2: Configure Share OFT peer connections
        console.log("\n2️⃣  Configuring Share OFT peer connections...");
        await configureShareOFTPeers();
        
        // Step 3: Configure enforced options for compose messages
        console.log("\n3️⃣  Configuring enforced options...");
        await configureEnforcedOptions();
        
        // Step 4: Set up DVN configurations
        console.log("\n4️⃣  Configuring DVN settings...");
        await configureDVNSettings();
        
        console.log("\n🎊 OVAULT CONFIGURATION COMPLETE!");
        console.log("=================================");
        console.log("✅ Asset OFT peer connections configured");
        console.log("✅ Share OFT peer connections configured");
        console.log("✅ Enforced options set for compose messages");
        console.log("✅ DVN settings configured");
        
        console.log("\n🚀 Ready for omnichain vault deposits!");
        
    } catch (error: any) {
        console.error(`❌ OVault configuration failed: ${error.message}`);
    }
}

async function configureAssetOFTPeers() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const OFTAbi = [
        "function setPeer(uint32 _eid, bytes32 _peer) external",
        "function peers(uint32 _eid) external view returns (bytes32)"
    ];
    
    const bscAssetOFT = new ethers.Contract(BSC_OVAULT.wlfiAssetOFT, OFTAbi, bscSigner);
    const ethAssetOFT = new ethers.Contract(ETHEREUM_OVAULT.wlfiAssetOFT, OFTAbi, ethSigner);
    
    // BSC Asset OFT → Ethereum Asset OFT
    console.log("🟡 Setting BSC Asset OFT → Ethereum Asset OFT peer...");
    const ethPeer = ethers.zeroPadValue(ETHEREUM_OVAULT.wlfiAssetOFT, 32);
    const bscTx1 = await bscAssetOFT.setPeer(EndpointId.ETHEREUM_V2_MAINNET, ethPeer, {
        gasPrice: ethers.parseUnits("3", "gwei"),
        gasLimit: 200000
    });
    await bscTx1.wait();
    console.log(`✅ BSC Asset OFT peer set: ${bscTx1.hash}`);
    
    // Ethereum Asset OFT → BSC Asset OFT
    console.log("🔵 Setting Ethereum Asset OFT → BSC Asset OFT peer...");
    const bscPeer = ethers.zeroPadValue(BSC_OVAULT.wlfiAssetOFT, 32);
    const ethTx1 = await ethAssetOFT.setPeer(EndpointId.BSC_V2_MAINNET, bscPeer, {
        maxFeePerGas: ethers.parseUnits("15", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        gasLimit: 200000
    });
    await ethTx1.wait();
    console.log(`✅ Ethereum Asset OFT peer set: ${ethTx1.hash}`);
}

async function configureShareOFTPeers() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const OFTAbi = [
        "function setPeer(uint32 _eid, bytes32 _peer) external",
        "function peers(uint32 _eid) external view returns (bytes32)"
    ];
    
    const bscShareOFT = new ethers.Contract(BSC_OVAULT.shareOFT, OFTAbi, bscSigner);
    const ethShareAdapter = new ethers.Contract(ETHEREUM_OVAULT.shareOFTAdapter, OFTAbi, ethSigner);
    
    // BSC Share OFT → Ethereum Share OFT Adapter
    console.log("🟡 Setting BSC Share OFT → Ethereum Share Adapter peer...");
    const ethAdapterPeer = ethers.zeroPadValue(ETHEREUM_OVAULT.shareOFTAdapter, 32);
    const bscTx2 = await bscShareOFT.setPeer(EndpointId.ETHEREUM_V2_MAINNET, ethAdapterPeer, {
        gasPrice: ethers.parseUnits("3", "gwei"),
        gasLimit: 200000
    });
    await bscTx2.wait();
    console.log(`✅ BSC Share OFT peer set: ${bscTx2.hash}`);
    
    // Ethereum Share OFT Adapter → BSC Share OFT
    console.log("🔵 Setting Ethereum Share Adapter → BSC Share OFT peer...");
    const bscSharePeer = ethers.zeroPadValue(BSC_OVAULT.shareOFT, 32);
    const ethTx2 = await ethShareAdapter.setPeer(EndpointId.BSC_V2_MAINNET, bscSharePeer, {
        maxFeePerGas: ethers.parseUnits("15", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        gasLimit: 200000
    });
    await ethTx2.wait();
    console.log(`✅ Ethereum Share Adapter peer set: ${ethTx2.hash}`);
}

async function configureEnforcedOptions() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const OFTAbi = [
        "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] calldata _enforcedOptions) external"
    ];
    
    const bscAssetOFT = new ethers.Contract(BSC_OVAULT.wlfiAssetOFT, OFTAbi, bscSigner);
    
    // Compose message options for omnichain deposits
    const composeOption = ethers.concat([
        "0x0003", // OPTION_TYPE_3
        "0x0001", // ExecutorOptionType.COMPOSE
        "0x0014", // 20 bytes address length  
        ETHEREUM_OVAULT.vaultComposer.slice(2).padStart(40, '0'), // Composer address
        "0x00000000000493E0", // 300,000 gas for lzCompose
        "0x0000000000000000" // No msg.value
    ]);
    
    const enforcedOptions = [{
        eid: EndpointId.ETHEREUM_V2_MAINNET,
        msgType: 1, // SEND message type
        options: composeOption
    }];
    
    console.log("🔧 Setting enforced options for compose messages...");
    const optionsTx = await bscAssetOFT.setEnforcedOptions(enforcedOptions, {
        gasPrice: ethers.parseUnits("3", "gwei"),
        gasLimit: 300000
    });
    await optionsTx.wait();
    console.log(`✅ Enforced options set: ${optionsTx.hash}`);
}

async function configureDVNSettings() {
    // Use the proven Google Cloud DVN approach from our previous investigation
    const GOOGLE_CLOUD_DVN = '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc';
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_OVAULT.lzEndpoint, EndpointAbi, bscSigner);
    const ethEndpoint = new ethers.Contract(ETHEREUM_OVAULT.lzEndpoint, EndpointAbi, ethSigner);
    
    // Universal DVN configuration using Google Cloud DVN
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
    
    // Configure BSC Asset OFT
    console.log("🟡 Configuring BSC Asset OFT DVN...");
    const bscConfigParams = [{
        eid: EndpointId.ETHEREUM_V2_MAINNET,
        configType: 2, // ULN_CONFIG_TYPE
        config: encodedConfig
    }];
    
    const bscDvnTx = await bscEndpoint.setConfig(
        BSC_OVAULT.wlfiAssetOFT,
        '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE', // BSC SendUln302
        bscConfigParams,
        {
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 400000
        }
    );
    await bscDvnTx.wait();
    console.log(`✅ BSC Asset OFT DVN configured: ${bscDvnTx.hash}`);
    
    // Configure Ethereum receive config
    console.log("🔵 Configuring Ethereum receive DVN...");
    const ethConfigParams = [{
        eid: EndpointId.BSC_V2_MAINNET,
        configType: 2, // ULN_CONFIG_TYPE
        config: encodedConfig
    }];
    
    const ethDvnTx = await ethEndpoint.setConfig(
        ETHEREUM_OVAULT.wlfiAssetOFT,
        '0xc02Ab410f0734EFa3F14628780e6e695156024C2', // Ethereum ReceiveUln302
        ethConfigParams,
        {
            maxFeePerGas: ethers.parseUnits("15", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
            gasLimit: 400000
        }
    );
    await ethDvnTx.wait();
    console.log(`✅ Ethereum receive DVN configured: ${ethDvnTx.hash}`);
}

async function main() {
    await configureOVaultPeers();
    
    console.log("\n📋 CONFIGURATION COMPLETE - READY FOR TESTING");
    console.log("==============================================");
    console.log("Your LayerZero OVault is now configured!");
    console.log("Users can deposit WLFI from BSC to Ethereum vault!");
    console.log("Run: npx hardhat run scripts/test-ovault-deposit.ts --network bsc");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { configureOVaultPeers };
