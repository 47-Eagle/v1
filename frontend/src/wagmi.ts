import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, arbitrum, bsc, avalanche } from 'wagmi/chains';
import { defineChain } from 'viem';

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
export const config = getDefaultConfig({
  appName: 'Eagle Bridge',
  projectId,
  chains: [mainnet, base, monad, arbitrum, bsc, avalanche],
  ssr: false,
});

