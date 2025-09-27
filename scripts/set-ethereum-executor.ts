import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    endpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,
};

const LIBRARIES = {
    ethereum: {
        sendUln302: '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1'
    }
};

// LayerZero V2 Executor addresses
const EXECUTORS = {
    ethereum: '0x173272739Bd7Aa6e4e214714048a9fE699453059' // LayerZero Executor on Ethereum
};

const EndpointId = {
    BSC_V2_MAINNET: 30102
};

async function setEthereumExecutor() {
    console.log("⚡ SETTING ETHEREUM EXECUTOR CONFIGURATION");
    console.log("=========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Signer: ${deployer.address}`);
    
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external",
        "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)"
    ];
    
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethSigner);
    
    try {
        // Check current executor configuration
        console.log("\n🔍 Checking current Ethereum executor config...");
        try {
            const currentExecutorConfigBytes = await ethEndpoint.getConfig(
                ETHEREUM_CONTRACTS.usd1Adapter,
                LIBRARIES.ethereum.sendUln302,
                EndpointId.BSC_V2_MAINNET,
                1 // EXECUTOR_CONFIG_TYPE
            );
            
            if (currentExecutorConfigBytes === '0x') {
                console.log("❌ No executor configuration found on Ethereum");
            } else {
                const executorConfig = decodeExecutorConfig(currentExecutorConfigBytes);
                console.log(`Current Executor: ${executorConfig?.executor || 'N/A'}`);
                console.log(`Max Message Size: ${executorConfig?.maxMessageSize || 'N/A'}`);
            }
        } catch (error: any) {
            console.log("❌ No executor configuration found on Ethereum");
        }
        
        // Set Ethereum executor configuration
        console.log("\n⚡ Setting Ethereum executor configuration...");
        
        const executorConfig = {
            maxMessageSize: 10000, // Match BSC configuration
            executor: EXECUTORS.ethereum
        };
        
        console.log(`Executor: ${executorConfig.executor}`);
        console.log(`Max Message Size: ${executorConfig.maxMessageSize}`);
        
        // Encode executor config
        const executorConfigStruct = 'tuple(uint32 maxMessageSize, address executor)';
        const encodedExecutorConfig = ethers.AbiCoder.defaultAbiCoder().encode(
            [executorConfigStruct],
            [executorConfig]
        );
        
        const setConfigParam = {
            eid: EndpointId.BSC_V2_MAINNET,
            configType: 1, // EXECUTOR_CONFIG_TYPE
            config: encodedExecutorConfig
        };
        
        const tx = await ethEndpoint.setConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            LIBRARIES.ethereum.sendUln302,
            [setConfigParam],
            {
                maxFeePerGas: ethers.parseUnits("15", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                gasLimit: 300000
            }
        );
        
        console.log("📤 Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Executor configuration set successfully!");
        console.log(`⛽ Gas used: ${receipt.gasUsed}`);
        
        // Verify the configuration was set
        console.log("\n✅ VERIFYING EXECUTOR CONFIGURATION:");
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
            const newExecutorConfigBytes = await ethEndpoint.getConfig(
                ETHEREUM_CONTRACTS.usd1Adapter,
                LIBRARIES.ethereum.sendUln302,
                EndpointId.BSC_V2_MAINNET,
                1 // EXECUTOR_CONFIG_TYPE
            );
            
            const newExecutorConfig = decodeExecutorConfig(newExecutorConfigBytes);
            console.log(`✅ New Executor: ${newExecutorConfig?.executor}`);
            console.log(`✅ Max Message Size: ${newExecutorConfig?.maxMessageSize}`);
            
            if (newExecutorConfig?.executor === EXECUTORS.ethereum) {
                console.log("🎊 EXECUTOR CONFIGURATION SUCCESS!");
            } else {
                console.log("⚠️  Configuration may need more time to propagate");
            }
        } catch (verifyError: any) {
            console.log(`⚠️  Could not verify: ${verifyError.message}`);
        }
        
        // Now test the USD1 deposit
        console.log("\n🧪 TESTING USD1 DEPOSIT AFTER EXECUTOR FIX:");
        await testUSD1DepositAfterExecutorFix();
        
    } catch (error: any) {
        console.error(`❌ Executor setup failed: ${error.message}`);
    }
}

async function testUSD1DepositAfterExecutorFix() {
    console.log("Testing USD1 adapter quote...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const OFTAbi = [
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)"
    ];
    
    const adapter = new ethers.Contract('0x283AbE84811318a873FB98242FC0FE008e7036D4', OFTAbi, bscSigner);
    
    const testParams = {
        dstEid: 30101, // Ethereum
        to: ethers.zeroPadValue(bscSigner.address, 32),
        amountLD: ethers.parseUnits("1", 18),
        minAmountLD: ethers.parseUnits("0.99", 18),
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x"
    };
    
    try {
        const fee = await adapter.quoteSend(testParams, false);
        console.log("🎊 SUCCESS! EXECUTOR FIX WORKED!");
        console.log(`LayerZero fee quote: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("✅ Your $5 USD1 deposit should now work!");
        console.log("");
        console.log("🚀 READY TO EXECUTE YOUR DEPOSIT:");
        console.log("Run: npx hardhat run scripts/execute-combined-deposit.ts --network ethereum");
        return true;
    } catch (error: any) {
        console.log(`❌ Still failing: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("💡 Error persists - may need additional time for configuration to propagate");
            console.log("Wait 5-10 minutes and try the deposit again");
        } else {
            console.log("💡 Different error - progress made!");
        }
        return false;
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
    await setEthereumExecutor();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { setEthereumExecutor };
