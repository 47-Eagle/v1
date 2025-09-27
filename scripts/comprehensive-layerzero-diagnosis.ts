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

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function comprehensiveLayerZeroDiagnosis() {
    console.log("🔍 COMPREHENSIVE LAYERZERO V2 DIAGNOSIS");
    console.log("=======================================");
    console.log("Analyzing the persistent 0x6780cfaf error...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Step 1: Error Code Analysis
        console.log("1️⃣  ERROR CODE ANALYSIS:");
        await analyzeErrorCode();
        
        // Step 2: Complete Configuration Audit
        console.log("\n2️⃣  COMPLETE CONFIGURATION AUDIT:");
        await completeConfigurationAudit();
        
        // Step 3: Peer Connection Deep Check
        console.log("\n3️⃣  PEER CONNECTION DEEP CHECK:");
        await peerConnectionDeepCheck();
        
        // Step 4: DVN Status Comprehensive Check
        console.log("\n4️⃣  DVN STATUS COMPREHENSIVE CHECK:");
        await dvnStatusComprehensiveCheck();
        
        // Step 5: Message Library Verification
        console.log("\n5️⃣  MESSAGE LIBRARY VERIFICATION:");
        await messageLibraryVerification();
        
        // Step 6: Executor Configuration Check
        console.log("\n6️⃣  EXECUTOR CONFIGURATION CHECK:");
        await executorConfigurationCheck();
        
        // Step 7: Alternative Transaction Test
        console.log("\n7️⃣  ALTERNATIVE TRANSACTION TEST:");
        await alternativeTransactionTest();
        
        // Step 8: LayerZero Network Status Check
        console.log("\n8️⃣  LAYERZERO NETWORK STATUS CHECK:");
        await layerZeroNetworkStatusCheck();
        
        console.log("\n🎯 DIAGNOSIS COMPLETE");
        
    } catch (error: any) {
        console.error(`❌ Diagnosis failed: ${error.message}`);
    }
}

async function analyzeErrorCode() {
    console.log("Analyzing 0x6780cfaf error code...");
    
    // The error 0x6780cfaf translates to specific LayerZero V2 errors
    const knownErrors = {
        '0x6780cfaf': 'LZ_ULN_InvalidDVN - Invalid DVN configuration',
        '0x0bc25a01': 'LZ_ULN_InvalidExecutor - Invalid executor configuration', 
        '0x4c9c8ce3': 'LZ_InvalidPayload - Invalid payload size or format',
        '0xf8f3c65c': 'LZ_InvalidReceiveLibrary - Library not set correctly'
    };
    
    console.log(`🔍 Error 0x6780cfaf = ${knownErrors['0x6780cfaf']}`);
    console.log("This indicates DVN configuration issues specifically");
    console.log("Possible causes:");
    console.log("  - DVN address mismatch between send/receive config");
    console.log("  - DVN not authorized for the pathway");
    console.log("  - Confirmation count mismatch");
    console.log("  - Required DVN count incorrect");
}

async function completeConfigurationAudit() {
    console.log("Auditing complete LayerZero configuration...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const EndpointAbi = [
        "function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address lib)",
        "function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address lib, bool isDefault)",
        "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    // Check BSC → Ethereum pathway
    console.log("\n📍 BSC → ETHEREUM PATHWAY:");
    try {
        const bscSendLib = await bscEndpoint.getSendLibrary(BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET);
        console.log(`BSC Send Library: ${bscSendLib}`);
        
        const [ethReceiveLib, isDefault] = await ethEndpoint.getReceiveLibrary(ETHEREUM_CONTRACTS.usd1Adapter, EndpointId.BSC_V2_MAINNET);
        console.log(`ETH Receive Library: ${ethReceiveLib} (default: ${isDefault})`);
        
        // Get ULN config from BSC side
        const bscUlnConfig = await bscEndpoint.getConfig(
            BSC_CONTRACTS.usd1Adapter,
            bscSendLib,
            EndpointId.ETHEREUM_V2_MAINNET,
            2 // ULN_CONFIG_TYPE
        );
        console.log(`BSC ULN Config: ${bscUlnConfig}`);
        
        // Decode the config
        if (bscUlnConfig !== '0x') {
            const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode([ulnConfigStruct], bscUlnConfig)[0];
            console.log(`  Confirmations: ${decoded.confirmations}`);
            console.log(`  Required DVNs (${decoded.requiredDVNCount}): ${decoded.requiredDVNs}`);
            console.log(`  Optional DVNs (${decoded.optionalDVNCount}): ${decoded.optionalDVNs}`);
        }
        
    } catch (error: any) {
        console.log(`❌ BSC → ETH config check failed: ${error.message}`);
    }
    
    // Check Ethereum → BSC pathway
    console.log("\n📍 ETHEREUM → BSC PATHWAY:");
    try {
        const ethSendLib = await ethEndpoint.getSendLibrary(ETHEREUM_CONTRACTS.usd1Adapter, EndpointId.BSC_V2_MAINNET);
        console.log(`ETH Send Library: ${ethSendLib}`);
        
        const [bscReceiveLib, isDefault] = await bscEndpoint.getReceiveLibrary(BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET);
        console.log(`BSC Receive Library: ${bscReceiveLib} (default: ${isDefault})`);
        
    } catch (error: any) {
        console.log(`❌ ETH → BSC config check failed: ${error.message}`);
    }
}

async function peerConnectionDeepCheck() {
    console.log("Deep checking peer connections...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const OFTAbi = [
        "function peers(uint32 _eid) external view returns (bytes32 peer)",
        "function isPeer(uint32 _eid, bytes32 _peer) external view returns (bool)"
    ];
    
    const bscAdapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscProvider);
    const ethAdapter = new ethers.Contract(ETHEREUM_CONTRACTS.usd1Adapter, OFTAbi, ethProvider);
    
    try {
        // Check BSC → Ethereum peer
        const bscPeer = await bscAdapter.peers(EndpointId.ETHEREUM_V2_MAINNET);
        const expectedEthPeer = ethers.zeroPadValue(ETHEREUM_CONTRACTS.usd1Adapter, 32);
        console.log(`BSC Peer: ${bscPeer}`);
        console.log(`Expected:  ${expectedEthPeer}`);
        console.log(`Match: ${bscPeer.toLowerCase() === expectedEthPeer.toLowerCase() ? '✅' : '❌'}`);
        
        // Verify peer recognition
        const isPeerBSC = await bscAdapter.isPeer(EndpointId.ETHEREUM_V2_MAINNET, expectedEthPeer);
        console.log(`BSC recognizes ETH peer: ${isPeerBSC ? '✅' : '❌'}`);
        
        // Check Ethereum → BSC peer
        const ethPeer = await ethAdapter.peers(EndpointId.BSC_V2_MAINNET);
        const expectedBscPeer = ethers.zeroPadValue(BSC_CONTRACTS.usd1Adapter, 32);
        console.log(`ETH Peer: ${ethPeer}`);
        console.log(`Expected: ${expectedBscPeer}`);
        console.log(`Match: ${ethPeer.toLowerCase() === expectedBscPeer.toLowerCase() ? '✅' : '❌'}`);
        
        const isPeerETH = await ethAdapter.isPeer(EndpointId.BSC_V2_MAINNET, expectedBscPeer);
        console.log(`ETH recognizes BSC peer: ${isPeerETH ? '✅' : '❌'}`);
        
    } catch (error: any) {
        console.log(`❌ Peer check failed: ${error.message}`);
    }
}

async function dvnStatusComprehensiveCheck() {
    console.log("Comprehensive DVN status check...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    // Check if DVN addresses are correct and active
    const DVNS = {
        layerzero_bsc: '0xfD6865c841c2d64565562fCc7e05e619A30615f0',
        layerzero_eth: '0x589dEDbD617e0CBcB916A9223F4d1300c294236b',
        google_cloud: '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc'
    };
    
    console.log("📋 DVN Status Check:");
    for (const [name, address] of Object.entries(DVNS)) {
        try {
            const provider = name.includes('bsc') ? bscProvider : ethProvider;
            const code = await provider.getCode(address);
            console.log(`${name}: ${address} ${code !== '0x' ? '✅' : '❌'}`);
        } catch (error: any) {
            console.log(`${name}: ${address} ❌ (${error.message})`);
        }
    }
    
    // Check if DVNs are properly configured for the pathway
    console.log("\n🔧 DVN Configuration Compatibility:");
    console.log("BSC uses LayerZero DVN + Google Cloud DVN");
    console.log("ETH uses LayerZero DVN + Google Cloud DVN");
    console.log("Both chains should have compatible DVN setups for cross-chain messaging");
}

async function messageLibraryVerification() {
    console.log("Verifying message library versions and compatibility...");
    
    const EXPECTED_LIBRARIES = {
        bsc: {
            send: '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE',  // SendUln302
            receive: '0xB217266c3A98C8B2709Ee26836C98cf12f6cCEC1'   // ReceiveUln302
        },
        ethereum: {
            send: '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1',   // SendUln302
            receive: '0xc02Ab410f0734EFa3F14628780e6e695156024C2'    // ReceiveUln302
        }
    };
    
    console.log("📚 Expected LayerZero V2 Message Libraries:");
    console.log(`BSC Send: ${EXPECTED_LIBRARIES.bsc.send}`);
    console.log(`BSC Receive: ${EXPECTED_LIBRARIES.bsc.receive}`);
    console.log(`ETH Send: ${EXPECTED_LIBRARIES.ethereum.send}`);
    console.log(`ETH Receive: ${EXPECTED_LIBRARIES.ethereum.receive}`);
    
    // Verify library contracts exist
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const libraries = [
        { name: 'BSC Send', address: EXPECTED_LIBRARIES.bsc.send, provider: bscProvider },
        { name: 'BSC Receive', address: EXPECTED_LIBRARIES.bsc.receive, provider: bscProvider },
        { name: 'ETH Send', address: EXPECTED_LIBRARIES.ethereum.send, provider: ethProvider },
        { name: 'ETH Receive', address: EXPECTED_LIBRARIES.ethereum.receive, provider: ethProvider }
    ];
    
    for (const lib of libraries) {
        try {
            const code = await lib.provider.getCode(lib.address);
            console.log(`${lib.name}: ${code !== '0x' ? '✅' : '❌'}`);
        } catch (error: any) {
            console.log(`${lib.name}: ❌ (${error.message})`);
        }
    }
}

async function executorConfigurationCheck() {
    console.log("Checking executor configuration...");
    
    const EXPECTED_EXECUTORS = {
        bsc: '0x3ebD570ed38B1b3b4BC886999fcF507e9D584859',
        ethereum: '0x173272739Bd7Aa6e4e214714048a9fE699453059'
    };
    
    console.log("⚡ Expected LayerZero V2 Executors:");
    console.log(`BSC: ${EXPECTED_EXECUTORS.bsc}`);
    console.log(`ETH: ${EXPECTED_EXECUTORS.ethereum}`);
    
    // Check if executors are active
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    try {
        const bscCode = await bscProvider.getCode(EXPECTED_EXECUTORS.bsc);
        const ethCode = await ethProvider.getCode(EXPECTED_EXECUTORS.ethereum);
        console.log(`BSC Executor Active: ${bscCode !== '0x' ? '✅' : '❌'}`);
        console.log(`ETH Executor Active: ${ethCode !== '0x' ? '✅' : '❌'}`);
    } catch (error: any) {
        console.log(`❌ Executor check failed: ${error.message}`);
    }
}

async function alternativeTransactionTest() {
    console.log("Testing alternative transaction methods...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const OFTAbi = [
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)",
        "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) calldata _sendParam, (uint256 nativeFee, uint256 lzTokenFee) calldata _fee, address _refundAddress) external payable"
    ];
    
    const adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
    
    // Test with minimal amount and options
    const minimalParams = {
        dstEid: EndpointId.ETHEREUM_V2_MAINNET,
        to: ethers.zeroPadValue(bscSigner.address, 32),
        amountLD: ethers.parseUnits("0.1", 18), // Minimal 0.1 USD1
        minAmountLD: ethers.parseUnits("0.099", 18),
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x"
    };
    
    try {
        console.log("🧪 Testing minimal quote (0.1 USD1):");
        const fee = await adapter.quoteSend(minimalParams, false);
        console.log(`Quote successful: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("✅ Basic quoteSend works - issue is likely in the send execution");
        
    } catch (error: any) {
        console.log(`❌ Even minimal quote fails: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("🚨 CRITICAL: Even quoteSend fails with DVN error");
            console.log("This suggests fundamental DVN configuration mismatch");
        }
    }
}

async function layerZeroNetworkStatusCheck() {
    console.log("Checking LayerZero network status...");
    
    // Check if LayerZero endpoints are responsive
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const EndpointAbi = [
        "function eid() external view returns (uint32)",
        "function defaultSendLibrary(uint32 _eid) external view returns (address)",
        "function defaultReceiveLibrary(uint32 _eid) external view returns (address)"
    ];
    
    try {
        const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
        const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
        
        const bscEid = await bscEndpoint.eid();
        const ethEid = await ethEndpoint.eid();
        
        console.log(`BSC Endpoint EID: ${bscEid} (expected: ${EndpointId.BSC_V2_MAINNET})`);
        console.log(`ETH Endpoint EID: ${ethEid} (expected: ${EndpointId.ETHEREUM_V2_MAINNET})`);
        
        const bscDefaultSend = await bscEndpoint.defaultSendLibrary(EndpointId.ETHEREUM_V2_MAINNET);
        const bscDefaultReceive = await bscEndpoint.defaultReceiveLibrary(EndpointId.ETHEREUM_V2_MAINNET);
        
        console.log(`BSC Default Send: ${bscDefaultSend}`);
        console.log(`BSC Default Receive: ${bscDefaultReceive}`);
        
    } catch (error: any) {
        console.log(`❌ LayerZero network check failed: ${error.message}`);
    }
}

async function main() {
    await comprehensiveLayerZeroDiagnosis();
    
    console.log("\n🎯 DIAGNOSIS SUMMARY:");
    console.log("====================");
    console.log("The 0x6780cfaf error specifically indicates 'Invalid DVN' configuration.");
    console.log("This comprehensive check should reveal the exact mismatch causing the issue.");
    console.log("");
    console.log("Common causes of this error:");
    console.log("1. DVN address mismatch between chains");
    console.log("2. DVN not properly authorized for the pathway");
    console.log("3. Confirmation count differences");
    console.log("4. Required vs optional DVN configuration errors");
    console.log("");
    console.log("Based on the results above, we can determine the exact fix needed.");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { comprehensiveLayerZeroDiagnosis };
