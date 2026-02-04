import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, arbitrum, bsc, avalanche } from 'wagmi/chains';
import { defineChain } from 'viem';
import { http } from 'wagmi';

// Get WalletConnect project ID from env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

// Define Monad chain (not in wagmi/chains yet)
export const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-mainnet.monadinfra.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://monad.blockscout.com',
    },
  },
});

// All 6 supported chains for EAGLE bridging
// Using public CORS-friendly RPCs to avoid Alchemy CORS issues
export const config = getDefaultConfig({
  appName: 'Eagle Bridge',
  projectId,
  chains: [mainnet, base, monad, arbitrum, bsc, avalanche],
  ssr: false,
  transports: {
    [mainnet.id]: http('https://eth.llamarpc.com'),
    [base.id]: http('https://base.llamarpc.com'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [avalanche.id]: http('https://api.avax.network/ext/bc/C/rpc'),
    [monad.id]: http('https://rpc-mainnet.monadinfra.com'),
  },
});

