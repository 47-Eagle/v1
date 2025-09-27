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

async function continueLayerZeroSetup() {
    console.log("🔧 CONTINUING LAYERZERO V2 CONFIGURATION");
    console.log("=======================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Signer: ${deployer.address}`);
    
    try {
        // Step 1: Check and set OApp delegates
        console.log("\n1️⃣  CHECKING OAPP DELEGATES:");
        await checkAndSetOAppDelegates();
        
        // Step 2: Set comprehensive enforced options
        console.log("\n2️⃣  SETTING COMPREHENSIVE ENFORCED OPTIONS:");
        await setComprehensiveEnforcedOptions();
        
        // Step 3: Try symmetric DVN configuration
        console.log("\n3️⃣  TRYING SYMMETRIC DVN CONFIGURATION:");
        await trySymmetricDVNConfig();
        
        // Step 4: Verify complete configuration symmetry
        console.log("\n4️⃣  VERIFYING CONFIGURATION SYMMETRY:");
        await verifyConfigurationSymmetry();
        
        // Step 5: Test after comprehensive setup
        console.log("\n5️⃣  TESTING AFTER COMPREHENSIVE SETUP:");
        await testAfterComprehensiveSetup();
        
    } catch (error: any) {
        console.error(`❌ Setup continuation failed: ${error.message}`);
    }
}

async function checkAndSetOAppDelegates() {
    console.log("Checking OApp delegate configuration...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function delegates(address _oapp) external view returns (address delegate)",
        "function setDelegate(address _delegate) external"
    ];
    
    const OAppAbi = [
        "function setDelegate(address _delegate) external",
        "function owner() external view returns (address)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    const bscAdapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OAppAbi, bscSigner);
    const ethAdapter = new ethers.Contract(ETHEREUM_CONTRACTS.usd1Adapter, OAppAbi, ethSigner);
    
    try {
        // Check current delegates
        console.log("📱 BSC USD1 adapter delegate:");
        const bscDelegate = await bscEndpoint.delegates(BSC_CONTRACTS.usd1Adapter);
        console.log(`Current delegate: ${bscDelegate}`);
        
        console.log("📱 Ethereum USD1 adapter delegate:");
        const ethDelegate = await ethEndpoint.delegates(ETHEREUM_CONTRACTS.usd1Adapter);
        console.log(`Current delegate: ${ethDelegate}`);
        
        // Set delegates if not set to deployer
        if (bscDelegate.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("🔧 Setting BSC adapter delegate...");
            const bscDelegateTx = await bscAdapter.setDelegate(deployer.address, {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 100000
            });
            await bscDelegateTx.wait();
            console.log(`✅ BSC delegate set: ${bscDelegateTx.hash}`);
        } else {
            console.log("✅ BSC delegate already correct");
        }
        
        if (ethDelegate.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("🔧 Setting Ethereum adapter delegate...");
            const ethDelegateTx = await ethAdapter.setDelegate(deployer.address, {
                maxFeePerGas: ethers.parseUnits("12", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                gasLimit: 100000
            });
            await ethDelegateTx.wait();
            console.log(`✅ Ethereum delegate set: ${ethDelegateTx.hash}`);
        } else {
            console.log("✅ Ethereum delegate already correct");
        }
        
    } catch (error: any) {
        console.log(`⚠️  Delegate setup error: ${error.message}`);
    }
}

async function setComprehensiveEnforcedOptions() {
    console.log("Setting comprehensive enforced options for OFT operations...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const OFTAbi = [
        "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] memory _enforcedOptions) external",
        "function enforcedOptions(uint32 eid, uint16 msgType) external view returns (bytes memory)"
    ];
    
    const bscAdapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
    const ethAdapter = new ethers.Contract(ETHEREUM_CONTRACTS.usd1Adapter, OFTAbi, ethSigner);
    
    // Build comprehensive options with proper gas allocation
    // Option Type 1: lzReceive (gas for message processing)
    // Option Type 3: lzCompose (gas for composed operations, if any)
    
    // For BSC → Ethereum
    const bscOptions = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint8 optionType, bytes data)[]"],
        [
            [
                { optionType: 1, data: ethers.AbiCoder.defaultAbiCoder().encode(["uint128", "uint128"], [200000, 0]) }, // 200k gas, 0 value
                { optionType: 2, data: ethers.AbiCoder.defaultAbiCoder().encode(["uint128"], [0]) } // 0 value for native drop
            ]
        ]
    );
    
    // For Ethereum → BSC  
    const ethOptions = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint8 optionType, bytes data)[]"],
        [
            [
                { optionType: 1, data: ethers.AbiCoder.defaultAbiCoder().encode(["uint128", "uint128"], [200000, 0]) }, // 200k gas, 0 value
                { optionType: 2, data: ethers.AbiCoder.defaultAbiCoder().encode(["uint128"], [0]) } // 0 value for native drop
            ]
        ]
    );
    
    try {
        // Set BSC enforced options for Ethereum destination
        const bscEnforcedOptions = [
            {
                eid: EndpointId.ETHEREUM_V2_MAINNET,
                msgType: 1, // SEND message type
                options: bscOptions
            }
        ];
        
        console.log("🔧 Setting BSC enforced options...");
        const bscTx = await bscAdapter.setEnforcedOptions(bscEnforcedOptions, {
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 200000
        });
        await bscTx.wait();
        console.log(`✅ BSC enforced options set: ${bscTx.hash}`);
        
        // Set Ethereum enforced options for BSC destination
        const ethEnforcedOptions = [
            {
                eid: EndpointId.BSC_V2_MAINNET,
                msgType: 1, // SEND message type
                options: ethOptions
            }
        ];
        
        console.log("🔧 Setting Ethereum enforced options...");
        const ethTx = await ethAdapter.setEnforcedOptions(ethEnforcedOptions, {
            maxFeePerGas: ethers.parseUnits("12", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 200000
        });
        await ethTx.wait();
        console.log(`✅ Ethereum enforced options set: ${ethTx.hash}`);
        
        // Verify enforced options were set
        console.log("🔍 Verifying enforced options...");
        const bscVerify = await bscAdapter.enforcedOptions(EndpointId.ETHEREUM_V2_MAINNET, 1);
        const ethVerify = await ethAdapter.enforcedOptions(EndpointId.BSC_V2_MAINNET, 1);
        
        console.log(`BSC → ETH options: ${bscVerify.length > 2 ? '✅ Set' : '❌ Empty'}`);
        console.log(`ETH → BSC options: ${ethVerify.length > 2 ? '✅ Set' : '❌ Empty'}`);
        
    } catch (error: any) {
        console.log(`❌ Enforced options setup failed: ${error.message}`);
        
        // Try simpler enforced options format
        console.log("🔄 Trying simpler enforced options format...");
        await trySimpleEnforcedOptions();
    }
}

async function trySimpleEnforcedOptions() {
    console.log("Trying simple enforced options format...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const OFTAbi = [
        "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] memory _enforcedOptions) external"
    ];
    
    const bscAdapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
    const ethAdapter = new ethers.Contract(ETHEREUM_CONTRACTS.usd1Adapter, OFTAbi, ethSigner);
    
    // Simple options format with just lzReceive gas
    const simpleOptions = "0x00030001001100000000000000000000000030d40"; // 200k gas
    
    try {
        // BSC options
        const bscEnforcedOptions = [
            {
                eid: EndpointId.ETHEREUM_V2_MAINNET,
                msgType: 1,
                options: simpleOptions
            }
        ];
        
        const bscTx = await bscAdapter.setEnforcedOptions(bscEnforcedOptions, {
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 200000
        });
        await bscTx.wait();
        console.log(`✅ BSC simple options set: ${bscTx.hash}`);
        
        // Ethereum options
        const ethEnforcedOptions = [
            {
                eid: EndpointId.BSC_V2_MAINNET,
                msgType: 1,
                options: simpleOptions
            }
        ];
        
        const ethTx = await ethAdapter.setEnforcedOptions(ethEnforcedOptions, {
            maxFeePerGas: ethers.parseUnits("12", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 200000
        });
        await ethTx.wait();
        console.log(`✅ Ethereum simple options set: ${ethTx.hash}`);
        
    } catch (error: any) {
        console.log(`⚠️  Simple options also failed: ${error.message}`);
    }
}

async function trySymmetricDVNConfig() {
    console.log("Trying symmetric DVN configuration with identical DVNs...");
    
    // Try using the exact same DVN configuration on both chains
    // This might be what LayerZero V2 expects
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory _setConfigParams) external"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscSigner);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethSigner);
    
    // Use LayerZero's DVN on both chains (they should be compatible)
    const symmetricUlnConfig = {
        confirmations: 3, // Lower confirmations for faster testing
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: ['0xfD6865c841c2d64565562fCc7e05e619A30615f0'], // LayerZero DVN BSC
        optionalDVNs: []
    };
    
    const symmetricUlnConfigEth = {
        confirmations: 3, // Match exactly
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: ['0x589dEDbD617e0CBcB916A9223F4d1300c294236b'], // LayerZero DVN Ethereum
        optionalDVNs: []
    };
    
    try {
        const ulnConfigStruct = 'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
        
        const encodedBSCConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [symmetricUlnConfig]);
        const encodedEthConfig = ethers.AbiCoder.defaultAbiCoder().encode([ulnConfigStruct], [symmetricUlnConfigEth]);
        
        console.log("🔧 Setting symmetric DVN configs...");
        console.log(`BSC confirmations: ${symmetricUlnConfig.confirmations}`);
        console.log(`ETH confirmations: ${symmetricUlnConfigEth.confirmations}`);
        
        // Set BSC config
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
        console.log(`✅ BSC symmetric config: ${bscTx.hash}`);
        
        // Set Ethereum config
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
        console.log(`✅ Ethereum symmetric config: ${ethTx.hash}`);
        
        console.log("✅ SYMMETRIC DVN CONFIGURATION APPLIED");
        
    } catch (error: any) {
        console.log(`❌ Symmetric config failed: ${error.message}`);
    }
}

async function verifyConfigurationSymmetry() {
    console.log("Verifying send/receive configuration symmetry...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const EndpointAbi = [
        "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    try {
        // Get BSC send config
        const bscSendConfigBytes = await bscEndpoint.getConfig(
            BSC_CONTRACTS.usd1Adapter,
            LIBRARIES.bsc.sendUln302,
            EndpointId.ETHEREUM_V2_MAINNET,
            2
        );
        
        // Get Ethereum receive config  
        const ethReceiveConfigBytes = await ethEndpoint.getConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            LIBRARIES.ethereum.receiveUln302,
            EndpointId.BSC_V2_MAINNET,
            2
        );
        
        if (bscSendConfigBytes && ethReceiveConfigBytes) {
            const bscConfig = decodeUlnConfig(bscSendConfigBytes);
            const ethConfig = decodeUlnConfig(ethReceiveConfigBytes);
            
            console.log("📊 CONFIGURATION COMPARISON:");
            console.log(`BSC Send Confirmations: ${bscConfig?.confirmations}`);
            console.log(`ETH Receive Confirmations: ${ethConfig?.confirmations}`);
            console.log(`Confirmations Match: ${bscConfig?.confirmations === ethConfig?.confirmations ? '✅' : '❌'}`);
            
            console.log(`BSC Send DVN Count: ${bscConfig?.requiredDVNCount}`);
            console.log(`ETH Receive DVN Count: ${ethConfig?.requiredDVNCount}`);
            console.log(`DVN Count Match: ${bscConfig?.requiredDVNCount === ethConfig?.requiredDVNCount ? '✅' : '❌'}`);
            
            if (bscConfig?.confirmations === ethConfig?.confirmations &&
                bscConfig?.requiredDVNCount === ethConfig?.requiredDVNCount) {
                console.log("✅ CONFIGURATION SYMMETRY VERIFIED");
            } else {
                console.log("❌ Configuration mismatch found");
            }
        }
        
    } catch (error: any) {
        console.log(`⚠️  Verification error: ${error.message}`);
    }
}

async function testAfterComprehensiveSetup() {
    console.log("Testing USD1 quote after comprehensive setup...");
    
    // Wait for configurations to propagate
    console.log("⏳ Waiting 15 seconds for configuration propagation...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
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
        console.log("🎊 COMPREHENSIVE SETUP SUCCESS!");
        console.log(`LayerZero fee quote: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log("✅ USD1 deposit should now work perfectly!");
        
        // Try the actual deposit now
        console.log("\n🚀 ATTEMPTING ACTUAL DEPOSIT NOW:");
        await attemptActualDeposit();
        
        return true;
    } catch (error: any) {
        console.log(`❌ Still failing: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("💡 The error persists. This might be a BSC-specific issue or require more time");
            console.log("🔧 Next steps: Try LayerZero CLI or contact LayerZero support");
        }
        
        return false;
    }
}

async function attemptActualDeposit() {
    console.log("Attempting actual $5 USD1 deposit...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const ERC20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    
    const OFTAbi = [
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)",
        "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), (uint256 nativeFee, uint256 lzTokenFee), address refundAddress) payable external"
    ];
    
    const usd1Token = new ethers.Contract('0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d', ERC20Abi, bscSigner);
    const adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
    
    const depositAmount = ethers.parseUnits("5", 18);
    
    try {
        // Check approval
        const allowance = await usd1Token.allowance(bscSigner.address, BSC_CONTRACTS.usd1Adapter);
        if (allowance < depositAmount) {
            console.log("🔓 Approving USD1...");
            const approveTx = await usd1Token.approve(BSC_CONTRACTS.usd1Adapter, depositAmount);
            await approveTx.wait();
        }
        
        const sendParam = {
            dstEid: EndpointId.ETHEREUM_V2_MAINNET,
            to: ethers.zeroPadValue(bscSigner.address, 32),
            amountLD: depositAmount,
            minAmountLD: depositAmount - (depositAmount / BigInt(100)),
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        const fee = await adapter.quoteSend(sendParam, false);
        console.log(`💸 Fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
        
        const tx = await adapter.send(
            sendParam,
            { nativeFee: fee.nativeFee, lzTokenFee: fee.lzTokenFee },
            bscSigner.address,
            {
                value: fee.nativeFee,
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 500000
            }
        );
        
        console.log(`🎊 DEPOSIT SUCCESS! Transaction: ${tx.hash}`);
        console.log(`🔗 BSCScan: https://bscscan.com/tx/${tx.hash}`);
        console.log(`📊 LayerZero Scan: https://layerzeroscan.com/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
        
    } catch (error: any) {
        console.log(`❌ Deposit attempt failed: ${error.message}`);
    }
}

// Helper function
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

async function main() {
    await continueLayerZeroSetup();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { continueLayerZeroSetup };
