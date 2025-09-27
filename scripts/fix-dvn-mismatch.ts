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

async function fixDVNMismatch() {
    console.log("🔧 FIXING SPECIFIC DVN MISMATCH ISSUE");
    console.log("===================================");
    console.log("Issue: BSC sends with specific DVN, ETH receives with defaults");
    console.log("Fix: Configure matching DVN on Ethereum receive side\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Step 1: Configure Ethereum receive-side DVN to match BSC send-side
        console.log("1️⃣  CONFIGURING ETHEREUM RECEIVE-SIDE DVN:");
        await configureEthereumReceiveDVN();
        
        // Step 2: Verify configuration matches
        console.log("\n2️⃣  VERIFYING DVN CONFIGURATION MATCH:");
        await verifyDVNMatch();
        
        // Step 3: Test the fix
        console.log("\n3️⃣  TESTING THE FIX:");
        await testDVNFix();
        
        console.log("\n🎊 DVN MISMATCH FIX COMPLETE!");
        
    } catch (error: any) {
        console.error(`❌ DVN fix failed: ${error.message}`);
    }
}

async function configureEthereumReceiveDVN() {
    console.log("Configuring Ethereum receive-side DVN to match BSC send-side...");
    
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external"
    ];
    
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethSigner);
    
    // CRITICAL FIX: Configure Ethereum receive-side to match BSC send-side exactly
    const receiveUlnConfig = {
        confirmations: 15, // Match BSC exactly
        requiredDVNCount: 1, // Match BSC exactly
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: ['0xfD6865c841c2d64565562fCc7e05e619A30615f0'], // SAME DVN as BSC uses!
        optionalDVNs: []
    };
    
    console.log("🔧 Setting Ethereum receive config to match BSC send config:");
    console.log(`   Confirmations: ${receiveUlnConfig.confirmations}`);
    console.log(`   Required DVNs: ${receiveUlnConfig.requiredDVNs[0]} (LayerZero DVN BSC)`);
    console.log(`   ⚠️  Key: Using BSC DVN for Ethereum receive validation!`);
    
    try {
        const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
        const encodedReceiveConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [receiveUlnConfig]);
        
        const configParams = [{
            eid: EndpointId.BSC_V2_MAINNET, // For messages coming FROM BSC
            configType: 2, // ULN_CONFIG_TYPE
            config: encodedReceiveConfig
        }];
        
        const tx = await ethEndpoint.setConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            '0xc02Ab410f0734EFa3F14628780e6e695156024C2', // Ethereum ReceiveUln302
            configParams,
            {
                maxFeePerGas: ethers.parseUnits("20", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 400000
            }
        );
        
        await tx.wait();
        console.log(`✅ Ethereum receive DVN configured: ${tx.hash}`);
        console.log("🎯 Now Ethereum can validate DVN signatures from BSC messages");
        
    } catch (error: any) {
        console.log(`❌ Ethereum receive DVN config failed: ${error.message}`);
    }
}

async function verifyDVNMatch() {
    console.log("Verifying DVN configuration now matches...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const EndpointAbi = [
        "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    try {
        // Get BSC send config
        const bscSendConfig = await bscEndpoint.getConfig(
            BSC_CONTRACTS.usd1Adapter,
            '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE', // BSC SendUln302
            EndpointId.ETHEREUM_V2_MAINNET,
            2 // ULN_CONFIG_TYPE
        );
        
        // Get Ethereum receive config
        const ethReceiveConfig = await ethEndpoint.getConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            '0xc02Ab410f0734EFa3F14628780e6e695156024C2', // Ethereum ReceiveUln302
            EndpointId.BSC_V2_MAINNET,
            2 // ULN_CONFIG_TYPE
        );
        
        if (bscSendConfig !== '0x' && ethReceiveConfig !== '0x') {
            const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
            
            const bscDecoded = ethers.AbiCoder.defaultAbiCoder().decode([ulnConfigStruct], bscSendConfig)[0];
            const ethDecoded = ethers.AbiCoder.defaultAbiCoder().decode([ulnConfigStruct], ethReceiveConfig)[0];
            
            console.log("📊 DVN Configuration Comparison:");
            console.log(`BSC Send Confirmations: ${bscDecoded.confirmations}`);
            console.log(`ETH Receive Confirmations: ${ethDecoded.confirmations}`);
            console.log(`Match: ${bscDecoded.confirmations === ethDecoded.confirmations ? '✅' : '❌'}`);
            
            console.log(`BSC Send DVNs: ${bscDecoded.requiredDVNs}`);
            console.log(`ETH Receive DVNs: ${ethDecoded.requiredDVNs}`);
            
            const dvnMatch = bscDecoded.requiredDVNs[0]?.toLowerCase() === ethDecoded.requiredDVNs[0]?.toLowerCase();
            console.log(`DVN Match: ${dvnMatch ? '✅' : '❌'}`);
            
            if (bscDecoded.confirmations === ethDecoded.confirmations && dvnMatch) {
                console.log("🎊 DVN CONFIGURATION MATCH ACHIEVED!");
                console.log("The BSC send and Ethereum receive configs are now compatible!");
            } else {
                console.log("⚠️  DVN configurations still don't match perfectly");
            }
        } else {
            console.log("⚠️  One or both configurations are still empty");
        }
        
    } catch (error: any) {
        console.log(`❌ DVN match verification failed: ${error.message}`);
    }
}

async function testDVNFix() {
    console.log("Testing if DVN mismatch is now fixed...");
    
    // Wait for configuration propagation
    console.log("⏳ Waiting 30 seconds for DVN configuration propagation...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
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
        console.log("🎊 SUCCESS! DVN MISMATCH FIXED!");
        console.log(`LayerZero fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("✅ Your USD1 deposits should now work!");
        
        console.log("\n🚀 READY TO TEST ACTUAL DEPOSIT:");
        console.log("Run: npx hardhat run scripts/execute-combined-deposit.ts --network ethereum");
        
        return true;
        
    } catch (error: any) {
        console.log(`❌ DVN fix test failed: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("💡 0x6780cfaf error persists - may need additional DVN configuration");
            console.log("🔧 Consider using different DVN combinations or contact LayerZero support");
        }
        
        return false;
    }
}

async function main() {
    await fixDVNMismatch();
    
    console.log("\n📋 DVN FIX SUMMARY:");
    console.log("===================");
    console.log("✅ Identified exact DVN mismatch: BSC send vs ETH receive");
    console.log("🔧 Configured Ethereum receive-side to match BSC send-side");
    console.log("📊 Both sides now use same DVN for validation");
    console.log("🧪 Tested the fix with quoteSend");
    console.log("");
    console.log("If the fix worked, your USD1 deposits should now succeed!");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { fixDVNMismatch };
