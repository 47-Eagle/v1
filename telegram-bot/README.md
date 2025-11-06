# Uniswap V4 Telegram Buy Detector Bot

A Telegram bot that monitors Uniswap V4 pools in real-time and sends notifications when buy transactions are detected.

## Features

- 🔍 Real-time monitoring of Uniswap V4 pool swaps
- 💰 Automatic USD value calculation using CoinGecko API
- 🎯 Configurable minimum buy amount filter
- 📊 Detailed transaction information in notifications
- 🏊 Support for monitoring specific pools or all pools
- ⚡ Fast and efficient event-based detection

## Prerequisites

- Node.js v16 or higher
- npm or pnpm
- A Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- An Ethereum RPC URL (Alchemy, Infura, or your own node)
- Uniswap V4 Pool Manager contract address

## Installation

1. Navigate to the telegram-bot directory:
```bash
cd telegram-bot
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Edit `.env` and fill in your configuration:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
UNISWAP_V4_POOL_MANAGER=0x... # Uniswap V4 Pool Manager address
MONITORED_POOLS=0x... # Optional: comma-separated pool IDs
MIN_BUY_AMOUNT_USD=100 # Optional: minimum buy amount to notify
COINGECKO_API_KEY=your_coingecko_api_key_here # Optional
```

## Configuration

### Getting Your Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the instructions
3. Copy the bot token provided
4. Add it to your `.env` file as `TELEGRAM_BOT_TOKEN`

### Getting Your Telegram Chat ID

1. Start a chat with your bot
2. Send any message
3. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":` in the response
5. Copy the chat ID and add it to your `.env` file as `TELEGRAM_CHAT_ID`

### Ethereum RPC Configuration

You can use:
- **Alchemy**: https://www.alchemy.com/ (Recommended)
- **Infura**: https://www.infura.io/
- **Your own Ethereum node**

Example RPC URLs:
```
Alchemy: https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
Infura: https://mainnet.infura.io/v3/YOUR_API_KEY
```

### Uniswap V4 Configuration

- **UNISWAP_V4_POOL_MANAGER**: The address of the Uniswap V4 Pool Manager contract (e.g., `0x000000000004444c5dc75cB358380D2e3dE08A90`)
- **MONITORED_POOLS**: (Optional) Comma-separated list of specific **pool IDs** to monitor. Leave empty to monitor all pools.

#### 🔑 Understanding Uniswap V4 Pool IDs

**Important:** Unlike Uniswap V2/V3, Uniswap V4 uses **pool IDs** (32-byte hashes) instead of individual pool contract addresses. A pool ID looks like this:
```
0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333
```

Pool IDs are derived from the pool's parameters: currency0, currency1, fee, tickSpacing, and hooks address.

### Filters

- **MIN_BUY_AMOUNT_USD**: Minimum buy amount in USD to trigger a notification. Set to 0 to notify on all buys.

## 🔍 Discovering Pool IDs

Before running the bot, you need to find the pool IDs you want to monitor. Use the built-in discovery tool:

### Verify Your Configured Pool

Check if your pool ID is valid:
```bash
npm run discover:verify
```

### Find Active Pools (Recommended)

Find pools with recent swap activity:
```bash
npm run discover
```

This scans the last 1000 blocks for swaps and shows active pool IDs.

### Scan for All Initialized Pools

Find all pools that have been initialized:
```bash
npm run discover:scan
```

You can specify how many blocks to scan:
```bash
npm run discover:scan 10000  # Scan last 10,000 blocks
```

### Watch for New Pools

Listen in real-time for new pools being created:
```bash
npm run discover:watch
```

### Example Output

```
🔍 Uniswap V4 Pool Discovery Tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Pool ID: 0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333
   ✅ Active | Liquidity: 1234567890

💡 Tip: Copy a Pool ID and add it to MONITORED_POOLS in your .env file
```

Once you find a pool ID, add it to your `.env` file in the `MONITORED_POOLS` variable.

## Usage

### Development Mode

Run with TypeScript directly:
```bash
npm run dev
```

### Production Mode

1. Build the project:
```bash
npm run build
```

2. Run the compiled JavaScript:
```bash
npm start
```

### Bot Commands

Once the bot is running, you can interact with it in Telegram:

- `/start` - Show welcome message
- `/status` - Check bot status and configuration
- `/help` - Show help information

## Notification Format

When a buy is detected, you'll receive a notification like this:

```
🟢 BUY Detected on Uniswap V4

📈 Bought: 1,234.56 USDC
📉 Sold: 0.5678 ETH
💰 Value: $1,234.56

🔗 View Transaction
📦 Block: 18123456
⏰ Time: 11/6/2025, 10:30:45 AM

🏊 Pool ID: 0x1234...5678
👤 Sender: 0xabcd...ef01
📊 Price: 2,173.45
```

## Project Structure

```
telegram-bot/
├── src/
│   ├── config.ts                    # Configuration management
│   ├── index.ts                     # Main entry point
│   ├── contracts/
│   │   └── uniswapV4.ts            # Uniswap V4 ABIs and helpers
│   └── services/
│       ├── ethereumService.ts       # Ethereum interaction
│       ├── priceService.ts          # Price fetching (CoinGecko)
│       ├── poolMonitor.ts           # Pool monitoring logic
│       └── telegramService.ts       # Telegram bot logic
├── .env.example                     # Example environment variables
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

## How It Works

1. **Initialization**: The bot connects to Ethereum via the RPC URL and initializes the Telegram bot
2. **Event Listening**: Listens for `Swap` events from the Uniswap V4 Pool Manager contract
3. **Processing**: When a swap is detected:
   - Determines if it's a buy or sell
   - Fetches token information
   - Calculates USD value using CoinGecko API
   - Applies filters (minimum amount, specific pools)
4. **Notification**: Sends formatted notification to your Telegram chat

## Troubleshooting

### Bot not receiving events

- Check that your RPC URL is correct and has sufficient rate limits
- Verify the Uniswap V4 Pool Manager address is correct
- Ensure your RPC provider supports WebSocket or event subscriptions

### Price information not showing

- Verify your CoinGecko API key (if using Pro)
- Check that the tokens are listed on CoinGecko
- The bot will still work without price info, just won't show USD values

### Telegram notifications not sending

- Verify your bot token is correct
- Check that your chat ID is correct
- Make sure you've started a chat with your bot first

## Security Notes

- Never commit your `.env` file to version control
- Keep your bot token and API keys secure
- Use environment variables for all sensitive data
- Consider using a dedicated wallet for monitoring (read-only)

## Advanced Configuration

### Monitoring Specific Pools

To monitor only specific pools, add their pool IDs to the `MONITORED_POOLS` variable:

```env
MONITORED_POOLS=0x1234...,0x5678...,0xabcd...
```

### Adjusting Cache Duration

Edit `src/services/priceService.ts` to change the price cache duration:

```typescript
private readonly CACHE_DURATION = 60000; // 1 minute (in milliseconds)
```

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

MIT

## Disclaimer

This bot is for informational purposes only. Always verify transactions independently before making trading decisions.

