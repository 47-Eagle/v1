import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688',
    usd1Token: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d', // World Liberty Financial USD
    wlfiToken: '0x...' // UPDATE WITH ACTUAL BSC WLFI TOKEN ADDRESS IF AVAILABLE
};

const OFTAbi = [
    "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), (uint256 nativeFee, uint256 lzTokenFee), address refundAddress) payable external",
    "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)",
    "function balanceOf(address account) external view returns (uint256)"
];

const ERC20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

async function executeCombinedDeposit() {
    console.log("💰 EXECUTING COMBINED $5 USD1 + $5 WLFI DEPOSIT");
    console.log("==============================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 User: ${deployer.address}`);
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    // Check initial balances
    console.log("\n📊 CHECKING BALANCES:");
    const bnbBalance = await bscProvider.getBalance(deployer.address);
    console.log(`BNB: ${ethers.formatEther(bnbBalance)}`);
    
    const usd1Token = new ethers.Contract(BSC_CONTRACTS.usd1Token, ERC20Abi, bscProvider);
    const usd1Balance = await usd1Token.balanceOf(deployer.address);
    console.log(`USD1: ${ethers.formatEther(usd1Balance)}`);
    
    // Check if we have enough USD1
    const usd1Amount = ethers.parseUnits("5", 18); // $5 USD1
    if (usd1Balance < usd1Amount) {
        console.log("❌ Insufficient USD1 balance for $5 deposit");
        console.log(`Need: ${ethers.formatEther(usd1Amount)}`);
        console.log(`Have: ${ethers.formatEther(usd1Balance)}`);
        return;
    }
    
    // Check WLFI if address is provided
    let hasWLFI = false;
    let wlfiAmount = ethers.parseUnits("5", 18); // $5 WLFI
    
    if (BSC_CONTRACTS.wlfiToken !== '0x...') {
        const wlfiToken = new ethers.Contract(BSC_CONTRACTS.wlfiToken, ERC20Abi, bscProvider);
        const wlfiBalance = await wlfiToken.balanceOf(deployer.address);
        console.log(`WLFI: ${ethers.formatEther(wlfiBalance)}`);
        
        if (wlfiBalance >= wlfiAmount) {
            hasWLFI = true;
        } else {
            console.log("⚠️  Insufficient WLFI balance - will only do USD1 part");
        }
    } else {
        console.log("⚠️  WLFI token address not configured - will only do USD1 part");
    }
    
    console.log("\n🚀 EXECUTING COMBINED DEPOSIT:");
    console.log("===============================");
    
    try {
        // Part 1: $5 USD1 Transfer
        console.log("\n1️⃣  $5 USD1 Transfer (BSC → Ethereum)");
        const usd1TxHash = await executeTransfer('USD1', 5);
        
        if (hasWLFI) {
            // Wait between transfers to avoid nonce conflicts
            console.log("\n⏳ Waiting 30 seconds between transfers...");
            await sleep(30000);
            
            // Part 2: $5 WLFI Transfer
            console.log("\n2️⃣  $5 WLFI Transfer (BSC → Ethereum)");
            const wlfiTxHash = await executeTransfer('WLFI', 5);
            
            console.log("\n🎊 COMBINED DEPOSIT COMPLETED!");
            console.log("============================");
            console.log(`✅ USD1 Transaction: ${usd1TxHash}`);
            console.log(`✅ WLFI Transaction: ${wlfiTxHash}`);
            console.log(`💰 Total: $10 ($5 USD1 + $5 WLFI)`);
        } else {
            console.log("\n✅ USD1 DEPOSIT COMPLETED!");
            console.log("=========================");
            console.log(`✅ USD1 Transaction: ${usd1TxHash}`);
            console.log(`💰 Total: $5 USD1 only (WLFI not available)`);
        }
        
        console.log("\n📝 NEXT STEPS:");
        console.log("1. Monitor LayerZero transfers (~5-15 minutes each)");
        console.log("2. Tokens will arrive in your Ethereum wallet");
        console.log("3. Manually deposit to Eagle Vault for yield generation");
        
        console.log("\n🔗 TRACK PROGRESS:");
        console.log(`- LayerZero Scan: https://layerzeroscan.com`);
        console.log(`- BSCScan: https://bscscan.com`);
        console.log(`- Etherscan: https://etherscan.io`);
        
    } catch (error: any) {
        console.error(`❌ Combined deposit failed: ${error.message}`);
    }
}

async function executeTransfer(tokenType: 'USD1' | 'WLFI', amountUSD: number): Promise<string> {
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const adapterAddress = tokenType === 'USD1' ? BSC_CONTRACTS.usd1Adapter : BSC_CONTRACTS.wlfiAdapter;
    const tokenAddress = tokenType === 'USD1' ? BSC_CONTRACTS.usd1Token : BSC_CONTRACTS.wlfiToken;
    const tokenAmount = ethers.parseUnits(amountUSD.toString(), 18);
    
    console.log(`📤 Transferring ${amountUSD} ${tokenType} via LayerZero...`);
    
    // Check and approve if needed
    const token = new ethers.Contract(tokenAddress, ERC20Abi, bscSigner);
    const allowance = await token.allowance(bscSigner.address, adapterAddress);
    
    if (allowance < tokenAmount) {
        console.log(`🔓 Approving ${tokenType} spend...`);
        const approveTx = await token.approve(adapterAddress, tokenAmount);
        await approveTx.wait();
        console.log(`✅ ${tokenType} approved`);
    }
    
    // Setup transfer parameters
    const adapter = new ethers.Contract(adapterAddress, OFTAbi, bscSigner);
    const sendParam = {
        dstEid: 30101, // Ethereum
        to: ethers.zeroPadValue(bscSigner.address, 32), // Your Ethereum address
        amountLD: tokenAmount,
        minAmountLD: tokenAmount - (tokenAmount / BigInt(100)), // 1% slippage
        extraOptions: "0x",
        composeMsg: "0x", // Direct transfer (no compose)
        oftCmd: "0x"
    };
    
    // Quote LayerZero fees
    const fee = await adapter.quoteSend(sendParam, false);
    console.log(`💸 LayerZero fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
    
    // Execute transfer
    const tx = await adapter.send(
        sendParam,
        { nativeFee: fee.nativeFee, lzTokenFee: fee.lzTokenFee },
        bscSigner.address,
        {
            value: fee.nativeFee,
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 400000
        }
    );
    
    console.log(`📤 ${tokenType} transfer sent: ${tx.hash}`);
    console.log(`🔗 BSCScan: https://bscscan.com/tx/${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ ${tokenType} confirmed in block ${receipt.blockNumber}`);
    
    return tx.hash;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
    await executeCombinedDeposit();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { executeCombinedDeposit };
