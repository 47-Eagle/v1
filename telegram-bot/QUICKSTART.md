# 🚀 Quick Start Guide

## Step 1: Install Dependencies

```bash
cd telegram-bot
npm install
```

## Step 2: Create Your .env File

```bash
cp .env.example .env
```

Edit `.env` with your actual values.

## Step 3: Verify Your Pool ID

Your pool ID looks correct! It's a 32-byte hash (bytes32), which is exactly what Uniswap V4 uses.

Run the verification tool:

```bash
npm run discover:verify
```

This will check if your pool ID is valid and active.

## Step 4: Find More Pools (Optional)

If you want to monitor more pools, discover them:

```bash
# Find pools with recent activity
npm run discover

# Or scan for all initialized pools
npm run discover:scan

# Or watch for new pools being created
npm run discover:watch
```

## Step 5: Run the Bot

```bash
npm run dev
```

You should see:
```
🚀 Starting Uniswap V4 Telegram Bot...

📋 Validating configuration...
✅ Configuration valid

🔧 Initializing services...
✅ Telegram bot initialized successfully

Starting Uniswap V4 pool monitoring...
Pool Manager: 0x000000000004444c5dc75cB358380D2e3dE08A90
✅ Monitoring started successfully!

✨ Bot is running! Press Ctrl+C to stop.
```

## Understanding Uniswap V4 Pool IDs

✅ **Your pool ID format is CORRECT!**

Uniswap V4 uses **pool IDs** (32-byte hashes) like:
```
0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333
```

This is different from V2/V3 which use pool contract addresses.

## Your Configuration Looks Good! ✅

Based on your `.env.example`:

- ✅ **Pool Manager**: `0x000000000004444c5dc75cB358380D2e3dE08A90` - Looks valid
- ✅ **Pool ID**: `0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333` - Correct format (32 bytes)
- ✅ **RPC URL**: Using WebSocket (`wss://`) - Perfect for real-time monitoring!
- ✅ **Min Amount**: $1 - Good for testing

## What Happens Next?

When a buy transaction occurs in your monitored pool:

1. The bot detects the `Swap` event
2. Determines if it's a buy or sell
3. Fetches token information
4. Calculates USD value
5. Sends a Telegram notification to your chat

## Troubleshooting

### Pool not found?

Run the discovery tool to verify:
```bash
npm run discover:verify
```

### No events detected?

- Make sure the pool has active trading
- Try monitoring all pools (remove `MONITORED_POOLS` from .env temporarily)
- Check that your RPC URL is working

### WebSocket connection issues?

If WebSocket fails, switch to HTTP:
```env
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

## Testing

To test if the bot is working:

1. Run `npm run dev`
2. Wait for a swap in your pool (or trigger one yourself)
3. You should receive a Telegram notification

## Next Steps

- Monitor the console for detected swaps
- Adjust `MIN_BUY_AMOUNT_USD` to filter small transactions
- Add more pool IDs to `MONITORED_POOLS`
- Consider running in production mode with `npm run build && npm start`

Happy monitoring! 🎉

