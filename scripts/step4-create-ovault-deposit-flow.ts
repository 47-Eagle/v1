import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688',
    usd1Token: '0x55d398326f99059fF775485246999027B3197955',
    wlfiToken: '0x...' // UPDATE WITH ACTUAL BSC WLFI ADDRESS
};

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',
    shareOFT: '0x68cF24743CA335ae3c2e21c2538F4E929224F096',
    composer: '0x...' // UPDATE WITH ACTUAL COMPOSER ADDRESS FROM DEPLOYMENT
};

// LayerZero endpoint IDs
const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

const OFTAdapterAbi = [
    "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), (uint256 nativeFee, uint256 lzTokenFee), address refundAddress) payable external returns ((bytes32 guid, uint64 nonce, (uint256 nativeFee, uint256 lzTokenFee) fee))",
    "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)",
    "function balanceOf(address account) external view returns (uint256)"
];

const ERC20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

const VaultAbi = [
    "function previewDeposit(uint256 assets) external view returns (uint256 shares)",
    "function previewRedeem(uint256 shares) external view returns (uint256 assets)",
    "function asset() external view returns (address)"
];

// Helper function to convert address to bytes32
function addressToBytes32(address: string): string {
    return ethers.zeroPadValue(address, 32);
}

async function executeOVaultDeposit(
    tokenType: 'USD1' | 'WLFI',
    amountUSD: number,
    finalDestination: 'BSC' | 'ETHEREUM',
    slippagePercent: number = 2.0
) {
    console.log("🏦 OVAULT DEPOSIT EXECUTION");
    console.log("=========================");
    console.log(`Token: ${tokenType}`);
    console.log(`Amount: $${amountUSD}`);
    console.log(`Final destination: ${finalDestination}`);
    console.log(`Slippage tolerance: ${slippagePercent}%`);

    const [deployer] = await ethers.getSigners();
    console.log(`👤 User: ${deployer.address}`);

    // Connect to BSC
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);

    // Get contracts
    const adapterAddress = tokenType === 'USD1' ? BSC_CONTRACTS.usd1Adapter : BSC_CONTRACTS.wlfiAdapter;
    const tokenAddress = tokenType === 'USD1' ? BSC_CONTRACTS.usd1Token : BSC_CONTRACTS.wlfiToken;
    
    const adapter = new ethers.Contract(adapterAddress, OFTAdapterAbi, bscSigner);
    const token = new ethers.Contract(tokenAddress, ERC20Abi, bscSigner);

    // Convert USD to token amount (assuming 1:1 for stablecoins, adjust for WLFI)
    const tokenAmount = ethers.parseUnits(amountUSD.toString(), 18);
    console.log(`📊 Token amount: ${ethers.formatEther(tokenAmount)} ${tokenType}`);

    // Check balances
    const userBalance = await token.balanceOf(deployer.address);
    console.log(`💰 Current balance: ${ethers.formatEther(userBalance)} ${tokenType}`);

    if (userBalance < tokenAmount) {
        console.log("❌ Insufficient token balance");
        return;
    }

    // Check and set approval
    const currentAllowance = await token.allowance(deployer.address, adapterAddress);
    if (currentAllowance < tokenAmount) {
        console.log("🔓 Approving token spend...");
        const approveTx = await token.approve(adapterAddress, tokenAmount);
        await approveTx.wait();
        console.log(`✅ Approved: ${approveTx.hash}`);
    }

    // Estimate vault shares (connect to Ethereum to preview)
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    const vault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, VaultAbi, ethProvider);
    
    const expectedShares = await vault.previewDeposit(tokenAmount);
    const minShares = (expectedShares * BigInt(Math.floor((100 - slippagePercent) * 100))) / BigInt(10000);
    
    console.log(`📈 Expected shares: ${ethers.formatEther(expectedShares)}`);
    console.log(`📉 Min shares (${slippagePercent}% slippage): ${ethers.formatEther(minShares)}`);

    // Build compose message for second hop (vault operation result routing)
    const finalDestinationEid = finalDestination === 'BSC' ? EndpointId.BSC_V2_MAINNET : EndpointId.ETHEREUM_V2_MAINNET;
    
    const composeMsg = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd)", "uint256"],
        [
            {
                dstEid: finalDestinationEid,
                to: addressToBytes32(deployer.address), // Final recipient
                amountLD: 0, // Will be updated by composer with actual vault output
                minAmountLD: minShares, // Critical: slippage protection for vault output
                extraOptions: "0x", // No additional options for final delivery
                composeMsg: "0x", // No nested compose
                oftCmd: "0x" // No OFT command
            },
            ethers.parseEther("0.01") // Minimum msg.value for second hop (adjust based on destination)
        ]
    );

    // Build SendParam - CRITICAL: Send to COMPOSER, not adapter!
    const sendParam = {
        dstEid: EndpointId.ETHEREUM_V2_MAINNET, // Always go to hub first
        to: addressToBytes32(ETHEREUM_CONTRACTS.composer), // ← COMPOSER ADDRESS!
        amountLD: tokenAmount,
        minAmountLD: tokenAmount - (tokenAmount * BigInt(100)) / BigInt(10000), // 1% slippage on transfer
        extraOptions: "0x", // Enforced options will be used automatically
        composeMsg: composeMsg, // Critical: Contains vault operation instructions
        oftCmd: "0x"
    };

    console.log("\n📝 SEND PARAMETERS:");
    console.log(`Destination: Hub (Ethereum) - EID ${sendParam.dstEid}`);
    console.log(`To: Composer - ${ETHEREUM_CONTRACTS.composer}`);
    console.log(`Amount: ${ethers.formatEther(sendParam.amountLD)} ${tokenType}`);
    console.log(`Compose Message: ${composeMsg.slice(0, 50)}...`);

    // Quote the fee
    console.log("\n💸 CALCULATING LAYERZERO FEES:");
    try {
        const fee = await adapter.quoteSend(sendParam, false); // Pay in native BNB
        console.log(`Native fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log(`LZ token fee: ${ethers.formatEther(fee.lzTokenFee)} LZ`);

        // Check BNB balance
        const bnbBalance = await bscProvider.getBalance(deployer.address);
        console.log(`💰 BNB balance: ${ethers.formatEther(bnbBalance)}`);

        if (bnbBalance < fee.nativeFee) {
            console.log("❌ Insufficient BNB for LayerZero fees");
            console.log(`Need: ${ethers.formatEther(fee.nativeFee)} BNB`);
            console.log(`Have: ${ethers.formatEther(bnbBalance)} BNB`);
            return;
        }

        // Execute the OVault deposit!
        console.log("\n🚀 EXECUTING OVAULT DEPOSIT:");
        console.log("This will:");
        console.log("1. Transfer tokens BSC → Ethereum adapter");
        console.log("2. Adapter calls lzReceive() → sendCompose()");
        console.log("3. Composer receives via lzCompose()");
        console.log("4. Composer deposits to vault → gets shares");
        console.log("5. Composer sends shares to final destination");

        const sendTx = await adapter.send(
            sendParam,
            { nativeFee: fee.nativeFee, lzTokenFee: fee.lzTokenFee },
            deployer.address, // refund address
            {
                value: fee.nativeFee,
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 500000
            }
        );

        console.log(`📤 Transaction sent: ${sendTx.hash}`);
        console.log(`🔗 BSCScan: https://bscscan.com/tx/${sendTx.hash}`);
        
        const receipt = await sendTx.wait();
        console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed}`);

        console.log("\n🎊 OVAULT DEPOSIT INITIATED!");
        console.log("Track progress:");
        console.log(`- LayerZero Scan: https://layerzeroscan.com/tx/${sendTx.hash}`);
        console.log("- Watch for shares arriving at final destination");
        
        if (finalDestination === 'ETHEREUM') {
            console.log(`- Check balance: Eagle Vault shares at ${ETHEREUM_CONTRACTS.vault}`);
        } else {
            console.log(`- Check balance: Share OFT at ${ETHEREUM_CONTRACTS.shareOFT} on BSC`);
        }

    } catch (error: any) {
        console.error(`❌ Deposit failed: ${error.message}`);
        
        if (error.message.includes("COMPOSER_MISSING")) {
            console.log("💡 Make sure composer address is updated in this script");
        } else if (error.message.includes("execution reverted")) {
            console.log("💡 Check if enforced options are set correctly");
        }
    }
}

async function main() {
    console.log("🎯 OVAULT DEPOSIT FLOW DEMO");
    console.log("===========================");
    
    // Example deposits as requested
    console.log("Available deposit options:");
    console.log("1. executeOVaultDeposit('USD1', 5, 'BSC', 2.0)");
    console.log("2. executeOVaultDeposit('WLFI', 5, 'BSC', 2.0)");
    console.log("3. Combined deposits (run both separately)");
    
    // Uncomment to run specific deposits:
    // await executeOVaultDeposit('USD1', 5, 'BSC', 2.0);
    // await executeOVaultDeposit('WLFI', 5, 'BSC', 2.0);

    console.log("\n⚠️  BEFORE RUNNING:");
    console.log("1. Update ETHEREUM_CONTRACTS.composer with actual address");
    console.log("2. Update BSC_CONTRACTS.wlfiToken if needed");
    console.log("3. Ensure steps 2-3 completed (enforced options + libraries)");
    console.log("4. Run step5-implement-composer-security.ts");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { executeOVaultDeposit };
