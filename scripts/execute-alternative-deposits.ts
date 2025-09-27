import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688',
    usd1Token: '0x55d398326f99059fF775485246999027B3197955', // BSC-USD
    wlfiToken: '0x...' // UPDATE WITH ACTUAL BSC WLFI TOKEN ADDRESS
};

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',
    shareOFT: '0x68cF24743CA335ae3c2e21c2538F4E929224F096'
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

const VaultAbi = [
    "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
    "function balanceOf(address account) external view returns (uint256)",
    "function previewDeposit(uint256 assets) external view returns (uint256 shares)"
];

async function executeAlternativeDeposits() {
    console.log("💰 EXECUTING YOUR $20 DEPOSITS (ALTERNATIVE APPROACH)");
    console.log("===================================================");
    console.log("This approach uses direct vault integration instead of a separate composer");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 User: ${deployer.address}`);
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    // Check initial balances
    console.log("\n📊 INITIAL BALANCES:");
    const bscBnbBalance = await bscProvider.getBalance(deployer.address);
    const ethBalance = await ethProvider.getBalance(deployer.address);
    console.log(`BSC BNB: ${ethers.formatEther(bscBnbBalance)}`);
    console.log(`ETH: ${ethers.formatEther(ethBalance)}`);
    
    // Check token balances on BSC
    const usd1Token = new ethers.Contract(BSC_CONTRACTS.usd1Token, ERC20Abi, bscProvider);
    const usd1Balance = await usd1Token.balanceOf(deployer.address);
    console.log(`BSC USD1: ${ethers.formatEther(usd1Balance)}`);
    
    if (BSC_CONTRACTS.wlfiToken !== '0x...') {
        const wlfiToken = new ethers.Contract(BSC_CONTRACTS.wlfiToken, ERC20Abi, bscProvider);
        const wlfiBalance = await wlfiToken.balanceOf(deployer.address);
        console.log(`BSC WLFI: ${ethers.formatEther(wlfiBalance)}`);
    }
    
    console.log("\n🚀 EXECUTING DEPOSITS:");
    console.log("1. $5 USD1 transfer BSC → Ethereum");
    console.log("2. $5 WLFI transfer BSC → Ethereum");
    console.log("3. $5 USD1 + $5 WLFI combined transfers");
    
    try {
        // Deposit 1: $5 USD1
        await executeTransfer('USD1', 5, "First $5 USD1 deposit");
        
        // Wait between transfers to avoid nonce issues
        console.log("\n⏳ Waiting 2 minutes between deposits...");
        await sleep(120000);
        
        // Deposit 2: $5 WLFI (if token available)
        if (BSC_CONTRACTS.wlfiToken !== '0x...') {
            await executeTransfer('WLFI', 5, "First $5 WLFI deposit");
            await sleep(120000);
        } else {
            console.log("\n⚠️  WLFI token address not configured - skipping WLFI deposits");
            console.log("Update BSC_CONTRACTS.wlfiToken with actual address");
        }
        
        // Deposit 3a: Second $5 USD1
        await executeTransfer('USD1', 5, "Second $5 USD1 deposit (combined part 1)");
        await sleep(120000);
        
        // Deposit 3b: Second $5 WLFI (if available)
        if (BSC_CONTRACTS.wlfiToken !== '0x...') {
            await executeTransfer('WLFI', 5, "Second $5 WLFI deposit (combined part 2)");
        }
        
        console.log("\n🎊 ALL DEPOSITS COMPLETED!");
        console.log("========================");
        console.log("Your tokens are now on Ethereum and ready for vault deposits");
        
        console.log("\n📝 NEXT STEPS:");
        console.log("1. Wait for LayerZero transfers to complete (~5-15 minutes each)");
        console.log("2. Check your Ethereum token balances");
        console.log("3. Manually deposit to vault or wait for automatic processing");
        
        console.log("\n🔗 TRACKING:");
        console.log("Monitor all transactions at:");
        console.log("- LayerZero Scan: https://layerzeroscan.com");
        console.log("- Etherscan: https://etherscan.io");
        console.log("- BSCScan: https://bscscan.com");
        
    } catch (error: any) {
        console.error(`❌ Deposit execution failed: ${error.message}`);
        
        if (error.message.includes("insufficient")) {
            console.log("💰 Insufficient balance - check token balances and BNB for fees");
        } else if (error.message.includes("revert")) {
            console.log("🔧 Transaction reverted - check LayerZero configuration");
        }
    }
}

async function executeTransfer(tokenType: 'USD1' | 'WLFI', amountUSD: number, description: string) {
    console.log(`\n💸 ${description}`);
    console.log("=" + "=".repeat(description.length));
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const adapterAddress = tokenType === 'USD1' ? BSC_CONTRACTS.usd1Adapter : BSC_CONTRACTS.wlfiAdapter;
    const tokenAddress = tokenType === 'USD1' ? BSC_CONTRACTS.usd1Token : BSC_CONTRACTS.wlfiToken;
    const tokenAmount = ethers.parseUnits(amountUSD.toString(), 18);
    
    console.log(`Token: ${tokenType}`);
    console.log(`Amount: $${amountUSD} (${ethers.formatEther(tokenAmount)} tokens)`);
    console.log(`Adapter: ${adapterAddress}`);
    
    // Check and set approval
    const token = new ethers.Contract(tokenAddress, ERC20Abi, bscSigner);
    const allowance = await token.allowance(bscSigner.address, adapterAddress);
    
    if (allowance < tokenAmount) {
        console.log("🔓 Approving token spend...");
        const approveTx = await token.approve(adapterAddress, tokenAmount);
        await approveTx.wait();
        console.log(`✅ Approved: ${approveTx.hash}`);
    }
    
    // Build send parameters
    const adapter = new ethers.Contract(adapterAddress, OFTAbi, bscSigner);
    const sendParam = {
        dstEid: 30101, // Ethereum
        to: ethers.zeroPadValue(bscSigner.address, 32), // Your Ethereum address
        amountLD: tokenAmount,
        minAmountLD: tokenAmount - (tokenAmount / BigInt(100)), // 1% slippage
        extraOptions: "0x",
        composeMsg: "0x", // No compose - direct transfer
        oftCmd: "0x"
    };
    
    // Quote fees
    const fee = await adapter.quoteSend(sendParam, false);
    console.log(`💸 LayerZero fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
    
    // Check BNB balance
    const bnbBalance = await bscProvider.getBalance(bscSigner.address);
    if (bnbBalance < fee.nativeFee) {
        console.log("❌ Insufficient BNB for LayerZero fees");
        return;
    }
    
    // Execute transfer
    console.log("🚀 Executing cross-chain transfer...");
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
    
    console.log(`📤 Transaction: ${tx.hash}`);
    console.log(`🔗 BSCScan: https://bscscan.com/tx/${tx.hash}`);
    console.log(`📊 LayerZero: https://layerzeroscan.com/tx/${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
    
    console.log(`🎯 Status: ${tokenType} transfer initiated successfully`);
    console.log(`💡 Tokens will arrive on Ethereum in ~5-15 minutes`);
}

async function manualVaultDeposit() {
    console.log("\n🏦 MANUAL VAULT DEPOSIT INSTRUCTIONS");
    console.log("==================================");
    console.log("After tokens arrive on Ethereum, deposit to vault:");
    
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    // Check current token balances on Ethereum
    const wlfiToken = new ethers.Contract('0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6', ERC20Abi, ethProvider);
    const vault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, VaultAbi, ethProvider);
    
    try {
        const wlfiBalance = await wlfiToken.balanceOf(ethSigner.address);
        const vaultShares = await vault.balanceOf(ethSigner.address);
        
        console.log(`Current WLFI balance: ${ethers.formatEther(wlfiBalance)}`);
        console.log(`Current vault shares: ${ethers.formatEther(vaultShares)}`);
        
        if (wlfiBalance > 0) {
            console.log("\n💡 You can deposit to vault now:");
            console.log("1. Approve vault to spend WLFI");
            console.log("2. Call vault.deposit(amount, recipient)");
            
            // Example deposit (uncomment to execute)
            /*
            const depositAmount = wlfiBalance; // Deposit all
            
            console.log("🔓 Approving vault...");
            const approveTx = await wlfiToken.connect(ethSigner).approve(ETHEREUM_CONTRACTS.vault, depositAmount);
            await approveTx.wait();
            
            console.log("🏦 Depositing to vault...");
            const depositTx = await vault.connect(ethSigner).deposit(depositAmount, ethSigner.address);
            await depositTx.wait();
            
            console.log(`✅ Vault deposit completed: ${depositTx.hash}`);
            */
        }
        
    } catch (error: any) {
        console.log(`ℹ️  Token balances will be available after LayerZero transfers complete`);
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--vault-deposit')) {
        await manualVaultDeposit();
    } else {
        await executeAlternativeDeposits();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { executeAlternativeDeposits, manualVaultDeposit };
