# Eagle Vault V3 Chainlink - Frontend

Modern, responsive frontend for the Eagle Vault V3 with Chainlink and Uniswap V3 TWAP oracle integration.

## 🚀 Features

- **Dual-Token Deposits**: Deposit WLFI and USD1 in any ratio
- **Oracle Pricing**: Real-time price feeds from Chainlink and Uniswap V3 TWAP
- **ERC-4626 Compliant**: Standard vault interface
- **Multi-Strategy Support**: View and track up to 5 yield strategies
- **Instant Withdrawals**: Withdraw when liquidity is available
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Wallet Integration**: Connect with MetaMask, WalletConnect, and more

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Blockchain**: Wagmi v2 + Viem
- **Wallet**: RainbowKit
- **Language**: TypeScript

## 📦 Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
# RPC Endpoints
NEXT_PUBLIC_ARBITRUM_RPC=https://arb1.arbitrum.io/rpc

# Contract Addresses (Arbitrum)
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_WLFI_ADDRESS=0x...
NEXT_PUBLIC_USD1_ADDRESS=0x...

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get a WalletConnect Project ID from: https://cloud.walletconnect.com/

## 🏃 Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🏗️ Build

Build for production:

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
frontend-v3/
├── app/                    # Next.js 14 app directory
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main page
│   ├── providers.tsx      # Wagmi & RainbowKit setup
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── DepositInterface.tsx
│   ├── WithdrawalInterface.tsx
│   ├── VaultAnalytics.tsx
│   └── UserPosition.tsx
├── config/               # Configuration files
│   ├── contracts.ts      # Contract ABIs & addresses
│   └── wagmi.ts         # Wagmi configuration
├── public/              # Static assets
└── package.json
```

## 🎨 Key Components

### DepositInterface
- Dual-token deposit support
- Live price preview
- Token approval flow
- Balance display

### WithdrawalInterface
- Share-based withdrawal
- Percentage quick select
- Estimated token amounts
- User position summary

### VaultAnalytics
- Total Value Locked (TVL)
- Oracle prices (Chainlink + TWAP)
- Asset composition
- Strategy allocation
- Liquidity metrics

### UserPosition
- Share balance
- Current value
- Proportional holdings
- Wallet balances

## 🔧 Configuration

### Update Contract Addresses

Edit `config/contracts.ts`:

```typescript
export const ADDRESSES = {
  VAULT: '0xYourVaultAddress' as `0x${string}`,
  WLFI: '0xYourWLFIAddress' as `0x${string}`,
  USD1: '0xYourUSD1Address' as `0x${string}`,
} as const;
```

### Customize Theme

Edit `tailwind.config.js` to customize colors:

```javascript
theme: {
  extend: {
    colors: {
      eagle: {
        // Your custom colors
      }
    }
  }
}
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Build the static export:

```bash
npm run build
```

Deploy the `.next` directory to your hosting provider.

## 📝 Smart Contract Integration

This frontend interfaces with `EagleOVaultV3Chainlink.sol` which includes:

- **Oracle Functions**:
  - `getCurrentPrices()` - Get WLFI and USD1 prices
  - `getWLFIPrice()` - Uniswap V3 TWAP price
  - `getUSD1Price()` - Chainlink price feed

- **Deposit Functions**:
  - `depositDual()` - Deposit both tokens
  - `deposit()` - Deposit WLFI only
  - `previewDepositDual()` - Preview expected shares

- **Withdrawal Functions**:
  - `withdrawDual()` - Withdraw proportional tokens

- **View Functions**:
  - `totalAssets()` - Total vault value in USD
  - `balanceOf()` - User's share balance
  - `getVaultBalances()` - Direct holdings

## 🔒 Security

- Uses OpenZeppelin contracts
- Reentrancy guards on all state-changing functions
- Price feed validation (staleness checks, sanity bounds)
- Multiple oracle sources for price accuracy

## 🐛 Troubleshooting

### Wallet Not Connecting
- Ensure you're on Arbitrum network
- Check WalletConnect Project ID is set
- Clear browser cache and reconnect

### Transactions Failing
- Check token approvals
- Ensure sufficient gas
- Verify contract addresses in `.env`

### Prices Not Loading
- Check RPC endpoint is working
- Verify contract addresses are correct
- Ensure oracle contracts are deployed

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- GitHub Issues: Report bugs and request features
- Documentation: See `/docs` directory
- Discord: Join our community

---

Built with ❤️ using Chainlink, Uniswap V3, and modern web3 tools.

