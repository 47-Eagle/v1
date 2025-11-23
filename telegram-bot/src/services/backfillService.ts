import { ethers } from 'ethers';
import { config } from '../config';
import { EthereumService } from './ethereumService';
import { PriceService } from './priceService';
import { DatabaseService } from './databaseService';
import { ProcessedSwap } from './poolMonitor';

export class BackfillService {
  private ethereumService: EthereumService;
  private priceService: PriceService;
  private db: DatabaseService;
  private shouldCancel: boolean = false;
  private isRunning: boolean = false;

  constructor(ethereumService: EthereumService, priceService: PriceService, db: DatabaseService) {
    this.ethereumService = ethereumService;
    this.priceService = priceService;
    this.db = db;
  }

  /**
   * Cancel the current backfill operation
   */
  cancel(): boolean {
    if (!this.isRunning) {
      return false;
    }
    this.shouldCancel = true;
    return true;
  }

  /**
   * Check if backfill is currently running
   */
  isBackfillRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Backfill historical swap data for EAGLE token
   * @param days Number of days to backfill (default: 7)
   * @param onProgress Optional callback for progress updates
   */
  async backfillSwaps(
    days: number = 7,
    onProgress?: (message: string) => void
  ): Promise<{ success: boolean; swapsProcessed: number; error?: string; cancelled?: boolean }> {
    const log = (msg: string) => {
      console.log(msg);
      if (onProgress) onProgress(msg);
    };

    // Reset flags
    this.shouldCancel = false;
    this.isRunning = true;

    try {
      const chainName = this.ethereumService.chainConfig.name;
      log(`🔄 Starting backfill for last ${days} days on ${chainName}...`);

      const poolManager = this.ethereumService.getPoolManagerContract();
      const provider = this.ethereumService.getProvider();
      
      // Calculate block range
      const currentBlock = await provider.getBlockNumber();
      const blocksPerDay = Math.floor((24 * 60 * 60) / 12); // ~12 second blocks (Base is fast too)
      const blocksToFetch = blocksPerDay * days;
      const fromBlock = Math.max(0, currentBlock - blocksToFetch);

      log(`📦 Fetching from block ${fromBlock} to ${currentBlock} (${blocksToFetch.toLocaleString()} blocks)`);

      // Get all Swap events for the monitored pool
      // Only using the first monitored pool for backfill for now
      const poolId = this.ethereumService.chainConfig.monitoredPools[0];
      if (!poolId) {
        this.isRunning = false;
        return { success: false, swapsProcessed: 0, error: 'No monitored pool configured for this chain' };
      }

      // Fetch events in chunks to avoid rate limits
      const CHUNK_SIZE = 2000; // Adjust based on RPC provider limits
      let allEvents: ethers.Log[] = [];
      let processedBlocks = 0;

      for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
        // Check for cancellation
        if (this.shouldCancel) {
          log(`⚠️  Backfill cancelled by user`);
          this.isRunning = false;
          return { success: false, swapsProcessed: 0, error: 'Cancelled by user', cancelled: true };
        }

        const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
        
        try {
          const filter = poolManager.filters.Swap(poolId);
          const events = await poolManager.queryFilter(filter, start, end);
          allEvents = allEvents.concat(events);
          
          processedBlocks += (end - start + 1);
          const progress = ((processedBlocks / blocksToFetch) * 100).toFixed(1);
          log(`⏳ Progress: ${progress}% (${allEvents.length} swaps found so far)`);
          
          // Rate limit protection - wait between chunks
          if (start + CHUNK_SIZE <= currentBlock) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        } catch (error: any) {
          log(`⚠️  Error fetching blocks ${start}-${end}: ${error.message}`);
          // Continue with next chunk
        }
      }

      log(`✅ Found ${allEvents.length} historical swaps`);
      
      if (allEvents.length === 0) {
        this.isRunning = false;
        return { success: true, swapsProcessed: 0 };
      }

      // Process each swap
      let successCount = 0;
      let skipCount = 0;

      for (let i = 0; i < allEvents.length; i++) {
        // Check for cancellation every 10 swaps
        if (this.shouldCancel && i % 10 === 0) {
          log(`⚠️  Backfill cancelled by user after processing ${successCount} swaps`);
          this.isRunning = false;
          return { 
            success: false, 
            swapsProcessed: successCount, 
            error: 'Cancelled by user',
            cancelled: true 
          };
        }

        const event = allEvents[i];
        
        try {
          // Parse event data
          const parsed = poolManager.interface.parseLog({
            topics: event.topics as string[],
            data: event.data,
          });

          if (!parsed) continue;

          const [poolIdEvent, sender, amount0, amount1, sqrtPriceX96, liquidity, tick, fee] = parsed.args;

          // Get block and transaction data
          const block = await event.getBlock();
          const tx = await event.getTransaction();

          // Get transaction hash
          const txHash = tx.hash || event.transactionHash;
          if (!txHash || txHash === 'unknown') {
            skipCount++;
            continue;
          }

          // Fetch token info for both tokens
          const token0Address = '0x0000000000000000000000000000000000000000'; // ETH
          const token1Address = config.filters.monitoredToken; // EAGLE

          const [token0Info, token1Info] = await Promise.all([
            this.fetchTokenInfo(token0Address),
            this.fetchTokenInfo(token1Address),
          ]);

          // Filter by EAGLE token only first (before processing)
          const swapToken = (token1Info?.address || '').toLowerCase();
          const monitoredToken = config.filters.monitoredToken.toLowerCase();
          
          if (swapToken !== monitoredToken) {
            skipCount++;
            continue;
          }

          // Calculate USD value
          const valueUSD = await this.priceService.calculateSwapValueUSD(
            token0Address,
            token1Address,
            amount0,
            amount1,
            token0Info?.decimals || 18,
            token1Info?.decimals || 18,
            this.ethereumService.chainConfig.wethAddress
          );

          // Determine buy/sell
          // If amount1 > 0, the pool RECEIVES Token1. If Token1 is EAGLE, user SELLS EAGLE.
          // If amount1 < 0, the pool PAYS Token1. If Token1 is EAGLE, user BUYS EAGLE.
          
          let isBuy = false;
          
          // Check which token is monitored
          if (token1Info.address.toLowerCase() === monitoredToken) {
              // Token1 is Monitored Token (EAGLE)
              isBuy = amount1 < 0n; // Pool pays EAGLE -> User Buy
          } else if (token0Info.address.toLowerCase() === monitoredToken) {
              // Token0 is Monitored Token
              isBuy = amount0 < 0n; // Pool pays EAGLE -> User Buy
          } else {
              // Fallback (Assume Token1 is EAGLE if logic fails)
              isBuy = amount1 < 0n; 
          }
          const buyToken = isBuy ? (token1Info?.symbol || 'UNKNOWN') : (token0Info?.symbol || 'ETH');
          const sellToken = isBuy ? (token0Info?.symbol || 'ETH') : (token1Info?.symbol || 'UNKNOWN');
          const buyAmount = ethers.formatUnits(
            isBuy ? amount1 : amount0,
            isBuy ? (token1Info?.decimals || 18) : (token0Info?.decimals || 18)
          );
          const sellAmount = ethers.formatUnits(
            isBuy ? (-amount0) : (-amount1),
            isBuy ? (token0Info?.decimals || 18) : (token1Info?.decimals || 18)
          );

          // Create processed swap object
          const processedSwap: ProcessedSwap = {
            poolId: poolIdEvent,
            sender,
            actualTrader: tx.from,
            amount0,
            amount1,
            sqrtPriceX96,
            liquidity,
            tick: Number(tick),
            fee: Number(fee),
            txHash,
            blockNumber: block.number,
            timestamp: Number(block.timestamp),
            isBuy,
            buyToken,
            buyAmount,
            sellToken,
            sellAmount,
            token0Info,
            token1Info,
            valueUSD,
            chainName: this.ethereumService.chainConfig.name
          };

          // Save to database (returns null if already exists)
          const savedSwap = await this.db.saveSwap(processedSwap);
          
          if (!savedSwap) {
            // Already exists or save failed
            skipCount++;
            continue;
          }

          // Update wallet statistics
          await this.db.updateWalletStats(processedSwap.actualTrader, processedSwap);
          
          successCount++;

          // Progress update every 10 swaps
          if ((i + 1) % 10 === 0 || i === allEvents.length - 1) {
            const progress = (((i + 1) / allEvents.length) * 100).toFixed(1);
            log(`💾 Processed: ${progress}% (${successCount} saved, ${skipCount} skipped)`);
          }

        } catch (error: any) {
          console.error(`Error processing swap ${i}:`, error.message);
          skipCount++;
        }
      }

      log(`\n✅ Backfill complete!`);
      log(`📊 Total swaps processed: ${successCount}`);
      log(`⏭️  Swaps skipped (duplicates/errors): ${skipCount}`);

      this.isRunning = false;
      return { success: true, swapsProcessed: successCount };

    } catch (error: any) {
      const errorMsg = `❌ Backfill failed: ${error.message}`;
      log(errorMsg);
      this.isRunning = false;
      return { success: false, swapsProcessed: 0, error: error.message };
    } finally {
      // Always reset flags
      this.isRunning = false;
      this.shouldCancel = false;
    }
  }

  private async fetchTokenInfo(address: string) {
    // Handle native ETH
    if (address === '0x0000000000000000000000000000000000000000') {
      return {
        address: address,
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      };
    }

    try {
      const provider = this.ethereumService.getProvider();
      const tokenContract = new ethers.Contract(
        address,
        [
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)',
        ],
        provider
      );

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol().catch(() => 'UNKNOWN'),
        tokenContract.name().catch(() => 'Unknown Token'),
        tokenContract.decimals().catch(() => 18),
      ]);

      return {
        address,
        symbol,
        name,
        decimals: typeof decimals === 'bigint' ? Number(decimals) : decimals,
      };
    } catch (error) {
      console.error(`Error fetching token info for ${address}:`, error);
      return {
        address,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
      };
    }
  }
}
