import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract addresses
const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688'
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F'
};

// LayerZero DVN addresses
const BSC_DVN_ADDRESSES = {
    layerzero: '0xfd6865c841c2d64565562fcc7e05e619a30615f0',
    nethermind: '0x31f748a368a893bdb5abb67ec95f232507601a73'
};

const ETHEREUM_DVN_ADDRESSES = {
    layerzero: '0x589dEDbD617e0CBcB916A9223F4d1300c294236b',
    googleCloud: '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc'
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

const LzEndpointAbi = [
    "function setSendConfig(address oapp, uint32 eid, tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs, tuple(address executor, uint32 maxMessageSize) executorConfig) config) external",
    "function setReceiveConfig(address oapp, uint32 eid, tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs, tuple(address executor, uint32 maxMessageSize) executorConfig) config) external",
    "function setEnforcedOptions(address oapp, uint32 eid, bytes options) external"
];

async function setupDVNConfig(
    network: string,
    endpointAddress: string,
    oappAddress: string,
    remoteEid: number,
    tokenName: string,
    dvnAddresses: string[]
) {
    console.log(`\n🔧 CONFIGURING ${network.upper} ${tokenName} DVN:`);
    console.log(`OApp: ${oappAddress}`);
    console.log(`Remote EID: ${remoteEid}`);
    
    const [deployer] = await ethers.getSigners();
    const lzEndpoint = new ethers.Contract(endpointAddress, LzEndpointAbi, deployer);
    
    const confirmations = network === 'bsc' ? 20 : 15;
    const executor = '0x0000000000000000000000000000000000000000'; // Default executor
    
    const config = {
        confirmations,
        requiredDVNCount: dvnAddresses.length,
        requiredDVNs: dvnAddresses,
        optionalDVNCount: 0,
        optionalDVNs: [],
        optionalDVNThreshold: 0,
        executorConfig: {
            executor,
            maxMessageSize: network === 'bsc' ? 200000 : 0 // Only BSC needs send config
        }
    };
    
    try {
        // Set send config (only for BSC -> Ethereum)
        if (network === 'bsc') {
            console.log(`📤 Setting send config...`);
            const sendTx = await lzEndpoint.setSendConfig(oappAddress, remoteEid, config, {
                gasLimit: 800000
            });
            await sendTx.wait();
            console.log(`✅ Send config set: ${sendTx.hash}`);
        }
        
        // Set receive config
        const receiveConfig = {
            ...config,
            executorConfig: { executor, maxMessageSize: 0 } // No max for receive
        };
        console.log(`📥 Setting receive config...`);
        const receiveTx = await lzEndpoint.setReceiveConfig(oappAddress, remoteEid, receiveConfig, {
            gasLimit: 800000
        });
        await receiveTx.wait();
        console.log(`✅ Receive config set: ${receiveTx.hash}`);
        
        // Set enforced options
        const enforcedOptions = "0x00030001001100000000000000000000000000030d40";
        console.log(`⚙️  Setting enforced options...`);
        const optionsTx = await lzEndpoint.setEnforcedOptions(oappAddress, remoteEid, enforcedOptions, {
            gasLimit: 300000
        });
        await optionsTx.wait();
        console.log(`✅ Enforced options set: ${optionsTx.hash}`);
        
        console.log(`🎯 ${network.upper} ${tokenName} COMPLETE!`);
        return true;
        
    } catch (error: any) {
        console.log(`❌ ${network.upper} ${tokenName} failed: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log("🚀 SETTING UP DVN CONFIG FOR BOTH TOKENS ON BOTH CHAINS");
    console.log("=======================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Step 1: Configure BSC side (both tokens)
    console.log("\n🌟 STEP 1: BSC DVN CONFIGURATION");
    const bscUsd1 = await setupDVNConfig(
        'bsc',
        process.env.BNB_LZ_ENDPOINT_V2!,
        BSC_CONTRACTS.usd1Adapter,
        EndpointId.ETHEREUM_V2_MAINNET,
        'USD1',
        [BSC_DVN_ADDRESSES.layerzero, BSC_DVN_ADDRESSES.nethermind]
    );
    
    const bscWlfi = await setupDVNConfig(
        'bsc',
        process.env.BNB_LZ_ENDPOINT_V2!,
        BSC_CONTRACTS.wlfiAdapter,
        EndpointId.ETHEREUM_V2_MAINNET,
        'WLFI',
        [BSC_DVN_ADDRESSES.layerzero, BSC_DVN_ADDRESSES.nethermind]
    );
    
    // Step 2: Configure Ethereum side (both tokens)
    console.log("\n🌟 STEP 2: ETHEREUM DVN CONFIGURATION");
    const ethUsd1 = await setupDVNConfig(
        'ethereum',
        process.env.ETHEREUM_LZ_ENDPOINT_V2!,
        ETHEREUM_CONTRACTS.usd1Adapter,
        EndpointId.BSC_V2_MAINNET,
        'USD1',
        [ETHEREUM_DVN_ADDRESSES.layerzero, ETHEREUM_DVN_ADDRESSES.googleCloud]
    );
    
    const ethWlfi = await setupDVNConfig(
        'ethereum',
        process.env.ETHEREUM_LZ_ENDPOINT_V2!,
        ETHEREUM_CONTRACTS.wlfiAdapter,
        EndpointId.BSC_V2_MAINNET,
        'WLFI',
        [ETHEREUM_DVN_ADDRESSES.layerzero, ETHEREUM_DVN_ADDRESSES.googleCloud]
    );
    
    // Summary
    console.log("\n📊 FINAL SUMMARY:");
    console.log("=================");
    console.log(`BSC USD1:  ${bscUsd1 ? '✅' : '❌'}`);
    console.log(`BSC WLFI:  ${bscWlfi ? '✅' : '❌'}`);
    console.log(`ETH USD1:  ${ethUsd1 ? '✅' : '❌'}`);
    console.log(`ETH WLFI:  ${ethWlfi ? '✅' : '❌'}`);
    
    const allComplete = bscUsd1 && bscWlfi && ethUsd1 && ethWlfi;
    console.log(`\n🎯 COMPLETE SETUP: ${allComplete ? '✅' : '❌'}`);
    
    if (allComplete) {
        console.log("\n🎊 ALL DVN CONFIGS COMPLETE!");
        console.log("Now try your LayerZero deposits - they should work!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
