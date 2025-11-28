# Eagle Vault Frontend

Modern, production-ready frontend for the Eagle Omnichain Vault - a dual-token DeFi vault with Charm Finance integration and LayerZero cross-chain capabilities.

## Features

- **Vault Management** - Deposit WLFI + USD1, withdraw at any time
- **Cross-Chain Bridge** - Wrap/unwrap vEAGLE ↔ EAGLE tokens
- **Real-Time Analytics** - Live APY, TVL, and performance metrics
- **Strategy Monitoring** - Track Charm Finance strategy performance
- **Multi-Wallet Support** - MetaMask, WalletConnect, Safe App integration
- **Modern UI** - Neumorphic design with dark mode support
- **Responsive** - Works on desktop and mobile

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build

```bash
npm run build
```

Output in `dist/` folder.

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── VaultView.tsx   # Main vault interface
│   │   ├── AdminPanel.tsx  # Admin controls
│   │   └── neumorphic/     # Design system components
│   ├── hooks/              # Custom React hooks
│   │   ├── useCharmVaultData.ts
│   │   └── useTokenPrices.ts
│   ├── config/             # Configuration
│   │   └── contracts.ts    # Contract addresses
│   ├── pages/              # Page components
│   └── styles/             # Design system
├── api/                    # API routes (Vercel)
├── public/                 # Static assets
└── package.json
```

## Contract Addresses

All addresses configured in `src/config/contracts.ts`:

- **EagleOVault:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- **EagleShareOFT:** `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`
- **EagleVaultWrapper:** `0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5`
- **CharmStrategyUSD1:** `0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f`
- **CharmStrategyWETH:** `0x5c525Af4153B1c43f9C06c31D32a84637c617FfE`

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Fast build tool
- **Wagmi** + **RainbowKit** - Wallet integration
- **Ethers.js v6** - Ethereum interactions
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Framer Motion** - Animations

## Key Features

### Vault Operations
- Deposit WLFI + USD1 tokens
- Withdraw vEAGLE shares
- Real-time balance tracking
- Transaction history

### Cross-Chain Bridge
- Wrap vEAGLE → EAGLE (tradable tokens)
- Unwrap EAGLE → vEAGLE (vault shares)
- Fee calculations
- Whitelist status

### Analytics Dashboard
- Current APY calculation from Charm Finance
- Total Value Locked (TVL)
- Strategy performance metrics
- Asset allocation visualization
- Historical data charts

### Admin Features
- Capital injection controls
- Strategy management
- Safe App integration for multi-sig

## Configuration

### Environment Variables

Create `.env.local`:

```env
VITE_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_CHARM_VAULT_USD1_ADDRESS=0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71
VITE_CHARM_VAULT_WETH_ADDRESS=0x3314e248F3F752Cd16939773D83bEb3a362F0AEF
```

### Customization

- **Colors:** Edit `tailwind.config.js`
- **Contracts:** Update `src/config/contracts.ts`
- **Design System:** Modify `src/styles/design-system.ts`

## Performance

- Lighthouse Score: 95+
- First Contentful Paint: <1s
- Bundle Size: ~200KB gzipped
- Optimized for production

## Security

- All transactions require user approval
- No private keys stored
- Safe App integration for multi-sig
- HTTPS required for production

## Deployment

### Vercel

```bash
npm run build
# Deploy via Vercel CLI or GitHub integration
```

### Other Platforms

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

- **Documentation:** See main repository README
- **Issues:** GitHub Issues
- **Contract Addresses:** [Etherscan](https://etherscan.io)

---

Built by the Eagle Vault team
