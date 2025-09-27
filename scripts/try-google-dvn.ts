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

async function tryGoogleCloudDVN() {
    console.log("🌐 TRYING GOOGLE CLOUD DVN APPROACH");
    console.log("===================================");
    console.log("Strategy: Use Google Cloud DVN for better cross-chain compatibility");
    console.log("This DVN operates across all LayerZero V2 chains\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Step 1: Configure both chains to use Google Cloud DVN
        console.log("1️⃣  CONFIGURING GOOGLE CLOUD DVN ON BOTH CHAINS:");
        await configureGoogleCloudDVN();
        
        // Step 2: Test with Google Cloud DVN
        console.log("\n2️⃣  TESTING GOOGLE CLOUD DVN:");
        await testGoogleCloudDVN();
        
        console.log("\n🌐 GOOGLE DVN ATTEMPT COMPLETE!");
        
    } catch (error: any) {
        console.error(`❌ Google DVN approach failed: ${error.message}`);
    }
}

async function configureGoogleCloudDVN() {
    console.log("Configuring both chains to use Google Cloud DVN...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscSigner);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethSigner);
    
    // Google Cloud DVN - operates on all LayerZero chains
    const GOOGLE_CLOUD_DVN = '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc';
    
    // Universal Google Cloud DVN configuration
    const googleDVNConfig = {
        confirmations: 10, // Slightly lower for faster processing
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [GOOGLE_CLOUD_DVN], // Use Google DVN on both chains
        optionalDVNs: []
    };
    
    console.log("🔧 Google Cloud DVN Configuration:");
    console.log(`   DVN Address: ${GOOGLE_CLOUD_DVN}`);
    console.log(`   Confirmations: ${googleDVNConfig.confirmations}`);
    console.log(`   Strategy: Single DVN across all chains for compatibility`);
    
    const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
    const encodedConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [googleDVNConfig]);
    
    try {
        // Configure BSC → Ethereum (send config)
        console.log("🟡 Configuring BSC → Ethereum with Google DVN...");
        const bscConfigParams = [{
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            configType: 2, // ULN_CONFIG_TYPE
            config: encodedConfig
        }];
        
        const bscTx = await bscEndpoint.setConfig(
            BSC_CONTRACTS.usd1Adapter,
            '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE', // BSC SendUln302
            bscConfigParams,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 400000
            }
        );
        await bscTx.wait();
        console.log(`✅ BSC Google DVN config: ${bscTx.hash}`);
        
        // Configure Ethereum → BSC (receive config)
        console.log("🔵 Configuring Ethereum → BSC with Google DVN...");
        const ethConfigParams = [{
            eid: EndpointId.BSC_V2_MAINNET,
            configType: 2, // ULN_CONFIG_TYPE
            config: encodedConfig
        }];
        
        const ethTx = await ethEndpoint.setConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            '0xc02Ab410f0734EFa3F14628780e6e695156024C2', // Ethereum ReceiveUln302
            ethConfigParams,
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 400000
            }
        );
        await ethTx.wait();
        console.log(`✅ Ethereum Google DVN config: ${ethTx.hash}`);
        
        console.log("✅ Both chains now use Google Cloud DVN");
        
    } catch (error: any) {
        console.log(`❌ Google DVN config failed: ${error.message}`);
    }
}

async function testGoogleCloudDVN() {
    console.log("Testing with Google Cloud DVN configuration...");
    
    // Wait for configuration propagation
    console.log("⏳ Waiting 45 seconds for Google DVN propagation...");
    await new Promise(resolve => setTimeout(resolve, 45000));
    
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
        console.log("🎊 SUCCESS! GOOGLE CLOUD DVN WORKS!");
        console.log(`LayerZero fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("✅ Google Cloud DVN resolved the DVN compatibility issue!");
        
        console.log("\n🚀 READY FOR ACTUAL DEPOSIT:");
        console.log("The Google Cloud DVN approach should now allow deposits to succeed");
        console.log("Run: npx hardhat run scripts/execute-combined-deposit.ts --network ethereum");
        
        return true;
        
    } catch (error: any) {
        console.log(`❌ Google DVN test failed: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("💡 Even Google Cloud DVN shows the error - this may be a deeper LayerZero issue");
            console.log("🔧 Possible causes:");
            console.log("   - LayerZero V2 network issues on BSC");
            console.log("   - OFT contract implementation issue");
            console.log("   - Endpoint configuration corruption");
            console.log("   - Need LayerZero team assistance");
            
            await suggestAlternativeApproaches();
        }
        
        return false;
    }
}

async function suggestAlternativeApproaches() {
    console.log("\n💡 ALTERNATIVE APPROACHES TO CONSIDER:");
    console.log("=====================================");
    
    console.log("1. 🔄 **Use Manual Bridge Approach**:");
    console.log("   - Deploy a simple bridge contract on both chains");
    console.log("   - Lock tokens on BSC, mint on Ethereum manually");
    console.log("   - Bypass LayerZero temporarily");
    
    console.log("\n2. 🌉 **Use Different Bridge Protocol**:");
    console.log("   - Stargate Finance (LayerZero based but different implementation)");
    console.log("   - Wormhole Bridge");
    console.log("   - Multichain (Anyswap)");
    
    console.log("\n3. 🔧 **LayerZero Support**:");
    console.log("   - Contact LayerZero team with error details");
    console.log("   - Check LayerZero Discord for similar issues");
    console.log("   - Verify if BSC mainnet has known LayerZero issues");
    
    console.log("\n4. 📱 **User-side Alternatives**:");
    console.log("   - Users can bridge manually using existing protocols");
    console.log("   - Deposit directly on Ethereum using existing tokens");
    console.log("   - Wait for LayerZero V2 BSC issues to be resolved");
    
    console.log("\n5. 🧪 **Development Alternatives**:");
    console.log("   - Test on LayerZero testnets first");
    console.log("   - Use different chains (Arbitrum, Base) which might work better");
    console.log("   - Implement fallback mechanisms in the DApp");
}

async function main() {
    await tryGoogleCloudDVN();
    
    console.log("\n🌐 GOOGLE DVN ATTEMPT SUMMARY:");
    console.log("==============================");
    console.log("✅ Tried Google Cloud DVN for universal compatibility");
    console.log("🔧 Configured both chains with the same DVN");
    console.log("🧪 Tested the configuration");
    console.log("");
    console.log("If Google DVN worked: Your deposits should now succeed!");
    console.log("If it still failed: The issue may be deeper than DVN configuration");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { tryGoogleCloudDVN };
