# 🌉 EAGLE Ethereum ↔ Solana Bridge Setup Guide

**Complete guide to connect your Ethereum and Solana EAGLE tokens**

---

## 📋 What You Have

### ✅ Ethereum (Mainnet)
- **EagleShareOFT**: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`
- **Features**: Mint, Burn, LayerZero cross-chain

### ✅ Solana (Mainnet)
- **Program ID**: `3973MRkbN9E3GW4TnE9A8VzAgNxWAVRSAFVW4QQktAkb`
- **Mint Address**: `5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j`
- **Features**: Mint (authority only), Burn (anyone)

---

## 🎯 How the Bridge Works

### Ethereum → Solana
```
1. User burns EAGLE on Ethereum
   └→ EagleShareOFT.burn(amount)

2. Relayer detects burn event
   └→ Watches Transfer(user, 0x0, amount)

3. Relayer mints EAGLE on Solana
   └→ Uses SPL Token mintTo()
   └→ User receives EAGLE in Phantom
```

### Solana → Ethereum
```
1. User burns EAGLE on Solana
   └→ Calls Solana program burn instruction

2. Relayer detects burn
   └→ Watches Solana logs

3. Relayer mints EAGLE on Ethereum
   └→ EagleShareOFT.mint(user, amount)
   └→ User receives EAGLE in MetaMask
```

---

## 🚀 Step-by-Step Setup

### Step 1: Set Up Relayer Wallet

#### Ethereum Wallet
```bash
# Create new wallet for relayer or use existing
# Export private key from MetaMask or generate new one
```

#### Solana Wallet
```bash
# Create relayer keypair
solana-keygen new -o ~/.config/solana/relayer.json

# Get address
solana-keygen pubkey ~/.config/solana/relayer.json

# Fund with 0.1 SOL for transaction fees
# Send from your main wallet
```

---

### Step 2: Grant Permissions on Ethereum

The relayer needs permission to mint EAGLE on Ethereum (for Solana→ETH bridging).

#### Option A: Using Cast (Foundry)
```bash
# Set relayer as minter
cast send 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "setMinter(address,bool)" \
  YOUR_RELAYER_ETH_ADDRESS \
  true \
  --rpc-url https://eth.llamarpc.com \
  --private-key YOUR_OWNER_PRIVATE_KEY
```

#### Option B: Using Etherscan
1. Go to https://etherscan.io/address/0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E#writeContract
2. Connect MetaMask (as owner)
3. Call `setMinter(address minter, bool status)`
   - minter: `YOUR_RELAYER_ETH_ADDRESS`
   - status: `true`
4. Confirm transaction

---

### Step 3: Transfer Mint Authority on Solana

Currently, your wallet owns the mint. We need to transfer authority to the relayer.

```bash
# Transfer mint authority to relayer
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

spl-token authorize \
  5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j \
  mint \
  $(solana-keygen pubkey ~/.config/solana/relayer.json) \
  --url mainnet-beta
```

**Verify**:
```bash
spl-token display 5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j
# Should show relayer as mint authority
```

---

### Step 4: Configure Relayer

```bash
cd relayer

# Copy example config
cp .env.example .env

# Edit configuration
nano .env
```

**Update `.env`**:
```env
# Ethereum
ETHEREUM_RPC=https://eth.llamarpc.com
ETHEREUM_PRIVATE_KEY=your_relayer_eth_private_key

# Solana
SOLANA_RPC=https://api.mainnet-beta.solana.com
SOLANA_PROGRAM_ID=3973MRkbN9E3GW4TnE9A8VzAgNxWAVRSAFVW4QQktAkb
SOLANA_MINT=5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j
SOLANA_WALLET_PATH=/home/user/.config/solana/relayer.json

# Contracts
EAGLE_SHARE_OFT_ADDRESS=0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E
```

---

### Step 5: Install Dependencies

```bash
cd relayer
npm install
```

---

### Step 6: Link Test Wallets

Before starting the relayer, link some test wallets:

```bash
# Link your wallet
npm run link link YOUR_ETH_ADDRESS YOUR_SOLANA_ADDRESS

# Example:
npm run link link 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E 7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjrpG5FTc8htxY

# List all linked wallets
npm run link list
```

---

### Step 7: Start Relayer

#### Test Mode (Dry Run)
```bash
cd relayer
npm start
```

#### Production (PM2)
```bash
# Install PM2
npm install -g pm2

# Start relayer
pm2 start npm --name "eagle-bridge" -- start

# Save PM2 config
pm2 save

# Set up auto-restart on boot
pm2 startup

# View logs
pm2 logs eagle-bridge

# Monitor
pm2 monit
```

---

## 🧪 Testing the Bridge

### Test 1: Ethereum → Solana

1. **Burn EAGLE on Ethereum**:
```bash
# Using cast
cast send 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "burn(address,uint256)" \
  YOUR_ETH_ADDRESS \
  "1000000000000000000" \
  --rpc-url https://eth.llamarpc.com \
  --private-key YOUR_PRIVATE_KEY
```

2. **Check relayer logs**:
```bash
pm2 logs eagle-bridge
# Should see: "🔥 EAGLE Burn Detected!"
# Should see: "✅ Minted on Solana!"
```

3. **Verify on Solana**:
```bash
spl-token accounts 5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j
# Should show your token account with balance
```

### Test 2: Solana → Ethereum

**TODO**: Need to implement Solana→ETH direction (currently only ETH→Solana is implemented)

---

## 📊 Monitoring

### Check Relayer Status
```bash
pm2 status
pm2 logs eagle-bridge
```

### Check Balances
```bash
# Ethereum relayer balance
cast balance YOUR_RELAYER_ETH_ADDRESS --rpc-url https://eth.llamarpc.com

# Solana relayer balance
solana balance $(solana-keygen pubkey ~/.config/solana/relayer.json) --url mainnet-beta
```

### Check Mint Supply
```bash
# Ethereum EAGLE supply
cast call 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E "totalSupply()" --rpc-url https://eth.llamarpc.com

# Solana EAGLE supply
spl-token supply 5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j --url mainnet-beta
```

---

## ⚠️ Important Notes

### Security
- **Keep relayer private keys secure**
- **Monitor relayer balances** (should have 0.1 SOL and 0.05 ETH minimum)
- **Rate limit operations** (already configured in code)
- **Set up alerts** for low balances

### Decimal Conversion
- **Ethereum EAGLE**: 18 decimals
- **Solana EAGLE**: 9 decimals
- **Conversion**: Divide by 10^9 when bridging ETH→SOL
- **Example**: 1.0 EAGLE (ETH) = 1000000000 wei = 1.0 EAGLE (SOL) = 1000000000 units

### User Experience
- **Users must link wallets** before bridging
- **Bridging takes 5-30 seconds** (depends on block confirmation)
- **Gas fees**:
  - Ethereum: User pays gas to burn (~$5-30)
  - Solana: Relayer pays mint fee (~$0.000005)

---

## 🐛 Troubleshooting

### "No Solana wallet linked"
**Solution**: User needs to run:
```bash
npm run link link THEIR_ETH_ADDRESS THEIR_SOLANA_ADDRESS
```

### "Insufficient funds for mint"
**Solution**: Add more SOL to relayer wallet:
```bash
# Send 0.1 SOL to relayer address
```

### "Not authorized to mint"
**Solution**: Check mint authority:
```bash
spl-token display 5uCkww45tQ3BSninZHpPEvj22bs294SAPoQSgFpUid5j
# Should show relayer as mint authority
```

### "Relayer not detecting burns"
**Solution**:
1. Check Ethereum RPC is working
2. Verify EAGLE_SHARE_OFT_ADDRESS=0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E in .env
3. Check relayer logs for errors

---

## 📈 Next Steps

1. ✅ Deploy relayer to production server
2. ✅ Set up monitoring and alerts
3. ⏳ Build frontend UI for wallet linking
4. ⏳ Implement Solana→Ethereum direction
5. ⏳ Add rate limiting and security features
6. ⏳ Test with real users

---

## 🆘 Need Help?

- **Relayer logs**: `pm2 logs eagle-bridge`
- **Check config**: `cat relayer/.env`
- **Test connection**: `pm2 restart eagle-bridge`

---

**Ready to bridge?** Follow the steps above and you'll have Ethereum and Solana connected! 🚀

