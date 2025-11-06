import { validateConfig } from './config';
import { EthereumService } from './services/ethereumService';
import { ChainlinkService } from './services/chainlinkService';
import { PriceService } from './services/priceService';
import { PoolMonitor } from './services/poolMonitor';
import { TelegramService } from './services/telegramService';

async function main() {
  console.log('🚀 Starting Uniswap V4 Telegram Bot...\n');

  try {
    // Validate configuration
    console.log('📋 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration valid\n');

    // Initialize services
    console.log('🔧 Initializing services...');
    const ethereumService = new EthereumService();
    const chainlinkService = new ChainlinkService(ethereumService.getProvider());
    const priceService = new PriceService(chainlinkService);
    const poolMonitor = new PoolMonitor(ethereumService, priceService);
    const telegramService = new TelegramService();
    
    // Set ethereum service reference for price calculations in messages
    telegramService.setEthereumService(ethereumService);

    // Initialize Telegram bot with services for backfill functionality
    await telegramService.initialize(ethereumService, priceService);
    console.log('');

    // Start monitoring pools
    await poolMonitor.startMonitoring(async (swap) => {
      const action = swap.amount1 > 0n ? 'BUY' : 'SELL'; // amount1 > 0 = EAGLE leaving pool = BUY
      const tokenSymbol = swap.token1Info?.symbol || 'TOKEN';
      console.log(`\n${tokenSymbol} ${action} detected | ${swap.txHash}`);
      
      await telegramService.sendBuyNotification(swap);
    });

    console.log('\n✨ Bot is running! Press Ctrl+C to stop.\n');

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n\n🛑 Shutting down...');
      poolMonitor.stopMonitoring();
      await telegramService.stop();
      console.log('👋 Goodbye!');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the bot
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

