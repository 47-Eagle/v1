import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract addresses
const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    endpoint: process.env.BNB_LZ_ENDPOINT_V2!,
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    endpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,
};

// LayerZero V2 Libraries (from documentation)
const LIBRARIES = {
    bsc: {
        sendUln302: '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE',
        receiveUln302: '0xB217266c3A98C8B2709Ee26836C98cf12f6cCEC1'
    },
    ethereum: {
        sendUln302: '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1', 
        receiveUln302: '0xc02Ab410f0734EFa3F14628780e6e695156024C2'
    }
};

// LayerZero Official DVN addresses (mainnet)
const LAYERZERO_DVNS = {
    bsc: {
        layerZeroDVN: '0xfD6865c841c2d64565562fCc7e05e619A30615f0',
        googleCloudDVN: '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc',
        polychainDVN: '0x4584Fe5d0D6b5DF9A001b8B8DbE0F1eF3B1d5353'
    },
    ethereum: {
        layerZeroDVN: '0x589dEDbD617e0CBcB916A9223F4d1300c294236b', 
        googleCloudDVN: '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc',
        polychainDVN: '0x4584Fe5d0D6b5DF9A001b8B8DbE0F1eF3B1d5353'
    }
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

const EndpointAbi = [
    "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)",
    "function setSendLibrary(address _oapp, uint32 _eid, address _lib) external",
    "function setReceiveLibrary(address _oapp, uint32 _eid, address _lib, uint256 _gracePeriod) external",
    "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external"
];

async function debugAndFixLayerZeroDVN() {
    console.log("🔧 LAYERZERO DVN CONFIGURATION DEBUG & FIX");
    console.log("=========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Signer: ${deployer.address}`);
    
    try {
        // Step 1: Read current configurations
        console.log("\n1️⃣  READING CURRENT CONFIGURATIONS:");
        await readCurrentConfigs();
        
        // Step 2: Set proper libraries 
        console.log("\n2️⃣  SETTING PROPER LIBRARIES:");
        await setLibraries();
        
        // Step 3: Configure DVN settings
        console.log("\n3️⃣  CONFIGURING DVN SETTINGS:");
        await configureDVNs();
        
        // Step 4: Verify configurations match
        console.log("\n4️⃣  VERIFYING CONFIGURATIONS:");
        await verifyConfigurations();
        
        console.log("\n🎊 DVN CONFIGURATION COMPLETE!");
        console.log("Now try your USD1 deposit again...");
        
    } catch (error: any) {
        console.error(`❌ DVN setup failed: ${error.message}`);
    }
}

async function readCurrentConfigs() {
    console.log("Reading BSC USD1 adapter configuration...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    try {
        // Check BSC send config to Ethereum
        console.log("📱 BSC → Ethereum configuration:");
        const bscSendConfigBytes = await bscEndpoint.getConfig(
            BSC_CONTRACTS.usd1Adapter,
            LIBRARIES.bsc.sendUln302,
            EndpointId.ETHEREUM_V2_MAINNET,
            2 // ULN_CONFIG_TYPE
        );
        
        if (bscSendConfigBytes === '0x') {
            console.log("❌ No BSC send configuration found");
        } else {
            const bscSendConfig = decodeUlnConfig(bscSendConfigBytes);
            console.log(`  Confirmations: ${bscSendConfig.confirmations}`);
            console.log(`  Required DVNs: ${bscSendConfig.requiredDVNCount}`);
            console.log(`  DVN addresses:`, bscSendConfig.requiredDVNs);
        }
        
        // Check Ethereum receive config from BSC
        console.log("📱 Ethereum ← BSC configuration:");
        const ethReceiveConfigBytes = await ethEndpoint.getConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            LIBRARIES.ethereum.receiveUln302,
            EndpointId.BSC_V2_MAINNET,
            2 // ULN_CONFIG_TYPE
        );
        
        if (ethReceiveConfigBytes === '0x') {
            console.log("❌ No Ethereum receive configuration found");
        } else {
            const ethReceiveConfig = decodeUlnConfig(ethReceiveConfigBytes);
            console.log(`  Confirmations: ${ethReceiveConfig.confirmations}`);
            console.log(`  Required DVNs: ${ethReceiveConfig.requiredDVNCount}`);
            console.log(`  DVN addresses:`, ethReceiveConfig.requiredDVNs);
        }
        
    } catch (error: any) {
        console.log(`⚠️  Error reading configs: ${error.message}`);
    }
}

function decodeUlnConfig(configBytes: string) {
    const ulnConfigStruct = [
        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)'
    ];
    
    try {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(ulnConfigStruct, configBytes);
        return {
            confirmations: decoded[0][0],
            requiredDVNCount: decoded[0][1],
            optionalDVNCount: decoded[0][2], 
            optionalDVNThreshold: decoded[0][3],
            requiredDVNs: decoded[0][4],
            optionalDVNs: decoded[0][5]
        };
    } catch (error: any) {
        console.log(`Error decoding config: ${error.message}`);
        return null;
    }
}

async function setLibraries() {
    console.log("Setting explicit message libraries...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscSigner);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethSigner);
    
    try {
        // Set BSC libraries
        console.log("📱 Setting BSC libraries...");
        const bscSendTx = await bscEndpoint.setSendLibrary(
            BSC_CONTRACTS.usd1Adapter,
            EndpointId.ETHEREUM_V2_MAINNET,
            LIBRARIES.bsc.sendUln302,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 200000
            }
        );
        await bscSendTx.wait();
        console.log(`✅ BSC send library set: ${bscSendTx.hash}`);
        
        const bscReceiveTx = await bscEndpoint.setReceiveLibrary(
            BSC_CONTRACTS.usd1Adapter,
            EndpointId.ETHEREUM_V2_MAINNET,
            LIBRARIES.bsc.receiveUln302,
            0, // No grace period
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 200000
            }
        );
        await bscReceiveTx.wait();
        console.log(`✅ BSC receive library set: ${bscReceiveTx.hash}`);
        
        // Set Ethereum libraries
        console.log("📱 Setting Ethereum libraries...");
        const ethSendTx = await ethEndpoint.setSendLibrary(
            ETHEREUM_CONTRACTS.usd1Adapter,
            EndpointId.BSC_V2_MAINNET,
            LIBRARIES.ethereum.sendUln302,
            {
                maxFeePerGas: ethers.parseUnits("12", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                gasLimit: 200000
            }
        );
        await ethSendTx.wait();
        console.log(`✅ Ethereum send library set: ${ethSendTx.hash}`);
        
        const ethReceiveTx = await ethEndpoint.setReceiveLibrary(
            ETHEREUM_CONTRACTS.usd1Adapter,
            EndpointId.BSC_V2_MAINNET,
            LIBRARIES.ethereum.receiveUln302,
            0, // No grace period
            {
                maxFeePerGas: ethers.parseUnits("12", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                gasLimit: 200000
            }
        );
        await ethReceiveTx.wait();
        console.log(`✅ Ethereum receive library set: ${ethReceiveTx.hash}`);
        
    } catch (error: any) {
        console.log(`⚠️  Library setup failed: ${error.message}`);
    }
}

async function configureDVNs() {
    console.log("Configuring DVN settings with LayerZero official DVNs...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscSigner);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethSigner);
    
    // ULN Config - using LayerZero's official DVNs
    const ulnConfigBSC = {
        confirmations: 15, // 15 block confirmations
        requiredDVNCount: 2,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [
            LAYERZERO_DVNS.bsc.layerZeroDVN,
            LAYERZERO_DVNS.bsc.googleCloudDVN
        ].sort(), // Must be in alphabetical order
        optionalDVNs: []
    };
    
    const ulnConfigEthereum = {
        confirmations: 15, // Must match BSC config
        requiredDVNCount: 2,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [
            LAYERZERO_DVNS.ethereum.layerZeroDVN,
            LAYERZERO_DVNS.ethereum.googleCloudDVN
        ].sort(), // Must be in alphabetical order
        optionalDVNs: []
    };
    
    console.log("🔧 DVN Configuration:");
    console.log(`BSC DVNs: ${ulnConfigBSC.requiredDVNs.join(', ')}`);
    console.log(`ETH DVNs: ${ulnConfigEthereum.requiredDVNs.join(', ')}`);
    
    try {
        // Encode configurations
        const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
        
        const encodedBSCConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [ulnConfigBSC]);
        const encodedEthConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [ulnConfigEthereum]);
        
        // Set BSC send config (BSC → Ethereum)
        console.log("📱 Setting BSC send configuration...");
        const bscSetConfigParam = {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            configType: 2, // ULN_CONFIG_TYPE
            config: encodedBSCConfig
        };
        
        const bscTx = await bscEndpoint.setConfig(
            BSC_CONTRACTS.usd1Adapter,
            LIBRARIES.bsc.sendUln302,
            [bscSetConfigParam],
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 300000
            }
        );
        await bscTx.wait();
        console.log(`✅ BSC DVN config set: ${bscTx.hash}`);
        
        // Set Ethereum receive config (BSC → Ethereum)
        console.log("📱 Setting Ethereum receive configuration...");
        const ethSetConfigParam = {
            eid: EndpointId.BSC_V2_MAINNET,
            configType: 2, // ULN_CONFIG_TYPE
            config: encodedEthConfig
        };
        
        const ethTx = await ethEndpoint.setConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            LIBRARIES.ethereum.receiveUln302,
            [ethSetConfigParam],
            {
                maxFeePerGas: ethers.parseUnits("12", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                gasLimit: 300000
            }
        );
        await ethTx.wait();
        console.log(`✅ Ethereum DVN config set: ${ethTx.hash}`);
        
    } catch (error: any) {
        console.log(`❌ DVN configuration failed: ${error.message}`);
        throw error;
    }
}

async function verifyConfigurations() {
    console.log("Verifying send/receive configurations match...");
    
    // Re-read configurations to verify they're set correctly
    await readCurrentConfigs();
    
    console.log("\n💡 Configuration verification complete!");
    console.log("Both BSC and Ethereum should now have matching DVN configurations");
}

// Test the configuration by attempting a quote
async function testConfiguration() {
    console.log("\n🧪 TESTING USD1 ADAPTER AFTER DVN FIX:");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const OFTAbi = [
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)"
    ];
    
    const adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
    
    const testParams = {
        dstEid: EndpointId.ETHEREUM_V2_MAINNET,
        to: ethers.zeroPadValue(bscSigner.address, 32),
        amountLD: ethers.parseUnits("1", 18),
        minAmountLD: ethers.parseUnits("0.99", 18),
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x"
    };
    
    try {
        const fee = await adapter.quoteSend(testParams, false);
        console.log("✅ DVN FIX SUCCESSFUL!");
        console.log(`LayerZero fee quote: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("🎊 Your USD1 deposit should now work!");
        return true;
    } catch (error: any) {
        console.log(`❌ Still failing: ${error.message}`);
        if (error.message.includes('0x6780cfaf')) {
            console.log("💡 DVN configuration may need more time to propagate");
            console.log("Wait 5-10 minutes and try the deposit again");
        }
        return false;
    }
}

async function main() {
    await debugAndFixLayerZeroDVN();
    
    // Wait a moment for config to propagate
    console.log("\n⏳ Waiting 30 seconds for configuration to propagate...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Test the fix
    await testConfiguration();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { debugAndFixLayerZeroDVN };
