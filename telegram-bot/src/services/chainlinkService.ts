import { ethers } from 'ethers';
import { config } from '../config';

// Chainlink Aggregator V3 Interface
const CHAINLINK_AGGREGATOR_V3_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

interface PriceFeedData {
  price: number;
  decimals: number;
  updatedAt: number;
  roundId: bigint;
  timestamp?: number; // Optional timestamp (same as updatedAt but for caching consistency)
}

export class ChainlinkService {
  private provider: ethers.JsonRpcProvider | ethers.WebSocketProvider;
  private ethUsdFeed: ethers.Contract;
  private priceCache: Map<string, { data: PriceFeedData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache (Chainlink updates every ~1 min)

  constructor(provider: ethers.JsonRpcProvider | ethers.WebSocketProvider, feedAddress: string) {
    this.provider = provider;
    
    // ETH/USD Price Feed
    this.ethUsdFeed = new ethers.Contract(
      feedAddress,
      CHAINLINK_AGGREGATOR_V3_ABI,
      this.provider
    );

    console.log(`📡 Chainlink Price Feed initialized: ${feedAddress}`);
  }

  /**
   * Get ETH/USD price from Chainlink oracle
   * @returns ETH price in USD
   */
  async getETHPrice(): Promise<number> {
    const cacheKey = 'ETH/USD';
    
    // Check cache first
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data.price;
    }

    try {
      const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
        await this.ethUsdFeed.latestRoundData();

      const decimals = await this.ethUsdFeed.decimals();

      // Convert answer to USD (Chainlink returns price with 8 decimals)
      const price = Number(answer) / Math.pow(10, Number(decimals));

      const feedData: PriceFeedData = {
        price,
        decimals: Number(decimals),
        updatedAt: Number(updatedAt),
        roundId: BigInt(roundId),
        timestamp: Number(updatedAt)
      };

      // Cache the result
      this.priceCache.set(cacheKey, {
        data: feedData,
        timestamp: Date.now(),
      });

      // Log price update for monitoring
      const age = Math.floor((Date.now() / 1000 - Number(updatedAt)) / 60);
      console.log(`📊 Chainlink ETH/USD: $${price.toFixed(2)} (updated ${age}m ago)`);

      return price;
    } catch (error) {
      console.error('❌ Error fetching Chainlink ETH/USD price:', error);
      
      // If we have a cached value (even expired), return it as fallback
      if (cached) {
        console.warn('⚠️ Using expired cached price as fallback');
        return cached.data.price;
      }
      
      throw new Error('Failed to fetch ETH price from Chainlink oracle');
    }
  }

  /**
   * Get full price feed data including metadata
   */
  async getPriceFeedData(): Promise<PriceFeedData> {
    try {
      const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
        await this.ethUsdFeed.latestRoundData();

      const decimals = await this.ethUsdFeed.decimals();
      const price = Number(answer) / Math.pow(10, Number(decimals));

      return {
        price,
        decimals: Number(decimals),
        updatedAt: Number(updatedAt),
        roundId: BigInt(roundId),
        timestamp: Number(updatedAt)
      };
    } catch (error) {
      console.error('Error fetching price feed data:', error);
      throw error;
    }
  }

  /**
   * Get the description of the price feed
   */
  async getFeedDescription(): Promise<string> {
    try {
      return await this.ethUsdFeed.description();
    } catch (error) {
      console.error('Error fetching feed description:', error);
      return 'ETH / USD';
    }
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Check if price feed data is stale (older than 2 hours)
   */
  async isPriceStale(): Promise<boolean> {
    try {
      const data = await this.getPriceFeedData();
      const now = Math.floor(Date.now() / 1000);
      const age = now - data.updatedAt;
      const TWO_HOURS = 2 * 60 * 60;
      
      if (age > TWO_HOURS) {
        console.warn(`⚠️ Chainlink price feed is stale (${Math.floor(age / 60)} minutes old)`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking price staleness:', error);
      return true;
    }
  }

  /**
   * Get ETH price at a specific block number
   * This queries historical Chainlink data for precise pricing
   */
  async getETHPriceAtBlock(blockNumber: number): Promise<number> {
    const cacheKey = `block_${blockNumber}`;
    
    // Check cache first (historical prices don't change)
    const cached = this.priceCache.get(cacheKey);
    if (cached) {
      return cached.data.price;
    }

    try {
      // Get the current latest round
      const [latestRoundId] = await this.ethUsdFeed.latestRoundData();
      
      // Chainlink round IDs are incremental, we need to find the round closest to our block
      // We'll use binary search or just get current price if block is recent
      const currentBlock = await this.provider.getBlockNumber();
      
      // If the block is recent (within ~2 hours / ~600 blocks), just use current price
      if (currentBlock - blockNumber < 600) {
        return await this.getETHPrice();
      }

      // For historical blocks, we'll query the round data at that block
      // by overriding the block tag in the call
      try {
        const [roundId, answer, , updatedAt] = await this.ethUsdFeed.latestRoundData({
          blockTag: blockNumber,
        });
        
        const decimals = await this.ethUsdFeed.decimals({ blockTag: blockNumber });
        const price = Number(answer) / Math.pow(10, Number(decimals));
        
        // Cache the historical price
        const feedData: PriceFeedData = {
          price,
          decimals: Number(decimals),
          updatedAt: Number(updatedAt),
          roundId: BigInt(roundId),
          timestamp: Number(updatedAt)
        };
        
        this.priceCache.set(cacheKey, {
          data: feedData,
          timestamp: Date.now(),
        });
        
        console.log(`📊 ETH price at block ${blockNumber}: $${price.toFixed(2)}`);
        return price;
      } catch (historicalError) {
        // If historical query fails, fallback to current price
        console.warn(`⚠️ Could not fetch historical price at block ${blockNumber}, using current price`);
        return await this.getETHPrice();
      }
    } catch (error) {
      console.error(`Error fetching ETH price at block ${blockNumber}:`, error);
      // Fallback to current price
      return await this.getETHPrice();
    }
  }
}
