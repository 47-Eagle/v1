import { ethers } from 'ethers';
import { ChainConfig } from '../config';
import { POOL_MANAGER_ABI, ERC20_ABI } from '../contracts/uniswapV4';

export class EthereumService {
  private provider: ethers.JsonRpcProvider | ethers.WebSocketProvider;
  private poolManagerContract: ethers.Contract;
  public readonly chainConfig: ChainConfig;

  constructor(chainConfig: ChainConfig) {
    this.chainConfig = chainConfig;
    // Use WebSocket if URL starts with wss://, otherwise use HTTP with polling
    if (chainConfig.rpcUrl.startsWith('wss://') || chainConfig.rpcUrl.startsWith('ws://')) {
      console.log(`🔌 Using WebSocket provider for ${chainConfig.name}`);
      this.provider = new ethers.WebSocketProvider(chainConfig.rpcUrl);
    } else {
      console.log(`🔌 Using HTTP provider with polling for ${chainConfig.name}`);
      this.provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, undefined, {
        polling: true,
        pollingInterval: 4000, // Poll every 4 seconds
      });
    }
    
    this.poolManagerContract = new ethers.Contract(
      chainConfig.poolManager,
      POOL_MANAGER_ABI,
      this.provider
    );
  }

  getProvider(): ethers.JsonRpcProvider | ethers.WebSocketProvider {
    return this.provider;
  }

  getPoolManagerContract(): ethers.Contract {
    return this.poolManagerContract;
  }

  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> {
    try {
      // Handle native ETH (address 0x0000...)
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        return { name: 'Ethereum', symbol: 'ETH', decimals: 18 };
      }
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
      ]);

      return { name, symbol, decimals };
    } catch (error) {
      console.error(`Error fetching token info for ${tokenAddress} on ${this.chainConfig.name}:`, error);
      return { name: 'Unknown', symbol: 'UNKNOWN', decimals: 18 };
    }
  }

  async getPoolInfo(poolId: string): Promise<{
    sqrtPriceX96: bigint;
    tick: number;
    liquidity: bigint;
  }> {
    try {
      const [poolData, liquidity] = await Promise.all([
        this.poolManagerContract.getPool(poolId),
        this.poolManagerContract.getLiquidity(poolId),
      ]);

      return {
        sqrtPriceX96: poolData.sqrtPriceX96,
        tick: poolData.tick,
        liquidity,
      };
    } catch (error) {
      console.error(`Error fetching pool info for ${poolId} on ${this.chainConfig.name}:`, error);
      throw error;
    }
  }

  formatAmount(amount: bigint, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  // Calculate price from sqrtPriceX96
  calculatePrice(sqrtPriceX96: bigint): number {
    const Q96 = 2n ** 96n;
    const price = Number(sqrtPriceX96) / Number(Q96);
    return price * price;
  }
}
