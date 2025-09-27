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

const BSC_LZ_ENDPOINT_V2 = process.env.BNB_LZ_ENDPOINT_V2!;
const ETHEREUM_LZ_ENDPOINT_V2 = process.env.ETHEREUM_LZ_ENDPOINT_V2!;

// LayerZero endpoint IDs
const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

const LzEndpointAbi = [
    "function getConfig(address oapp, uint32 eid, uint256 configType, bytes32 configIndex) external view returns (bytes memory config)",
];

async function checkDVNConfig(network: string, endpoint: string, oappAddress: string, remoteEid: number, tokenName: string) {
    const provider = network === 'bsc' 
        ? new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com')
        : new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    
    const lzEndpoint = new ethers.Contract(endpoint, LzEndpointAbi, provider);
    
    console.log(`\n🔍 ${network.toUpperCase()} ${tokenName} DVN CONFIG:`);
    console.log(`OApp: ${oappAddress}`);
    console.log(`Remote EID: ${remoteEid}`);
    
    try {
        // Check send config (configType: 2)
        const sendConfig = await lzEndpoint.getConfig(
            oappAddress, 
            remoteEid,
            2, // Send config type
            ethers.ZeroHash
        );
        console.log(`📤 Send Config: ${sendConfig ? '✅ Set' : '❌ Missing'}`);
        if (sendConfig !== "0x") {
            console.log(`   Length: ${sendConfig.length} bytes`);
        }
        
        // Check receive config (configType: 1)
        const receiveConfig = await lzEndpoint.getConfig(
            oappAddress,
            remoteEid, 
            1, // Receive config type
            ethers.ZeroHash
        );
        console.log(`📥 Receive Config: ${receiveConfig ? '✅ Set' : '❌ Missing'}`);
        if (receiveConfig !== "0x") {
            console.log(`   Length: ${receiveConfig.length} bytes`);
        }
        
        // Check enforced options (configType: 3)
        const enforcedOptions = await lzEndpoint.getConfig(
            oappAddress,
            remoteEid,
            3, // Enforced options type
            ethers.ZeroHash
        );
        console.log(`⚙️  Enforced Options: ${enforcedOptions ? '✅ Set' : '❌ Missing'}`);
        if (enforcedOptions !== "0x") {
            console.log(`   Length: ${enforcedOptions.length} bytes`);
        }
        
        // Overall status
        const hasFullConfig = sendConfig !== "0x" && receiveConfig !== "0x" && enforcedOptions !== "0x";
        console.log(`🎯 Full Config: ${hasFullConfig ? '✅ Complete' : '❌ Incomplete'}`);
        
        return hasFullConfig;
        
    } catch (error: any) {
        console.log(`❌ Error checking config: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log("🔍 CHECKING DVN CONFIG ON BOTH SIDES FOR BOTH TOKENS");
    console.log("=====================================================");
    
    // BSC side configs
    const bscUsd1Complete = await checkDVNConfig('bsc', BSC_LZ_ENDPOINT_V2, BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET, 'USD1');
    const bscWlfiComplete = await checkDVNConfig('bsc', BSC_LZ_ENDPOINT_V2, BSC_CONTRACTS.wlfiAdapter, EndpointId.ETHEREUM_V2_MAINNET, 'WLFI');
    
    // Ethereum side configs  
    const ethUsd1Complete = await checkDVNConfig('ethereum', ETHEREUM_LZ_ENDPOINT_V2, ETHEREUM_CONTRACTS.usd1Adapter, EndpointId.BSC_V2_MAINNET, 'USD1');
    const ethWlfiComplete = await checkDVNConfig('ethereum', ETHEREUM_LZ_ENDPOINT_V2, ETHEREUM_CONTRACTS.wlfiAdapter, EndpointId.BSC_V2_MAINNET, 'WLFI');
    
    console.log("\n📊 SUMMARY:");
    console.log("===========");
    console.log(`BSC USD1:  ${bscUsd1Complete ? '✅' : '❌'} Complete`);
    console.log(`BSC WLFI:  ${bscWlfiComplete ? '✅' : '❌'} Complete`);
    console.log(`ETH USD1:  ${ethUsd1Complete ? '✅' : '❌'} Complete`);
    console.log(`ETH WLFI:  ${ethWlfiComplete ? '✅' : '❌'} Complete`);
    
    const allComplete = bscUsd1Complete && bscWlfiComplete && ethUsd1Complete && ethWlfiComplete;
    console.log(`\n🎯 ALL CONFIGS: ${allComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
    
    if (!allComplete) {
        console.log("\n💡 MISSING CONFIGURATIONS:");
        if (!bscUsd1Complete) console.log("- BSC USD1 DVN config");
        if (!bscWlfiComplete) console.log("- BSC WLFI DVN config");
        if (!ethUsd1Complete) console.log("- Ethereum USD1 DVN config");
        if (!ethWlfiComplete) console.log("- Ethereum WLFI DVN config");
        
        console.log("\n🔧 NEXT STEPS:");
        console.log("1. Configure missing DVN settings");
        console.log("2. Ensure both tokens have matching configs on both chains");
        console.log("3. Test LayerZero deposits again");
    } else {
        console.log("\n🎊 All configurations are complete!");
        console.log("The LayerZero issue must be elsewhere.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
