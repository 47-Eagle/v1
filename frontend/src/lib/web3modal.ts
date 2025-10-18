import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// 1. Get projectId from https://cloud.walletconnect.com
// For now using a public test ID - you should get your own from https://cloud.walletconnect.com
export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c0d8c5e0eaa84e2fb6e5e7c4d9c5e0ea';

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: import.meta.env.VITE_ETHEREUM_RPC || 'https://eth.llamarpc.com'
};

// 3. Create a metadata object
const metadata = {
  name: '47 Eagle Finance',
  description: 'Omnichain DeFi Vault powered by LayerZero',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://47eagle.com',
  icons: ['https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy']
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: true,
  rpcUrl: mainnet.rpcUrl,
  defaultChainId: 1,
});

// 5. Create modal
createWeb3Modal({
  ethersConfig,
  chains: [mainnet],
  projectId,
  enableAnalytics: false,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#d4af37',
    '--w3m-border-radius-master': '8px',
  },
});

