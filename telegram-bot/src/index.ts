import { validateConfig, config } from './config';
import { EthereumService } from './services/ethereumService';
import { ChainlinkService } from './services/chainlinkService';
import { PriceService } from './services/priceService';
import { PoolMonitor } from './services/poolMonitor';
import { TelegramService } from './services/telegramService';

async function main() {
  console.log('🚀 Starting Uniswap V4 Telegram Bot (Multi-Chain)...\n');

  try {
    // Validate configuration
    console.log('📋 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration valid\n');

    // Initialize services
    console.log('🔧 Initializing services...');
    
    const telegramService = new TelegramService();
    const poolMonitors: PoolMonitor[] = [];
    
    // Services for backfill (prefer Ethereum, fallback to first available)
    let backfillEthereumService: EthereumService | undefined;
    let backfillPriceService: PriceService | undefined;

    // Initialize services for each chain
    for (const chainConfig of config.chains) {
      console.log(`\n⛓️ Setting up ${chainConfig.name}...`);
      
      const ethereumService = new EthereumService(chainConfig);
      const chainlinkService = new ChainlinkService(
        ethereumService.getProvider(), 
        chainConfig.chainlinkFeed
      );
      const priceService = new PriceService(chainlinkService);
      const poolMonitor = new PoolMonitor(ethereumService, priceService);
      
      poolMonitors.push(poolMonitor);

      // Select primary service for backfill (prefer Ethereum)
      if (chainConfig.name === 'Ethereum') {
        backfillEthereumService = ethereumService;
        backfillPriceService = priceService;
      } else if (!backfillEthereumService) {
        backfillEthereumService = ethereumService;
        backfillPriceService = priceService;
      }
    }
    
    console.log(''); // New line

    // Initialize Telegram bot (with backfill capability using primary chain)
    await telegramService.initialize(backfillEthereumService, backfillPriceService);
    console.log('');

    // Start monitoring on all chains
    for (const monitor of poolMonitors) {
      await monitor.startMonitoring(async (swap) => {
        // Log to console
        const action = swap.isBuy ? 'BUY' : 'SELL';
        console.log(`\n[${swap.chainName}] ${action} detected | ${swap.txHash}`);
        
        // Send to Telegram
        await telegramService.sendBuyNotification(swap);
      });
    }

    console.log('\n✨ Bot is running on all chains! Press Ctrl+C to stop.\n');

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n\n🛑 Shutting down...');
      
      for (const monitor of poolMonitors) {
        monitor.stopMonitoring();
      }
      
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
