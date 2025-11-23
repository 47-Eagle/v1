import dotenv from 'dotenv';

dotenv.config();

export interface ChainConfig {
  name: string;
  rpcUrl: string;
  poolManager: string;
  monitoredPools: string[];
  chainlinkFeed: string;
  explorerUrl: string;
  wethAddress: string;
}

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  chains: [
    {
      name: 'Ethereum',
      rpcUrl: process.env.ETHEREUM_RPC_URL || '',
      poolManager: process.env.ETHEREUM_UNISWAP_V4_POOL_MANAGER || '',
      monitoredPools: process.env.ETHEREUM_MONITORED_POOLS?.split(',').map(p => p.trim()) || [],
      chainlinkFeed: process.env.ETHEREUM_CHAINLINK_FEED || '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      explorerUrl: 'https://etherscan.io',
      wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
    {
      name: 'Base',
      rpcUrl: process.env.BASE_RPC_URL || '',
      poolManager: process.env.BASE_UNISWAP_V4_POOL_MANAGER || '',
      monitoredPools: process.env.BASE_MONITORED_POOLS?.split(',').map(p => p.trim()) || [],
      chainlinkFeed: process.env.BASE_CHAINLINK_FEED || '0x71041dddad3595F745215C98a9D7Ad759c52798e',
      explorerUrl: 'https://basescan.org',
      wethAddress: '0x4200000000000000000000000000000000000006',
    }
  ] as ChainConfig[],
  filters: {
    minBuyAmountUSD: parseFloat(process.env.MIN_BUY_AMOUNT_USD || '0'),
    // EAGLE token - only monitor this token
    monitoredToken: process.env.MONITORED_TOKEN || '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',
  },
  coingecko: {
    apiKey: process.env.COINGECKO_API_KEY || '',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.telegram.botToken) {
    errors.push('TELEGRAM_BOT_TOKEN is required');
  }
  if (!config.telegram.chatId) {
    errors.push('TELEGRAM_CHAT_ID is required');
  }

  config.chains.forEach(chain => {
    if (!chain.rpcUrl) {
      errors.push(`${chain.name} RPC_URL is required`);
    }
    if (!chain.poolManager) {
      errors.push(`${chain.name} UNISWAP_V4_POOL_MANAGER is required`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}
