import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    usd1Token: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d'
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e'
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

const BSC_LZ_ENDPOINT_V2 = process.env.BNB_LZ_ENDPOINT_V2!;
const ETHEREUM_LZ_ENDPOINT_V2 = process.env.ETHEREUM_LZ_ENDPOINT_V2!;

// Known LayerZero libraries
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

async function fixUSD1ConfigAndDeposit() {
    console.log("🔧 FIXING USD1 CONFIG AND EXECUTING DEPOSIT");
    console.log("==========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 User: ${deployer.address}`);
    
    try {
        // Step 1: Quick DVN setup on BSC
        console.log("\n1️⃣  Setting up BSC USD1 DVN config...");
        await setupBSCDVNQuick();
        
        // Step 2: Quick DVN setup on Ethereum  
        console.log("\n2️⃣  Setting up Ethereum USD1 DVN config...");
        await setupEthereumDVNQuick();
        
        // Step 3: Execute the deposit
        console.log("\n3️⃣  Executing $5 USD1 deposit...");
        await executeUSD1Deposit();
        
    } catch (error: any) {
        console.error(`❌ Setup and deposit failed: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("\n💡 Still getting DVN error. Let's try manual configuration:");
            console.log("The LayerZero configuration needs more detailed setup");
        }
    }
}

async function setupBSCDVNQuick() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const EndpointAbi = [
        "function setConfig(address oapp, address lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory setConfigParams) external"
    ];
    
    const endpoint = new ethers.Contract(BSC_LZ_ENDPOINT_V2, EndpointAbi, bscSigner);
    
    // Basic DVN config - using LayerZero's default DVN
    const defaultDVN = '0xfd6865c841c2d64565562fCc7e05e619A30615f0'; // LayerZero DVN on BSC
    
    const ulnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint64", "uint8", "uint8", "uint8", "address[]", "address[]"],
        [
            0, // confirmations
            1, // requiredDVNCount  
            0, // optionalDVNCount
            0, // optionalDVNThreshold
            [defaultDVN], // requiredDVNs
            [] // optionalDVNs
        ]
    );
    
    const setConfigParam = {
        eid: EndpointId.ETHEREUM_V2_MAINNET,
        configType: 2, // ULN_CONFIG_TYPE
        config: ulnConfig
    };
    
    try {
        const tx = await endpoint.setConfig(
            BSC_CONTRACTS.usd1Adapter,
            LIBRARIES.bsc.sendUln302,
            [setConfigParam],
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 200000
            }
        );
        await tx.wait();
        console.log(`✅ BSC DVN config set: ${tx.hash}`);
    } catch (error: any) {
        console.log(`⚠️  BSC DVN config failed: ${error.message}`);
    }
}

async function setupEthereumDVNQuick() {
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const EndpointAbi = [
        "function setConfig(address oapp, address lib, tuple(uint32 eid, uint32 configType, bytes config)[] memory setConfigParams) external"
    ];
    
    const endpoint = new ethers.Contract(ETHEREUM_LZ_ENDPOINT_V2, EndpointAbi, ethSigner);
    
    // LayerZero's default DVN on Ethereum
    const defaultDVN = '0x589dEDbD617e0CBcB916A9223F4d1300c294236b'; 
    
    const ulnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint64", "uint8", "uint8", "uint8", "address[]", "address[]"],
        [
            0, // confirmations
            1, // requiredDVNCount
            0, // optionalDVNCount  
            0, // optionalDVNThreshold
            [defaultDVN], // requiredDVNs
            [] // optionalDVNs
        ]
    );
    
    const setConfigParam = {
        eid: EndpointId.BSC_V2_MAINNET,
        configType: 2, // ULN_CONFIG_TYPE
        config: ulnConfig
    };
    
    try {
        const tx = await endpoint.setConfig(
            ETHEREUM_CONTRACTS.usd1Adapter,
            LIBRARIES.ethereum.receiveUln302,
            [setConfigParam],
            {
                maxFeePerGas: ethers.parseUnits("10", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                gasLimit: 200000
            }
        );
        await tx.wait();
        console.log(`✅ Ethereum DVN config set: ${tx.hash}`);
    } catch (error: any) {
        console.log(`⚠️  Ethereum DVN config failed: ${error.message}`);
    }
}

async function executeUSD1Deposit() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const ERC20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    
    const OFTAbi = [
        "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), (uint256 nativeFee, uint256 lzTokenFee), address refundAddress) payable external",
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)"
    ];
    
    const usd1Token = new ethers.Contract(BSC_CONTRACTS.usd1Token, ERC20Abi, bscSigner);
    const usd1Adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
    
    const depositAmount = ethers.parseUnits("5", 18); // $5 USD1
    
    // Approve if needed
    const allowance = await usd1Token.allowance(bscSigner.address, BSC_CONTRACTS.usd1Adapter);
    if (allowance < depositAmount) {
        console.log("🔓 Approving USD1 spend...");
        const approveTx = await usd1Token.approve(BSC_CONTRACTS.usd1Adapter, depositAmount);
        await approveTx.wait();
        console.log(`✅ Approved: ${approveTx.hash}`);
    }
    
    // Build send params
    const sendParam = {
        dstEid: EndpointId.ETHEREUM_V2_MAINNET,
        to: ethers.zeroPadValue(bscSigner.address, 32), // Your Ethereum address
        amountLD: depositAmount,
        minAmountLD: depositAmount - (depositAmount / BigInt(100)), // 1% slippage
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x"
    };
    
    // Quote and send
    const fee = await usd1Adapter.quoteSend(sendParam, false);
    console.log(`💸 LayerZero fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
    
    const tx = await usd1Adapter.send(
        sendParam,
        { nativeFee: fee.nativeFee, lzTokenFee: fee.lzTokenFee },
        bscSigner.address,
        {
            value: fee.nativeFee,
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 500000
        }
    );
    
    console.log(`📤 USD1 transfer sent: ${tx.hash}`);
    console.log(`🔗 BSCScan: https://bscscan.com/tx/${tx.hash}`);
    console.log(`📊 LayerZero: https://layerzeroscan.com/tx/${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
    
    console.log("\n🎊 $5 USD1 DEPOSIT COMPLETED!");
    console.log("============================");
    console.log("Your USD1 tokens are now being transferred to Ethereum");
    console.log("They will arrive in ~5-15 minutes and be ready for vault deposits!");
}

// Main execution
async function main() {
    await fixUSD1ConfigAndDeposit();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { fixUSD1ConfigAndDeposit };
