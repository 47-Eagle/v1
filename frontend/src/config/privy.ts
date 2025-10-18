// Privy Configuration for Eagle Finance
export const PRIVY_CONFIG = {
  // App ID (safe to expose in frontend)
  appId: import.meta.env.VITE_PRIVY_APP_ID || 'cmgobg65m0328jr0cmgcfd2jz',
  
  // Configure which login methods to show
  loginMethods: ['wallet', 'email', 'google', 'twitter'] as const,
  
  // Appearance configuration
  appearance: {
    theme: 'dark' as const,
    accentColor: '#d4af37', // Eagle gold
    logo: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy',
    walletList: ['metamask', 'coinbase_wallet', 'rainbow', 'wallet_connect'],
    showWalletLoginFirst: true,
  },
  
  // Legal & UX
  legal: {
    termsAndConditionsUrl: 'https://47eagle.com/terms',
    privacyPolicyUrl: 'https://47eagle.com/privacy',
  },
  
  // Network configuration
  defaultChain: {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: [import.meta.env.VITE_ETHEREUM_RPC || 'https://eth.llamarpc.com'],
      },
    },
  },
  
  // Support multiple chains
  supportedChains: [
    {
      id: 1,
      name: 'Ethereum',
      network: 'mainnet',
      nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
      rpcUrls: { default: { http: ['https://eth.llamarpc.com'] } },
    },
    {
      id: 42161,
      name: 'Arbitrum',
      network: 'arbitrum',
      nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
      rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } },
    },
    {
      id: 8453,
      name: 'Base',
      network: 'base',
      nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
      rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
    },
  ],
  
  // Embedded wallet config - Allow existing wallets to login without creating embedded wallet
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const, // Only create if user doesn't have a wallet
    requireUserPasswordOnCreate: false,
    noPromptOnSignature: true, // Don't prompt for password on every signature
  },
  
  // Wallet configuration
  walletConnectCloudProjectId: 'default', // Use Privy's default WalletConnect project
};

export default PRIVY_CONFIG;

