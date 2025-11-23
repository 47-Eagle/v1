import { ethers } from 'ethers';
import { EthereumService } from './ethereumService';
import { PriceService } from './priceService';
import { config } from '../config';

export interface SwapEvent {
  poolId: string;
  sender: string;
  actualTrader: string; // The real user who initiated the transaction
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  fee: number;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface ProcessedSwap extends SwapEvent {
  isBuy: boolean;
  buyToken: string;
  buyAmount: string;
  sellToken: string;
  sellAmount: string;
  valueUSD: number | null;
  token0Info?: { name: string; symbol: string; decimals: number; address: string };
  token1Info?: { name: string; symbol: string; decimals: number; address: string };
  chainName: string;
}

export class PoolMonitor {
  private ethereumService: EthereumService;
  private priceService: PriceService;
  private poolTokenCache: Map<string, { token0: string; token1: string }> = new Map();

  constructor(ethereumService: EthereumService, priceService: PriceService) {
    this.ethereumService = ethereumService;
    this.priceService = priceService;
  }

  async startMonitoring(onSwap: (swap: ProcessedSwap) => void): Promise<void> {
    const poolManager = this.ethereumService.getPoolManagerContract();
    const chainName = this.ethereumService.chainConfig.name;
    
    console.log(`Starting Uniswap V4 pool monitoring on ${chainName}...`);
    console.log(`Pool Manager (${chainName}):`, this.ethereumService.chainConfig.poolManager);
    
    // Listen for Swap events
    poolManager.on(
      'Swap',
      async (
        poolId: string,
        sender: string,
        amount0: bigint,
        amount1: bigint,
        sqrtPriceX96: bigint,
        liquidity: bigint,
        tick: number,
        fee: number,
        event: ethers.Log
      ) => {
        try {
          // Filter by monitored pools if specified
          const monitoredPools = this.ethereumService.chainConfig.monitoredPools;
          if (
            monitoredPools.length > 0 &&
            !monitoredPools.includes(poolId)
          ) {
            // Silently skip pools not in monitored list
            return;
          }

          const block = await event.getBlock();
          
          // Get the actual trader address from the transaction
          const tx = await event.getTransaction();
          const actualTrader = tx.from;
          
          // Get transaction hash - try multiple sources
          const txHash = tx.hash || event.transactionHash || 'unknown';
          
          if (txHash === 'unknown') {
            console.warn(`⚠️  Could not get transaction hash for swap event on ${chainName}`);
            return; // Skip this swap if we can't get the hash
          }
          
          const swapEvent: SwapEvent = {
            poolId,
            sender,
            actualTrader,
            amount0,
            amount1,
            sqrtPriceX96,
            liquidity,
            tick,
            fee,
            txHash,
            blockNumber: block.number,
            timestamp: block.timestamp,
          };

          const processedSwap = await this.processSwap(swapEvent);
          
          // Filter by minimum USD value if configured
          if (
            config.filters.minBuyAmountUSD > 0 &&
            processedSwap.valueUSD !== null &&
            processedSwap.valueUSD < config.filters.minBuyAmountUSD
          ) {
            console.log(
              `Swap value ($${processedSwap.valueUSD.toFixed(2)}) below minimum threshold on ${chainName}, skipping...`
            );
            return;
          }

          onSwap(processedSwap);
        } catch (error) {
          console.error(`Error processing swap event on ${chainName}:`, error);
        }
      }
    );

    // Listen for Initialize events to track pool tokens
    poolManager.on(
      'Initialize',
      async (
        poolId: string,
        currency0: string,
        currency1: string,
        fee: number,
        tickSpacing: number,
        hooks: string,
        sqrtPriceX96: bigint,
        tick: number
      ) => {
        console.log(`\n🆕 New pool initialized on ${chainName}: ${poolId}`);
        console.log(`Token0: ${currency0}, Token1: ${currency1}`);
        
        this.poolTokenCache.set(poolId, {
          token0: currency0,
          token1: currency1,
        });
      }
    );

    console.log(`✅ Monitoring started successfully on ${chainName}!`);
  }

  private async processSwap(swap: SwapEvent): Promise<ProcessedSwap> {
    // Get pool tokens from cache or fetch from Initialize event
    let poolTokens = this.poolTokenCache.get(swap.poolId);
    
    if (!poolTokens) {
      // If not in cache, try to fetch from recent Initialize events
      console.log(`Fetching pool info for ${swap.poolId} on ${this.ethereumService.chainConfig.name}...`);
      try {
        const poolManager = this.ethereumService.getPoolManagerContract();
        const filter = poolManager.filters.Initialize(swap.poolId);
        
        // Try a small block range first (RPC limit)
        const events = await poolManager.queryFilter(filter, -1000, 'latest'); // Increased range slightly
        
        if (events.length > 0 && 'args' in events[0]) {
          const args = events[0].args;
          poolTokens = {
            token0: args.currency0,
            token1: args.currency1,
          };
          this.poolTokenCache.set(swap.poolId, poolTokens);
          console.log(`✅ Found pool info in cache`);
        } else {
           console.log(`⚠️  Pool not found in recent blocks, using fallback`);
          poolTokens = {
            token0: '0x0000000000000000000000000000000000000000',
            token1: '0x0000000000000000000000000000000000000000',
          };
        }
      } catch (error) {
        console.error(`Error fetching pool info:`, error);
        poolTokens = {
          token0: '0x0000000000000000000000000000000000000000',
          token1: '0x0000000000000000000000000000000000000000',
        };
      }
    }
    
    let isBuy = false;
    const monitoredToken = config.filters.monitoredToken.toLowerCase();
    
    if (poolTokens.token0.toLowerCase() === monitoredToken) {
        isBuy = swap.amount0 < 0n;
    } else if (poolTokens.token1.toLowerCase() === monitoredToken) {
        isBuy = swap.amount1 < 0n;
    } else {
        isBuy = swap.amount1 > 0n;
    }

    // Fetch token information
    const [token0InfoRaw, token1InfoRaw] = await Promise.all([
      this.ethereumService.getTokenInfo(poolTokens.token0),
      this.ethereumService.getTokenInfo(poolTokens.token1),
    ]);
    
    // Add addresses to token info
    const token0Info = { ...token0InfoRaw, address: poolTokens.token0 };
    const token1Info = { ...token1InfoRaw, address: poolTokens.token1 };

    // Calculate USD value
    const valueUSD = await this.priceService.calculateSwapValueUSD(
      poolTokens.token0,
      poolTokens.token1,
      swap.amount0,
      swap.amount1,
      token0Info.decimals,
      token1Info.decimals,
      this.ethereumService.chainConfig.wethAddress
    );

    const isBuyingToken0 = swap.amount0 < 0n; 
    
    const displayBuyToken = isBuyingToken0 ? poolTokens.token0 : poolTokens.token1;
    const displaySellToken = isBuyingToken0 ? poolTokens.token1 : poolTokens.token0;
    
    const buyAmount = this.ethereumService.formatAmount(
      isBuyingToken0 ? (swap.amount0 * -1n) : (swap.amount1 * -1n), // output amount is negative
      isBuyingToken0 ? token0Info.decimals : token1Info.decimals
    );
    const sellAmount = this.ethereumService.formatAmount(
      isBuyingToken0 ? swap.amount1 : swap.amount0, // input amount is positive
      isBuyingToken0 ? token1Info.decimals : token0Info.decimals
    );

    return {
      ...swap,
      isBuy,
      buyToken: displayBuyToken,
      buyAmount: buyAmount.replace('-', ''), // ensure no negative sign
      sellToken: displaySellToken,
      sellAmount: sellAmount,
      valueUSD,
      token0Info,
      token1Info,
      chainName: this.ethereumService.chainConfig.name
    };
  }

  stopMonitoring(): void {
    const poolManager = this.ethereumService.getPoolManagerContract();
    poolManager.removeAllListeners();
    console.log(`Monitoring stopped on ${this.ethereumService.chainConfig.name}`);
  }
}
