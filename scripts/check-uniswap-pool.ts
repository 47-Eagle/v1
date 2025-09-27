import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const POOL_ADDRESS = "0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d";

// Uniswap V3 Pool ABI - just the functions we need
const poolAbi = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)", 
    "function fee() external view returns (uint24)",
    "function liquidity() external view returns (uint128)",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

// ERC20 ABI for token info
const erc20Abi = [
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)"
];

async function main() {
    console.log("🔍 CHECKING UNISWAP V3 POOL");
    console.log("==============================");
    console.log(`📍 Pool: ${POOL_ADDRESS}`);
    
    const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL_ETHEREUM || 'https://ethereum-rpc.publicnode.com'
    );
    
    try {
        const pool = new ethers.Contract(POOL_ADDRESS, poolAbi, provider);
        
        // Get pool info
        const token0Address = await pool.token0();
        const token1Address = await pool.token1();
        const fee = await pool.fee();
        const liquidity = await pool.liquidity();
        const slot0 = await pool.slot0();
        
        console.log(`🪙 Token0: ${token0Address}`);
        console.log(`🪙 Token1: ${token1Address}`);
        console.log(`💰 Fee: ${Number(fee) / 10000}%`);
        console.log(`🌊 Liquidity: ${liquidity.toString()}`);
        console.log(`📊 Current Tick: ${slot0[1].toString()}`);
        
        // Get token details
        const token0 = new ethers.Contract(token0Address, erc20Abi, provider);
        const token1 = new ethers.Contract(token1Address, erc20Abi, provider);
        
        const [token0Name, token0Symbol, token0Decimals] = await Promise.all([
            token0.name().catch(() => "Unknown"),
            token0.symbol().catch(() => "???"), 
            token0.decimals().catch(() => 18)
        ]);
        
        const [token1Name, token1Symbol, token1Decimals] = await Promise.all([
            token1.name().catch(() => "Unknown"),
            token1.symbol().catch(() => "???"),
            token1.decimals().catch(() => 18)
        ]);
        
        console.log("\n📝 TOKEN DETAILS:");
        console.log(`Token0: ${token0Name} (${token0Symbol}) - ${token0Decimals} decimals`);
        console.log(`Token1: ${token1Name} (${token1Symbol}) - ${token1Decimals} decimals`);
        
        // Check if this matches our tokens
        const WLFI_ETHEREUM = process.env.WLFI_ETHEREUM?.toLowerCase();
        const USD1_ETHEREUM = process.env.USD1_ETHEREUM?.toLowerCase();
        
        const isWlfiPool = (token0Address.toLowerCase() === WLFI_ETHEREUM || token1Address.toLowerCase() === WLFI_ETHEREUM);
        const isUsd1Pool = (token0Address.toLowerCase() === USD1_ETHEREUM || token1Address.toLowerCase() === USD1_ETHEREUM);
        
        console.log("\n🎯 POOL MATCH CHECK:");
        console.log(`WLFI in pool: ${isWlfiPool ? '✅' : '❌'}`);
        console.log(`USD1 in pool: ${isUsd1Pool ? '✅' : '❌'}`);
        
        if (isWlfiPool || isUsd1Pool) {
            console.log("\n🎊 PERFECT! This pool contains our vault assets!");
            console.log("This is ideal for the Charm Finance strategy.");
        } else {
            console.log("\n⚠️  This pool doesn't contain our vault assets (WLFI/USD1)");
            console.log("We might need a different pool or routing strategy.");
        }
        
    } catch (error: any) {
        console.log(`❌ Error checking pool: ${error.message}`);
        console.log("This might not be a valid Uniswap V3 pool address.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
