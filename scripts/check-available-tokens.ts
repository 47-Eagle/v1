import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Token: '0x55d398326f99059fF775485246999027B3197955', // BSC-USD (USDT)
    busdToken: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
    usdcToken: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
    wlfiToken: '0x...' // Need actual WLFI address on BSC
};

const ERC20Abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)"
];

async function checkAvailableTokens() {
    console.log("📊 CHECKING YOUR AVAILABLE TOKENS ON BSC");
    console.log("=======================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Wallet: ${deployer.address}`);
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    
    // Check BNB balance
    const bnbBalance = await bscProvider.getBalance(deployer.address);
    console.log(`💰 BNB: ${ethers.formatEther(bnbBalance)}`);
    
    console.log("\n🪙 TOKEN BALANCES:");
    
    // Check common stablecoins
    const tokens = [
        { name: 'BSC-USD (USDT)', address: BSC_CONTRACTS.usd1Token },
        { name: 'BUSD', address: BSC_CONTRACTS.busdToken },
        { name: 'USDC', address: BSC_CONTRACTS.usdcToken }
    ];
    
    let hasStablecoins = false;
    
    for (const tokenInfo of tokens) {
        try {
            const token = new ethers.Contract(tokenInfo.address, ERC20Abi, bscProvider);
            const balance = await token.balanceOf(deployer.address);
            const symbol = await token.symbol();
            const decimals = await token.decimals();
            
            const formattedBalance = ethers.formatUnits(balance, decimals);
            console.log(`${symbol}: ${formattedBalance}`);
            
            if (parseFloat(formattedBalance) >= 5.0) {
                hasStablecoins = true;
                console.log(`  ✅ Sufficient for $5 deposit!`);
            }
        } catch (error: any) {
            console.log(`${tokenInfo.name}: Error checking balance`);
        }
    }
    
    console.log("\n💡 RECOMMENDATIONS:");
    if (!hasStablecoins) {
        console.log("❌ You need stablecoins on BSC to make deposits");
        console.log("Options:");
        console.log("1. Buy USDT/BUSD/USDC on BSC");
        console.log("2. Bridge stablecoins from other chains to BSC");
        console.log("3. Use a BSC DEX to swap BNB for stablecoins");
        
        console.log("\n🔗 WHERE TO GET STABLECOINS:");
        console.log("- PancakeSwap: https://pancakeswap.finance");
        console.log("- Binance Bridge: https://www.binance.org/bridge");
        console.log("- Any BSC DEX to swap BNB → USDT");
    } else {
        console.log("✅ You have sufficient stablecoins!");
        console.log("Update the script to use your available token");
    }
    
    console.log("\n🔧 NEXT STEPS:");
    console.log("1. Get at least $10 worth of stablecoins on BSC");
    console.log("2. Update token addresses in the deposit script");
    console.log("3. Re-run the combined deposit");
}

async function main() {
    await checkAvailableTokens();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { checkAvailableTokens };
