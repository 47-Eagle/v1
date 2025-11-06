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
    
    console.log('Starting Uniswap V4 pool monitoring...');
    console.log('Pool Manager:', config.uniswapV4.poolManager);
    
    // Pre-populate known pools to avoid RPC calls
    // EAGLE/ETH pool
    this.poolTokenCache.set(
      '0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333',
      {
        token0: '0x0000000000000000000000000000000000000000', // ETH
        token1: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E', // EAGLE
      }
    );

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
          if (
            config.uniswapV4.monitoredPools.length > 0 &&
            !config.uniswapV4.monitoredPools.includes(poolId)
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
            console.warn('⚠️  Could not get transaction hash for swap event');
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
              `Swap value ($${processedSwap.valueUSD.toFixed(2)}) below minimum threshold, skipping...`
            );
            return;
          }

          onSwap(processedSwap);
        } catch (error) {
          console.error('Error processing swap event:', error);
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
        console.log(`\n🆕 New pool initialized: ${poolId}`);
        console.log(`Token0: ${currency0}, Token1: ${currency1}`);
        
        this.poolTokenCache.set(poolId, {
          token0: currency0,
          token1: currency1,
        });
      }
    );

    console.log('✅ Monitoring started successfully!');
  }

  private async processSwap(swap: SwapEvent): Promise<ProcessedSwap> {
    // Get pool tokens from cache or fetch from Initialize event
    let poolTokens = this.poolTokenCache.get(swap.poolId);
    
    if (!poolTokens) {
      // If not in cache, try to fetch from recent Initialize events
      console.log(`Fetching pool info for ${swap.poolId}...`);
      try {
        const poolManager = this.ethereumService.getPoolManagerContract();
        const filter = poolManager.filters.Initialize(swap.poolId);
        
        // Try a small block range first (Alchemy free tier limit)
        const events = await poolManager.queryFilter(filter, -10, 'latest');
        
        if (events.length > 0 && 'args' in events[0]) {
          const args = events[0].args;
          poolTokens = {
            token0: args.currency0,
            token1: args.currency1,
          };
          this.poolTokenCache.set(swap.poolId, poolTokens);
          console.log(`✅ Found pool info in cache`);
        } else {
          // Pool initialized earlier - use fallback
          console.log(`⚠️  Pool not found in recent blocks, using fallback`);
          poolTokens = {
            token0: '0x0000000000000000000000000000000000000000',
            token1: '0x0000000000000000000000000000000000000000',
          };
        }
      } catch (error) {
        console.error(`Error fetching pool info:`, error);
        // Use fallback
        poolTokens = {
          token0: '0x0000000000000000000000000000000000000000',
          token1: '0x0000000000000000000000000000000000000000',
        };
      }
    }
    
    // Determine if this is a buy (amount1 < 0 means buying token0, amount0 < 0 means buying token1)
    const isBuyingToken0 = swap.amount1 < 0n;
    const isBuy = isBuyingToken0;

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
      token1Info.decimals
    );

    const buyToken = isBuyingToken0 ? poolTokens.token0 : poolTokens.token1;
    const sellToken = isBuyingToken0 ? poolTokens.token1 : poolTokens.token0;
    const buyAmount = this.ethereumService.formatAmount(
      isBuyingToken0 ? swap.amount0 : swap.amount1,
      isBuyingToken0 ? token0Info.decimals : token1Info.decimals
    );
    const sellAmount = this.ethereumService.formatAmount(
      isBuyingToken0 ? swap.amount1 : swap.amount0,
      isBuyingToken0 ? token1Info.decimals : token0Info.decimals
    );

    return {
      ...swap,
      isBuy,
      buyToken,
      buyAmount,
      sellToken,
      sellAmount,
      valueUSD,
      token0Info,
      token1Info,
    };
  }

  stopMonitoring(): void {
    const poolManager = this.ethereumService.getPoolManagerContract();
    poolManager.removeAllListeners();
    console.log('Monitoring stopped');
  }
}

