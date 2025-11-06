import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  ethereum: {
    // Prefer WebSocket for event listening, fallback to HTTP
    rpcUrl: process.env.ETHEREUM_WSS_URL || process.env.ETHEREUM_RPC_URL || '',
  },
  uniswapV4: {
    poolManager: process.env.UNISWAP_V4_POOL_MANAGER || '',
    monitoredPools: process.env.MONITORED_POOLS?.split(',').map(p => p.trim()) || [],
  },
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
  chainlink: {
    // ETH/USD Price Feed on Ethereum Mainnet
    ethUsdFeed: process.env.CHAINLINK_ETH_USD_FEED || '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
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
  if (!config.ethereum.rpcUrl) {
    errors.push('ETHEREUM_RPC_URL is required');
  }
  if (!config.uniswapV4.poolManager) {
    errors.push('UNISWAP_V4_POOL_MANAGER is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

