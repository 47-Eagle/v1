import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract addresses (to be updated after deployment)
const ETHEREUM_OVAULT = {
    wlfiAssetOFT: '', // To be filled after hub deployment
    shareOFTAdapter: '', // To be filled after hub deployment
    vaultComposer: '', // To be filled after hub deployment
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0' // Existing EagleOVaultV2
};

const BSC_OVAULT = {
    wlfiAssetOFT: '', // To be filled after spoke deployment
    shareOFT: '', // To be filled after spoke deployment
    wlfiToken: process.env.BSC_WLFI_ADDRESS!
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function testOVaultDeposit() {
    console.log("🧪 TESTING LAYERZERO OVAULT DEPOSIT FLOW");
    console.log("=======================================");
    
    // Check if addresses are configured
    if (!ETHEREUM_OVAULT.wlfiAssetOFT || !BSC_OVAULT.wlfiAssetOFT) {
        console.log("❌ Contract addresses not configured in this script");
        console.log("💡 Please update the contract addresses after deployment");
        return;
    }
    
    const [user] = await ethers.getSigners();
    console.log(`👤 User: ${user.address}`);
    
    try {
        // Step 1: Check user's WLFI balance on BSC
        console.log("\n1️⃣  Checking user balances...");
        await checkBalances();
        
        // Step 2: Approve WLFI Asset OFT to spend user's WLFI
        console.log("\n2️⃣  Approving WLFI Asset OFT...");
        await approveWLFI();
        
        // Step 3: Execute omnichain deposit
        console.log("\n3️⃣  Executing omnichain deposit...");
        await executeOVaultDeposit();
        
        // Step 4: Verify deposit results
        console.log("\n4️⃣  Verifying deposit results...");
        await verifyDepositResults();
        
        console.log("\n🎊 OVAULT DEPOSIT TEST COMPLETE!");
        
    } catch (error: any) {
        console.error(`❌ OVault deposit test failed: ${error.message}`);
        
        if (error.message.includes('0x6780cfaf')) {
            console.log("💡 DVN configuration error detected");
            console.log("🔧 This should be resolved with proper OVault implementation");
        }
    }
}

async function checkBalances() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const user = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const ERC20Abi = ["function balanceOf(address) external view returns (uint256)"];
    
    // Check BNB balance for fees
    const bnbBalance = await bscProvider.getBalance(user.address);
    console.log(`💰 BNB Balance: ${ethers.formatEther(bnbBalance)} BNB`);
    
    // Check WLFI balance on BSC
    const wlfiToken = new ethers.Contract(BSC_OVAULT.wlfiToken, ERC20Abi, bscProvider);
    const wlfiBalance = await wlfiToken.balanceOf(user.address);
    console.log(`🪙 WLFI Balance (BSC): ${ethers.formatEther(wlfiBalance)} WLFI`);
    
    // Check Share OFT balance on BSC (should be 0 initially)
    const shareOFT = new ethers.Contract(BSC_OVAULT.shareOFT, ERC20Abi, bscProvider);
    const shareBalance = await shareOFT.balanceOf(user.address);
    console.log(`📈 Share OFT Balance (BSC): ${ethers.formatEther(shareBalance)} eVault`);
    
    if (bnbBalance < ethers.parseEther("0.005")) {
        console.log("⚠️  Low BNB balance - may need more for LayerZero fees");
    }
    
    if (wlfiBalance < ethers.parseEther("1")) {
        console.log("⚠️  Low WLFI balance - deposit amount will be minimal");
    }
}

async function approveWLFI() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const user = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const ERC20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    
    const wlfiToken = new ethers.Contract(BSC_OVAULT.wlfiToken, ERC20Abi, user);
    
    // Check current allowance
    const currentAllowance = await wlfiToken.allowance(user.address, BSC_OVAULT.wlfiAssetOFT);
    console.log(`Current allowance: ${ethers.formatEther(currentAllowance)} WLFI`);
    
    if (currentAllowance < ethers.parseEther("100")) {
        console.log("🔧 Approving WLFI Asset OFT to spend WLFI...");
        const approveTx = await wlfiToken.approve(
            BSC_OVAULT.wlfiAssetOFT,
            ethers.MaxUint256,
            {
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 100000
            }
        );
        await approveTx.wait();
        console.log(`✅ WLFI approved: ${approveTx.hash}`);
    } else {
        console.log("✅ WLFI already approved");
    }
}

async function executeOVaultDeposit() {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const user = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const OFTAbi = [
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)",
        "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) calldata _sendParam, (uint256 nativeFee, uint256 lzTokenFee) calldata _fee, address _refundAddress) external payable"
    ];
    
    const assetOFT = new ethers.Contract(BSC_OVAULT.wlfiAssetOFT, OFTAbi, user);
    
    // Deposit parameters
    const depositAmount = ethers.parseEther("5"); // 5 WLFI
    const minShares = ethers.parseEther("4.5"); // Minimum 4.5 shares (10% slippage)
    
    // Compose message for VaultComposerSync
    const composeData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256"], // operation type, minShares
        [0, minShares] // 0 = deposit operation
    );
    
    const sendParam = {
        dstEid: EndpointId.ETHEREUM_V2_MAINNET,
        to: ethers.zeroPadValue(user.address, 32), // User address on destination
        amountLD: depositAmount,
        minAmountLD: ethers.parseEther("4.9"), // 2% slippage on asset transfer
        extraOptions: "0x", // Will use enforced options
        composeMsg: composeData, // Parameters for VaultComposerSync
        oftCmd: "0x"
    };
    
    // Get LayerZero fee quote
    console.log("💰 Calculating LayerZero fees...");
    const fee = await assetOFT.quoteSend(sendParam, false);
    console.log(`LayerZero Fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
    
    // Execute deposit
    console.log(`🚀 Depositing ${ethers.formatEther(depositAmount)} WLFI to Ethereum vault...`);
    const depositTx = await assetOFT.send(
        sendParam,
        fee,
        user.address, // Refund address
        {
            value: fee.nativeFee,
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 500000
        }
    );
    
    console.log(`⏳ Transaction submitted: ${depositTx.hash}`);
    const receipt = await depositTx.wait();
    console.log(`✅ Deposit transaction confirmed: ${depositTx.hash}`);
    
    // Check for events
    if (receipt && receipt.logs) {
        console.log(`📋 Transaction had ${receipt.logs.length} logs`);
        // Could decode logs here to show OFT events
    }
}

async function verifyDepositResults() {
    console.log("⏳ Waiting for cross-chain message processing...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const user = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const ERC20Abi = ["function balanceOf(address) external view returns (uint256)"];
    
    // Check new Share OFT balance
    const shareOFT = new ethers.Contract(BSC_OVAULT.shareOFT, ERC20Abi, bscProvider);
    const newShareBalance = await shareOFT.balanceOf(user.address);
    console.log(`📈 New Share OFT Balance: ${ethers.formatEther(newShareBalance)} eVault`);
    
    if (newShareBalance > 0) {
        console.log("🎊 SUCCESS! Omnichain vault deposit completed!");
        console.log("✅ User received vault shares on BSC");
        console.log("💡 User can now redeem shares for underlying assets");
    } else {
        console.log("⚠️  No shares received yet - may still be processing");
        console.log("💡 Cross-chain messages can take a few minutes");
        console.log("🔍 Check LayerZero explorer for message status");
    }
    
    // Show LayerZero explorer links
    console.log("\n🔗 LayerZero Explorer:");
    console.log("https://layerzeroscan.com/");
    console.log("Search for your transaction hash to track cross-chain message");
}

async function main() {
    await testOVaultDeposit();
    
    console.log("\n📋 TESTING COMPLETE");
    console.log("===================");
    console.log("If successful, your LayerZero OVault is working!");
    console.log("Users can deposit from BSC and receive vault shares!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Test redemptions (shares → assets)");
    console.log("2. Add more spoke chains");
    console.log("3. Integrate with frontend");
}

// Helper function to update contract addresses
export function updateOVaultAddresses(
    ethWlfiAssetOFT: string,
    ethShareAdapter: string,
    ethVaultComposer: string,
    bscWlfiAssetOFT: string,
    bscShareOFT: string
) {
    // This would normally be done via config file
    console.log("📝 Contract addresses to update:");
    console.log(`ETHEREUM_OVAULT.wlfiAssetOFT = "${ethWlfiAssetOFT}"`);
    console.log(`ETHEREUM_OVAULT.shareOFTAdapter = "${ethShareAdapter}"`);
    console.log(`ETHEREUM_OVAULT.vaultComposer = "${ethVaultComposer}"`);
    console.log(`BSC_OVAULT.wlfiAssetOFT = "${bscWlfiAssetOFT}"`);
    console.log(`BSC_OVAULT.shareOFT = "${bscShareOFT}"`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { testOVaultDeposit };
