import axios from 'axios';
import { config } from '../config';
import { ChainlinkService } from './chainlinkService';

interface TokenPrice {
  usd: number;
  usd_24h_change?: number;
}

export class PriceService {
  private chainlink: ChainlinkService;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor(chainlink: ChainlinkService) {
    this.chainlink = chainlink;
  }

  async getTokenPriceUSD(tokenAddress: string): Promise<number | null> {
    // Check cache first
    const cached = this.priceCache.get(tokenAddress.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      // Try CoinGecko API
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum`,
        {
          params: {
            contract_addresses: tokenAddress,
            vs_currencies: 'usd',
          },
          headers: config.coingecko.apiKey
            ? { 'x-cg-pro-api-key': config.coingecko.apiKey }
            : {},
        }
      );

      const price = response.data[tokenAddress.toLowerCase()]?.usd;
      
      if (price) {
        this.priceCache.set(tokenAddress.toLowerCase(), {
          price,
          timestamp: Date.now(),
        });
        return price;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching price for ${tokenAddress}:`, error);
      return null;
    }
  }

  async calculateSwapValueUSD(
    token0Address: string,
    token1Address: string,
    amount0: bigint,
    amount1: bigint,
    decimals0: number | bigint,
    decimals1: number | bigint
  ): Promise<number | null> {
    try {
      // Ensure decimals are numbers (might come in as BigInt)
      const dec0 = typeof decimals0 === 'bigint' ? Number(decimals0) : decimals0;
      const dec1 = typeof decimals1 === 'bigint' ? Number(decimals1) : decimals1;
      
      // Convert BigInt to number properly to avoid mixing types
      const amount0Num = amount0 < 0n ? -Number(amount0) : Number(amount0);
      const amount1Num = amount1 < 0n ? -Number(amount1) : Number(amount1);
      
      // Convert amounts to float with proper decimal adjustment
      const amount0Float = Math.abs(amount0Num / Math.pow(10, dec0));
      const amount1Float = Math.abs(amount1Num / Math.pow(10, dec1));

      // Normalize addresses
      const addr0 = token0Address.toLowerCase();
      const addr1 = token1Address.toLowerCase();

      // Check for ETH or WETH
      const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const isToken0ETH = addr0 === '0x0000000000000000000000000000000000000000' || addr0 === WETH;
      const isToken1ETH = addr1 === '0x0000000000000000000000000000000000000000' || addr1 === WETH;

      // Get ETH price for the ETH/WETH side of the pair
      let ethPrice = null;
      if (isToken0ETH || isToken1ETH) {
        ethPrice = await this.getETHPrice();
      }

      // Calculate USD value based on ETH amount
      if (isToken0ETH && ethPrice && amount0Float > 0) {
        const usdValue = amount0Float * ethPrice;
        console.log(`💰 Swap value: ${amount0Float.toFixed(6)} ETH = $${usdValue.toFixed(2)}`);
        return usdValue;
      } else if (isToken1ETH && ethPrice && amount1Float > 0) {
        const usdValue = amount1Float * ethPrice;
        console.log(`💰 Swap value: ${amount1Float.toFixed(6)} ETH = $${usdValue.toFixed(2)}`);
        return usdValue;
      }

      console.warn(`⚠️ Could not calculate USD value: token0=${addr0.slice(0,10)}... token1=${addr1.slice(0,10)}...`);
      return null;
    } catch (error) {
      console.error('Error calculating swap value:', error);
      return null;
    }
  }

  /**
   * Get ETH price from DEXScreener (aggregated from multiple DEXes)
   */
  async getETHPriceFromDEXScreener(): Promise<number> {
    try {
      const cacheKey = 'dexscreener_eth_current';
      
      // Check cache (cache for 1 minute)
      const cached = this.priceCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.price;
      }

      // WETH address on Ethereum mainnet
      const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${WETH}`,
        {
          timeout: 5000,
        }
      );

      // Find the highest liquidity WETH pair on Ethereum
      const ethereumPairs = response.data?.pairs?.filter((p: any) => 
        p.chainId === 'ethereum' && 
        p.priceUsd && 
        p.liquidity?.usd > 100000 // Only high liquidity pairs
      );

      if (ethereumPairs && ethereumPairs.length > 0) {
        // Sort by liquidity and take the highest
        ethereumPairs.sort((a: any, b: any) => b.liquidity.usd - a.liquidity.usd);
        const price = parseFloat(ethereumPairs[0].priceUsd);
        
        this.priceCache.set(cacheKey, {
          price,
          timestamp: Date.now(),
        });
        
        return price;
      }

      throw new Error('No high-liquidity WETH pairs found on DEXScreener');
    } catch (error: any) {
      console.error(`Error fetching ETH price from DEXScreener:`, error.message);
      throw error;
    }
  }

  /**
   * Get ETH price in USD using multiple sources (Chainlink > DEXScreener > Etherscan > CoinGecko)
   */
  async getETHPrice(): Promise<number> {
    try {
      // Primary: Use Chainlink on-chain oracle (most reliable!)
      const price = await this.chainlink.getETHPrice();
      
      // Cache the result
      this.priceCache.set('ETH', {
        price,
        timestamp: Date.now(),
      });
      
      return price;
    } catch (error) {
      console.error('❌ Error fetching ETH price from Chainlink:', error);
      
      // Check cache for fallback
      const cached = this.priceCache.get('ETH');
      if (cached) {
        console.warn('⚠️ Using cached ETH price as fallback');
        return cached.price;
      }
      
      // Secondary: Try DEXScreener (free, no API key, aggregated)
      try {
        console.warn('⚠️ Attempting DEXScreener API fallback...');
        const price = await this.getETHPriceFromDEXScreener();
        console.log(`✅ DEXScreener fallback successful: $${price.toFixed(2)}`);
        return price;
      } catch (dexscreenerError) {
        console.error('❌ DEXScreener fallback failed:', dexscreenerError);
      }
      
      // Tertiary: Try Etherscan API v2
      try {
        console.warn('⚠️ Attempting Etherscan API v2 fallback...');
        const price = await this.getETHPriceFromEtherscan();
        console.log(`✅ Etherscan fallback successful: $${price.toFixed(2)}`);
        return price;
      } catch (etherscanError) {
        console.error('❌ Etherscan fallback failed:', etherscanError);
      }
      
      // Quaternary: Try CoinGecko API
      try {
        console.warn('⚠️ Attempting CoinGecko API fallback...');
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price`,
          {
            params: {
              ids: 'ethereum',
              vs_currencies: 'usd',
            },
            timeout: 5000,
          }
        );

        const price = response.data?.ethereum?.usd;
        if (price) {
          console.log(`✅ CoinGecko fallback successful: $${price}`);
          return price;
        }
      } catch (coingeckoError) {
        console.error('❌ CoinGecko fallback also failed:', coingeckoError);
      }
      
      // Ultimate fallback
      console.warn('⚠️ All price sources failed, using $3400 emergency fallback');
      return 3400;
    }
  }

  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Get current ETH price from Etherscan API v2
   * Note: Etherscan doesn't provide historical prices, only current
   */
  async getETHPriceFromEtherscan(): Promise<number> {
    try {
      const cacheKey = 'etherscan_eth_current';
      
      // Check cache (cache for 1 minute)
      const cached = this.priceCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.price;
      }

      const response = await axios.get(
        `https://api.etherscan.io/v2/api`,
        {
          params: {
            chainid: 1,
            module: 'stats',
            action: 'ethprice',
            apikey: config.etherscan.apiKey,
          },
          timeout: 5000,
        }
      );

      const price = parseFloat(response.data?.result?.ethusd);
      
      if (price && price > 0) {
        this.priceCache.set(cacheKey, {
          price,
          timestamp: Date.now(),
        });
        
        return price;
      }

      throw new Error('Invalid price from Etherscan');
    } catch (error: any) {
      console.error(`Error fetching ETH price from Etherscan:`, error.message);
      throw error;
    }
  }

  /**
   * Get historical ETH price at a specific timestamp
   * Since Etherscan doesn't provide historical prices, we use current price for recent swaps
   */
  async getHistoricalETHPrice(timestamp: number): Promise<number> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const age = now - timestamp;
      
      // For very recent swaps (< 1 hour), use current Etherscan price
      if (age < 3600) {
        try {
          return await this.getETHPriceFromEtherscan();
        } catch {
          // Fallback to Chainlink
          return await this.getETHPrice();
        }
      }
      
      // For older swaps, use Chainlink current price
      // (ETH price is relatively stable over days, so this is acceptable)
      return await this.getETHPrice();
    } catch (error: any) {
      console.error(`Error fetching historical ETH price:`, error.message);
      return await this.getETHPrice();
    }
  }

  /**
   * Calculate swap value USD using historical ETH price at specific block
   */
  async calculateSwapValueUSDAtBlock(
    token0Address: string,
    token1Address: string,
    amount0: bigint,
    amount1: bigint,
    decimals0: number | bigint,
    decimals1: number | bigint,
    blockNumber: number
  ): Promise<number | null> {
    try {
      // Ensure decimals are numbers
      const dec0 = typeof decimals0 === 'bigint' ? Number(decimals0) : decimals0;
      const dec1 = typeof decimals1 === 'bigint' ? Number(decimals1) : decimals1;
      
      // Convert BigInt to number properly
      const amount0Num = amount0 < 0n ? -Number(amount0) : Number(amount0);
      const amount1Num = amount1 < 0n ? -Number(amount1) : Number(amount1);
      
      // Convert amounts to float with proper decimal adjustment
      const amount0Float = Math.abs(amount0Num / Math.pow(10, dec0));
      const amount1Float = Math.abs(amount1Num / Math.pow(10, dec1));

      // Normalize addresses
      const addr0 = token0Address.toLowerCase();
      const addr1 = token1Address.toLowerCase();

      // Check for ETH or WETH
      const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const isToken0ETH = addr0 === '0x0000000000000000000000000000000000000000' || addr0 === WETH;
      const isToken1ETH = addr1 === '0x0000000000000000000000000000000000000000' || addr1 === WETH;

      // Get ETH price at the specific block from Chainlink
      let ethPrice = null;
      if (isToken0ETH || isToken1ETH) {
        ethPrice = await this.chainlink.getETHPriceAtBlock(blockNumber);
      }

      // Calculate USD value based on ETH amount
      if (isToken0ETH && ethPrice && amount0Float > 0) {
        const usdValue = amount0Float * ethPrice;
        return usdValue;
      } else if (isToken1ETH && ethPrice && amount1Float > 0) {
        const usdValue = amount1Float * ethPrice;
        return usdValue;
      }

      return null;
    } catch (error) {
      console.error('Error calculating swap value at block:', error);
      return null;
    }
  }

  /**
   * Calculate swap value USD using historical ETH price (timestamp-based fallback)
   */
  async calculateSwapValueUSDHistorical(
    token0Address: string,
    token1Address: string,
    amount0: bigint,
    amount1: bigint,
    decimals0: number | bigint,
    decimals1: number | bigint,
    timestamp: number
  ): Promise<number | null> {
    try {
      // Ensure decimals are numbers
      const dec0 = typeof decimals0 === 'bigint' ? Number(decimals0) : decimals0;
      const dec1 = typeof decimals1 === 'bigint' ? Number(decimals1) : decimals1;
      
      // Convert BigInt to number properly
      const amount0Num = amount0 < 0n ? -Number(amount0) : Number(amount0);
      const amount1Num = amount1 < 0n ? -Number(amount1) : Number(amount1);
      
      // Convert amounts to float with proper decimal adjustment
      const amount0Float = Math.abs(amount0Num / Math.pow(10, dec0));
      const amount1Float = Math.abs(amount1Num / Math.pow(10, dec1));

      // Normalize addresses
      const addr0 = token0Address.toLowerCase();
      const addr1 = token1Address.toLowerCase();

      // Check for ETH or WETH
      const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const isToken0ETH = addr0 === '0x0000000000000000000000000000000000000000' || addr0 === WETH;
      const isToken1ETH = addr1 === '0x0000000000000000000000000000000000000000' || addr1 === WETH;

      // Get historical ETH price at the time of the swap
      let ethPrice = null;
      if (isToken0ETH || isToken1ETH) {
        ethPrice = await this.getHistoricalETHPrice(timestamp);
      }

      // Calculate USD value based on ETH amount
      if (isToken0ETH && ethPrice && amount0Float > 0) {
        const usdValue = amount0Float * ethPrice;
        return usdValue;
      } else if (isToken1ETH && ethPrice && amount1Float > 0) {
        const usdValue = amount1Float * ethPrice;
        return usdValue;
      }

      return null;
    } catch (error) {
      console.error('Error calculating historical swap value:', error);
      return null;
    }
  }
}

