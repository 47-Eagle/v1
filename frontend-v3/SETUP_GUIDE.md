# 🚀 Eagle Vault V3 Frontend - Setup Guide

Complete guide to get your Eagle Vault V3 frontend up and running.

## 📋 Prerequisites

- Node.js 18+ installed
- npm, yarn, or pnpm package manager
- MetaMask or another Web3 wallet
- WalletConnect Project ID (free from https://cloud.walletconnect.com/)

## 🎯 Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
cd frontend-v3
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required: Your WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Required: Contract addresses on Arbitrum
NEXT_PUBLIC_VAULT_ADDRESS=0xYourVaultAddress
NEXT_PUBLIC_WLFI_ADDRESS=0xYourWLFIAddress
NEXT_PUBLIC_USD1_ADDRESS=0xYourUSD1Address

# Optional: Custom RPC (default uses public Arbitrum RPC)
NEXT_PUBLIC_ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
```

### Step 3: Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

## 🔧 Detailed Configuration

### Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com/
2. Sign up / Log in
3. Create a new project
4. Copy the Project ID
5. Add to `.env` as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Get Contract Addresses

If you've already deployed the `EagleOVaultV3Chainlink` contract:

1. Find your deployment transaction on Arbiscan
2. Copy the contract addresses:
   - Vault contract address
   - WLFI token address
   - USD1 token address
3. Add to `.env`

### Configure Network

The app is configured for **Arbitrum One** by default. To change networks:

Edit `config/wagmi.ts`:

```typescript
import { arbitrum, mainnet, polygon } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'Eagle Vault V3 Chainlink',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains: [arbitrum, mainnet, polygon], // Add your chains
  ssr: true,
});
```

## 🎨 Customization

### Theme Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      eagle: {
        50: '#faf5ff',   // Lightest
        100: '#f3e8ff',
        // ... customize all shades
        900: '#581c87',  // Darkest
      }
    }
  }
}
```

### Branding

1. **Logo**: Replace in `app/page.tsx` (🦅 emoji)
2. **Title**: Edit `app/layout.tsx` metadata
3. **Footer**: Customize in `app/page.tsx`

### Add Custom Components

Create new components in `components/`:

```typescript
// components/MyComponent.tsx
'use client';

export default function MyComponent() {
  return <div>My Custom Component</div>;
}
```

Import in `app/page.tsx`:

```typescript
import MyComponent from '@/components/MyComponent';
```

## 📱 Features Overview

### 1. Deposit Interface
- Dual-token deposits (WLFI + USD1)
- Single-token deposits (WLFI only)
- Live oracle price display
- Expected shares preview
- Token approval flow

### 2. Withdrawal Interface
- Share-based withdrawal
- Quick percentage selectors (25%, 50%, 75%, 100%)
- Estimated token amounts
- USD value calculation

### 3. Vault Analytics
- Total Value Locked (TVL)
- EAGLE share price
- Oracle prices (Chainlink + TWAP)
- Asset composition breakdown
- Liquidity metrics
- Strategy allocation

### 4. User Position
- Share balance
- Current USD value
- Proportional holdings
- Wallet balances
- Ownership percentage

## 🔍 Testing

### Test on Arbitrum Testnet

1. Switch network in `config/wagmi.ts`:

```typescript
import { arbitrumSepolia } from 'wagmi/chains';

chains: [arbitrumSepolia]
```

2. Update contract addresses to testnet addresses
3. Get testnet ETH from faucet
4. Test all functions

### Manual Testing Checklist

- [ ] Wallet connection works
- [ ] Prices load correctly
- [ ] Deposit flow (approve + deposit)
- [ ] Withdrawal flow
- [ ] Balance updates after transactions
- [ ] Mobile responsiveness
- [ ] Error handling

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

2. **Deploy on Vercel**:
   - Visit https://vercel.com
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
     - `NEXT_PUBLIC_VAULT_ADDRESS`
     - `NEXT_PUBLIC_WLFI_ADDRESS`
     - `NEXT_PUBLIC_USD1_ADDRESS`
   - Click Deploy

3. **Your app will be live at**: `your-project.vercel.app`

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy to Netlify:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Deploy to Custom Server

1. Build:
```bash
npm run build
```

2. Start:
```bash
npm run start
```

3. Use PM2 or similar for production:
```bash
pm2 start npm --name "eagle-vault" -- start
```

## 🐛 Troubleshooting

### Issue: "Cannot find module '@rainbow-me/rainbowkit'"

**Solution**: Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Hydration error" in console

**Solution**: Ensure all dynamic content uses `'use client'` directive

### Issue: Wallet won't connect

**Solutions**:
1. Check WalletConnect Project ID is set
2. Verify you're on correct network (Arbitrum)
3. Try clearing browser cache
4. Disable browser extensions that might interfere

### Issue: Prices showing as $0.00

**Solutions**:
1. Verify contract addresses in `.env`
2. Check RPC endpoint is responding
3. Ensure contracts are deployed on network
4. Check browser console for errors

### Issue: Transaction fails immediately

**Solutions**:
1. Check you have sufficient token balance
2. Verify token approvals
3. Ensure you have enough ETH for gas
4. Check vault is not paused

## 📊 Performance Optimization

### Enable ISR (Incremental Static Regeneration)

For better performance, add revalidation to data fetching:

```typescript
const { data } = useReadContract({
  // ... contract config
  query: {
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,        // Consider fresh for 5 seconds
  }
});
```

### Optimize Images

If adding custom images:

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={100}
  height={100}
  priority
/>
```

### Bundle Analysis

Analyze your bundle size:

```bash
npm install @next/bundle-analyzer
```

Update `next.config.js`:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});
```

Run analysis:
```bash
ANALYZE=true npm run build
```

## 🔒 Security Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Verify contract addresses** before deployment
4. **Test on testnet first**
5. **Add rate limiting** for production
6. **Enable CORS properly**
7. **Keep dependencies updated**

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://rainbowkit.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Viem Documentation](https://viem.sh)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds)

## 💬 Need Help?

- Check the [README.md](./README.md) for basic info
- Review [Next.js documentation](https://nextjs.org/docs)
- Search existing GitHub issues
- Join our Discord community
- Open a GitHub issue with details

## 🎉 Success!

If everything is working:
- ✅ Wallet connects successfully
- ✅ Prices load from oracles
- ✅ Deposits and withdrawals work
- ✅ UI is responsive and looks great

**Congratulations! Your Eagle Vault V3 frontend is ready! 🦅**

---

Last Updated: October 2025

