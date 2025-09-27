import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const TOKEN_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';

const ERC20Abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function name() external view returns (string)",
    "function totalSupply() external view returns (uint256)"
];

async function checkSpecificToken() {
    console.log("🔍 CHECKING YOUR SPECIFIC TOKEN");
    console.log("==============================");
    console.log(`Token Address: ${TOKEN_ADDRESS}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Wallet: ${deployer.address}`);
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    
    try {
        const token = new ethers.Contract(TOKEN_ADDRESS, ERC20Abi, bscProvider);
        
        // Get token info
        const [name, symbol, decimals, balance, totalSupply] = await Promise.all([
            token.name(),
            token.symbol(), 
            token.decimals(),
            token.balanceOf(deployer.address),
            token.totalSupply()
        ]);
        
        const formattedBalance = ethers.formatUnits(balance, decimals);
        const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals);
        
        console.log("\n📊 TOKEN DETAILS:");
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Your Balance: ${formattedBalance} ${symbol}`);
        console.log(`Total Supply: ${formattedTotalSupply} ${symbol}`);
        
        // Check if you have enough for deposit
        const balanceValue = parseFloat(formattedBalance);
        console.log("\n💰 DEPOSIT ANALYSIS:");
        
        if (balanceValue >= 10) {
            console.log(`✅ You have ${balanceValue} ${symbol} - sufficient for $5 + $5 deposit!`);
        } else if (balanceValue >= 5) {
            console.log(`✅ You have ${balanceValue} ${symbol} - sufficient for $5 deposit!`);
        } else if (balanceValue > 0) {
            console.log(`⚠️  You have ${balanceValue} ${symbol} - can do smaller test deposit`);
        } else {
            console.log(`❌ No balance of this token`);
        }
        
        // Check if this is a stablecoin or known token
        console.log("\n🔍 TOKEN TYPE ANALYSIS:");
        if (symbol.includes('USD') || symbol.includes('USDT') || symbol.includes('USDC') || symbol.includes('BUSD') || symbol.includes('DAI')) {
            console.log(`✅ Appears to be a stablecoin (${symbol}) - perfect for deposits!`);
        } else if (symbol.includes('WLFI') || name.toLowerCase().includes('wlfi')) {
            console.log(`✅ This appears to be WLFI token!`);
        } else {
            console.log(`ℹ️  This is ${name} (${symbol}) - can still use for deposits`);
        }
        
        // If you have a balance, let's set up the deposit
        if (balanceValue > 0) {
            console.log("\n🚀 READY TO DEPOSIT!");
            console.log(`We can use your ${formattedBalance} ${symbol} for the cross-chain deposit`);
            
            if (balanceValue >= 10) {
                console.log("📋 Suggested: Full $5 + $5 combined deposit");
            } else if (balanceValue >= 5) {
                console.log("📋 Suggested: Single $5 deposit");
            } else {
                console.log(`📋 Suggested: Test deposit with ${Math.floor(balanceValue)} tokens`);
            }
        }
        
        return {
            hasBalance: balanceValue > 0,
            balance: formattedBalance,
            symbol,
            name,
            decimals,
            tokenAddress: TOKEN_ADDRESS
        };
        
    } catch (error: any) {
        console.log(`❌ Error checking token: ${error.message}`);
        
        if (error.message.includes('call revert')) {
            console.log("💡 This might not be a valid ERC20 token on BSC");
        }
        
        return null;
    }
}

async function main() {
    const tokenInfo = await checkSpecificToken();
    
    if (tokenInfo && tokenInfo.hasBalance) {
        console.log("\n🎯 NEXT STEP:");
        console.log("I can create a custom deposit script using your token!");
        console.log(`Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
        console.log(`Balance: ${tokenInfo.balance}`);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { checkSpecificToken };
