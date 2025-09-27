import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    endpoint: process.env.BNB_LZ_ENDPOINT_V2!,
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    endpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,
};

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

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function deepDiveLayerZeroConfig() {
    console.log("🔬 DEEP DIVE LAYERZERO CONFIGURATION ANALYSIS");
    console.log("============================================");
    
    try {
        // Check all configurations in detail
        await checkAllConfigurations();
        
        // Check library assignments
        await checkLibraryAssignments();
        
        // Analyze the specific error
        await analyzeSpecificError();
        
        // Try different DVN configurations
        await tryAlternativeDVNConfig();
        
    } catch (error: any) {
        console.error(`❌ Deep dive failed: ${error.message}`);
    }
}

async function checkAllConfigurations() {
    console.log("\n🔍 COMPLETE CONFIGURATION ANALYSIS:");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const EndpointAbi = [
        "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)",
        "function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address lib)",
        "function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address lib)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    // Check BSC configurations
    console.log("📱 BSC USD1 Adapter Analysis:");
    
    // BSC Send Library
    const bscSendLib = await bscEndpoint.getSendLibrary(BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET);
    console.log(`Send Library: ${bscSendLib}`);
    console.log(`Expected: ${LIBRARIES.bsc.sendUln302}`);
    console.log(`Matches: ${bscSendLib.toLowerCase() === LIBRARIES.bsc.sendUln302.toLowerCase() ? '✅' : '❌'}`);
    
    // BSC Receive Library
    const bscReceiveLib = await bscEndpoint.getReceiveLibrary(BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET);
    console.log(`Receive Library: ${bscReceiveLib}`);
    console.log(`Expected: ${LIBRARIES.bsc.receiveUln302}`);
    console.log(`Matches: ${bscReceiveLib.toLowerCase() === LIBRARIES.bsc.receiveUln302.toLowerCase() ? '✅' : '❌'}`);
    
    // BSC Executor Config (configType = 1)
    try {
        const bscExecutorConfigBytes = await bscEndpoint.getConfig(
            BSC_CONTRACTS.usd1Adapter,
            bscSendLib,
            EndpointId.ETHEREUM_V2_MAINNET,
            1 // EXECUTOR_CONFIG_TYPE
        );
        
        if (bscExecutorConfigBytes === '0x') {
            console.log("❌ No BSC executor configuration found");
        } else {
            const executorConfig = decodeExecutorConfig(bscExecutorConfigBytes);
            console.log(`Executor: ${executorConfig?.executor || 'N/A'}`);
            console.log(`Max Message Size: ${executorConfig?.maxMessageSize || 'N/A'}`);
        }
    } catch (error: any) {
        console.log(`⚠️  BSC executor config error: ${error.message}`);
    }
    
    // BSC ULN Config (configType = 2)
    try {
        const bscUlnConfigBytes = await bscEndpoint.getConfig(
            BSC_CONTRACTS.usd1Adapter,
            bscSendLib,
            EndpointId.ETHEREUM_V2_MAINNET,
            2 // ULN_CONFIG_TYPE
        );
        
        if (bscUlnConfigBytes === '0x') {
            console.log("❌ No BSC ULN configuration found");
        } else {
            const ulnConfig = decodeUlnConfig(bscUlnConfigBytes);
            console.log(`ULN Confirmations: ${ulnConfig?.confirmations || 'N/A'}`);
            console.log(`Required DVN Count: ${ulnConfig?.requiredDVNCount || 'N/A'}`);
            console.log(`Required DVNs: ${ulnConfig?.requiredDVNs?.join(', ') || 'N/A'}`);
        }
    } catch (error: any) {
        console.log(`⚠️  BSC ULN config error: ${error.message}`);
    }
    
    // Ethereum configurations
    console.log("\n📱 Ethereum USD1 Adapter Analysis:");
    
    // Ethereum Send Library
    const ethSendLib = await ethEndpoint.getSendLibrary(ETHEREUM_CONTRACTS.usd1Adapter, EndpointId.BSC_V2_MAINNET);
    console.log(`Send Library: ${ethSendLib}`);
    console.log(`Expected: ${LIBRARIES.ethereum.sendUln302}`);
    console.log(`Matches: ${ethSendLib.toLowerCase() === LIBRARIES.ethereum.sendUln302.toLowerCase() ? '✅' : '❌'}`);
    
    // Ethereum Receive Library  
    const ethReceiveLib = await ethEndpoint.getReceiveLibrary(ETHEREUM_CONTRACTS.usd1Adapter, EndpointId.BSC_V2_MAINNET);
    console.log(`Receive Library: ${ethReceiveLib}`);
    console.log(`Expected: ${LIBRARIES.ethereum.receiveUln302}`);
    console.log(`Matches: ${ethReceiveLib.toLowerCase() === LIBRARIES.ethereum.receiveUln302.toLowerCase() ? '✅' : '❌'}`);
    
    // Ethereum ULN Config
    try {
        const ethUlnConfigBytes = await ethEndpoint.getConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            ethReceiveLib,
            EndpointId.BSC_V2_MAINNET,
            2 // ULN_CONFIG_TYPE
        );
        
        if (ethUlnConfigBytes === '0x') {
            console.log("❌ No Ethereum ULN configuration found");
        } else {
            const ulnConfig = decodeUlnConfig(ethUlnConfigBytes);
            console.log(`ULN Confirmations: ${ulnConfig?.confirmations || 'N/A'}`);
            console.log(`Required DVN Count: ${ulnConfig?.requiredDVNCount || 'N/A'}`);
            console.log(`Required DVNs: ${ulnConfig?.requiredDVNs?.join(', ') || 'N/A'}`);
        }
    } catch (error: any) {
        console.log(`⚠️  Ethereum ULN config error: ${error.message}`);
    }
}

async function checkLibraryAssignments() {
    console.log("\n📚 LIBRARY ASSIGNMENT VERIFICATION:");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const EndpointAbi = [
        "function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address lib)",
        "function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address lib)",
        "function defaultSendLibrary(uint32 _eid) external view returns (address lib)",
        "function defaultReceiveLibrary(uint32 _eid) external view returns (address lib)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    // Check if using defaults (which could cause issues)
    const bscDefaultSend = await bscEndpoint.defaultSendLibrary(EndpointId.ETHEREUM_V2_MAINNET);
    const bscDefaultReceive = await bscEndpoint.defaultReceiveLibrary(EndpointId.ETHEREUM_V2_MAINNET);
    const ethDefaultSend = await ethEndpoint.defaultSendLibrary(EndpointId.BSC_V2_MAINNET);
    const ethDefaultReceive = await ethEndpoint.defaultReceiveLibrary(EndpointId.BSC_V2_MAINNET);
    
    console.log("Default Libraries:");
    console.log(`BSC Default Send: ${bscDefaultSend}`);
    console.log(`BSC Default Receive: ${bscDefaultReceive}`);
    console.log(`ETH Default Send: ${ethDefaultSend}`);
    console.log(`ETH Default Receive: ${ethDefaultReceive}`);
}

async function analyzeSpecificError() {
    console.log("\n🔍 ANALYZING ERROR 0x6780cfaf:");
    console.log("This error typically indicates:");
    console.log("1. DVN configuration mismatch between chains");
    console.log("2. Missing executor configuration");
    console.log("3. Library version incompatibility");
    console.log("4. Confirmation threshold mismatch");
    
    // The error suggests a validation failure in LayerZero's ULN
    console.log("\n💡 POSSIBLE SOLUTIONS:");
    console.log("1. Set executor configuration on BSC");
    console.log("2. Use symmetric DVN configuration");
    console.log("3. Check if DVNs are actually active/working");
}

async function tryAlternativeDVNConfig() {
    console.log("\n🔄 TRYING MINIMAL DVN CONFIGURATION:");
    console.log("Using single LayerZero DVN only for testing...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscSigner);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethSigner);
    
    // Minimal ULN config with just LayerZero DVN
    const minimalUlnConfigBSC = {
        confirmations: 5, // Lower confirmations for testing
        requiredDVNCount: 1, // Only one DVN
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: ['0xfD6865c841c2d64565562fCc7e05e619A30615f0'], // LayerZero BSC DVN only
        optionalDVNs: []
    };
    
    const minimalUlnConfigEthereum = {
        confirmations: 5, // Match BSC
        requiredDVNCount: 1, // Match BSC
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: ['0x589dEDbD617e0CBcB916A9223F4d1300c294236b'], // LayerZero ETH DVN only
        optionalDVNs: []
    };
    
    try {
        const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
        
        const encodedBSCConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [minimalUlnConfigBSC]);
        const encodedEthConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [minimalUlnConfigEthereum]);
        
        // Set minimal BSC config
        const bscSetConfigParam = {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            configType: 2,
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
        console.log(`✅ BSC minimal config set: ${bscTx.hash}`);
        
        // Set minimal Ethereum config
        const ethSetConfigParam = {
            eid: EndpointId.BSC_V2_MAINNET,
            configType: 2,
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
        console.log(`✅ Ethereum minimal config set: ${ethTx.hash}`);
        
        console.log("\n✅ MINIMAL DVN CONFIG APPLIED");
        console.log("Configuration: 1 DVN, 5 confirmations on both chains");
        
        // Test after minimal config
        await testAfterMinimalConfig();
        
    } catch (error: any) {
        console.log(`❌ Minimal config failed: ${error.message}`);
    }
}

async function testAfterMinimalConfig() {
    console.log("\n🧪 TESTING AFTER MINIMAL DVN CONFIG:");
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 10000));
    
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
        console.log("🎊 MINIMAL CONFIG SUCCESS!");
        console.log(`LayerZero fee quote: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("✅ USD1 deposit should now work with minimal DVN config!");
        return true;
    } catch (error: any) {
        console.log(`❌ Still failing with minimal config: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("💡 Error persists - may need executor configuration or other setup");
        }
        return false;
    }
}

// Helper functions
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
        return null;
    }
}

function decodeExecutorConfig(configBytes: string) {
    const executorConfigStruct = ['tuple(uint32 maxMessageSize, address executor)'];
    
    try {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(executorConfigStruct, configBytes);
        return {
            maxMessageSize: decoded[0][0],
            executor: decoded[0][1]
        };
    } catch (error: any) {
        return null;
    }
}

async function main() {
    await deepDiveLayerZeroConfig();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { deepDiveLayerZeroConfig };
