import { Telegraf, Markup } from 'telegraf';
import { ethers } from 'ethers';
import { config } from '../config';
import { ProcessedSwap } from './poolMonitor';
import { EthereumService } from './ethereumService';
import { DatabaseService } from './databaseService';
import { BackfillService } from './backfillService';
import { PriceService } from './priceService';
import { UIRenderer } from './uiRenderer';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface MessageQueue {
  message: string;
  options: any;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

// ============================================================================
// MAIN SERVICE - Now with persistent database storage!
// ============================================================================

export class TelegramService {
  private bot: Telegraf;
  private ethereumService: EthereumService | null = null;
  private db: DatabaseService;
  private ui: UIRenderer;
  private priceService: PriceService | null = null;
  private backfillService: BackfillService | null = null;
  private messageQueue: MessageQueue[] = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    this.bot = new Telegraf(config.telegram.botToken);
    this.db = new DatabaseService();
    this.ui = new UIRenderer(this.db, 'minimal'); // Clean, professional theme
    this.setupBotCommands();
  }

  // ============================================================================
  // BOT COMMAND SETUP
  // ============================================================================

  private setupBotCommands(): void {
    // /start command - Welcome message
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        `<b>🦅 EAGLE VAULT - SMART MONEY TRACKER</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Track whales, smart money, and alpha in real-time.\n\n` +
        `<b>Quick Start:</b>\n` +
        `• /help - View all commands\n` +
        `• /settings - Configure alerts\n` +
        `• /track [wallet] - Follow smart money\n\n` +
        `Type /help to see all features!`,
        { parse_mode: 'HTML' }
      );
    });

    // /stats command - Enhanced with database analytics
    this.bot.command('stats', async (ctx) => {
      try {
        const topWallets = await this.db.getTopWallets(100);
        const totalSwapsTracked = topWallets.reduce((sum: any, w: any) => sum + w.totalSwaps, 0);
        const totalVolumeUSD = topWallets.reduce((sum: any, w: any) => sum + w.totalVolumeUSD, 0);
        
        const trackedWallets = await this.db.getTrackedWallets();
        const mutedWallets = await this.db.getMutedWallets();
        const settings = await this.db.getAlertSettings();
        
        const topWallet = topWallets[0];
        
        await ctx.reply(
          `<b>📊 STATS</b>\n\n` +
          `<b>Total Swaps</b>  ${totalSwapsTracked}\n` +
          `<b>Known Wallets</b>  ${topWallets.length}\n` +
          `<b>Tracking</b>  ${trackedWallets.length}\n` +
          `<b>Muted</b>  ${mutedWallets.length}\n\n` +
          (topWallet ? `<b>Top Trader</b>\n<code>${topWallet.address.slice(0, 6)}...${topWallet.address.slice(-4)}</code>  ${topWallet.totalSwaps} swaps\n\n` : '') +
          `<i>Status: 🟢 ACTIVE</i>`,
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        await ctx.reply('❌ Error fetching statistics');
        console.error('Stats command error:', error);
      }
    });

    // /settings command - Interactive settings menu with database persistence
    this.bot.command('settings', async (ctx) => {
      try {
        const settings = await this.db.getAlertSettings();
        
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback(`🐋 Whale Alerts: ${settings.enableWhaleAlerts ? '✅' : '❌'}`, 'toggle_whale'),
            Markup.button.callback(`🧠 Smart Money: ${settings.enableSmartMoneyAlerts ? '✅' : '❌'}`, 'toggle_smart')
          ],
          [
            Markup.button.callback(`📊 Small Trades: ${settings.showSmallTrades ? '✅' : '❌'}`, 'toggle_small'),
            Markup.button.callback(`🆕 New Tokens: ${settings.onlyNewTokens ? '✅' : '❌'}`, 'toggle_new')
          ],
          [
            Markup.button.callback('💰 Set Min Threshold', 'set_threshold'),
            Markup.button.callback('🔄 Refresh', 'refresh_settings')
          ]
        ]);

        await ctx.reply(
          `<b>⚙️ ALERT SETTINGS</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `<b>Current Configuration:</b>\n\n` +
          `🐋 Whale Alerts: <code>${settings.enableWhaleAlerts ? 'Enabled' : 'Disabled'}</code>\n` +
          `🧠 Smart Money Tracking: <code>${settings.enableSmartMoneyAlerts ? 'Enabled' : 'Disabled'}</code>\n` +
          `📊 Small Trade Alerts: <code>${settings.showSmallTrades ? 'Enabled' : 'Disabled'}</code>\n` +
          `🆕 New Tokens Only: <code>${settings.onlyNewTokens ? 'Yes' : 'No'}</code>\n\n` +
          `<b>Thresholds:</b>\n` +
          `Min: <code>$${this.formatNumber(settings.minThreshold)}</code>\n` +
          (settings.maxThreshold ? `Max: <code>$${this.formatNumber(settings.maxThreshold)}</code>\n` : '') +
          `\n<i>Click buttons below to toggle settings</i>`,
          { parse_mode: 'HTML', ...keyboard }
        );
      } catch (error) {
        await ctx.reply('❌ Error loading settings');
        console.error('Settings command error:', error);
      }
    });

    // /threshold command with database persistence
    this.bot.command('threshold', async (ctx) => {
      const args = ctx.message.text.split(' ');
      const settings = await this.db.getAlertSettings();
      
      if (args.length < 2) {
        await ctx.reply(
          '<b>💰 SET THRESHOLD</b>\n\n' +
          '<b>Usage:</b> <code>/threshold [amount]</code>\n' +
          '<b>Example:</b> <code>/threshold 1000</code>\n\n' +
          '<b>Current:</b> $' + this.formatNumber(settings.minThreshold),
          { parse_mode: 'HTML' }
        );
        return;
      }
      const newThreshold = parseFloat(args[1]);
      if (isNaN(newThreshold) || newThreshold < 0) {
        await ctx.reply('❌ Invalid amount. Please provide a positive number.');
        return;
      }
      
      await this.db.updateAlertSettings({ minThreshold: newThreshold });
      
      await ctx.reply(
        `✅ <b>Threshold Updated</b>\n\n` +
        `New minimum: <code>$${this.formatNumber(newThreshold)}</code>\n` +
        `You'll now receive alerts for swaps above this amount.`,
        { parse_mode: 'HTML' }
      );
    });

    // /mute command with database persistence
    this.bot.command('mute', async (ctx) => {
      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        await ctx.reply('Usage: /mute <wallet_address>');
        return;
      }
      const wallet = args[1].toLowerCase();
      await this.db.muteWallet(wallet);
      await ctx.reply(
        `🔇 Muted wallet: <code>${wallet}</code>`,
        { parse_mode: 'HTML' }
      );
    });

    // /unmute command with database persistence
    this.bot.command('unmute', async (ctx) => {
      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        await ctx.reply('Usage: /unmute <wallet_address>');
        return;
      }
      const wallet = args[1].toLowerCase();
      await this.db.unmuteWallet(wallet);
      await ctx.reply(
        `🔊 Unmuted wallet: <code>${wallet}</code>`,
        { parse_mode: 'HTML' }
      );
    });

    // /wallet command - Advanced wallet analytics from database
    this.bot.command('wallet', async (ctx) => {
      try {
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
          await ctx.reply(
            '<b>📊 WALLET ANALYTICS</b>\n\n' +
            '<b>Usage:</b> <code>/wallet [address]</code>\n' +
            '<b>Example:</b> <code>/wallet 0x742d...</code>\n\n' +
            'Get detailed stats for any wallet address.',
            { parse_mode: 'HTML' }
          );
          return;
        }
        const walletAddr = args[1].toLowerCase();
        const stats = await this.db.getWallet(walletAddr);
        
        if (!stats) {
          await ctx.reply(
            `<b>📊 WALLET INFO</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<code>${walletAddr}</code>\n\n` +
            `❌ No trading activity recorded yet.\n\n` +
            `<b>Status:</b>\n` +
            `➕ Not tracked | 🔊 Notifications on\n\n` +
            `<i>Use /track ${walletAddr.slice(0, 10)}... to follow this wallet</i>`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        
        const winRate = stats.totalTokensTraded > 0 ? (stats.profitableTokens / stats.totalTokensTraded * 100) : 0;
        const classification = stats.classification || 'Trader';
        const trackedSince = stats.isTracked && stats.trackedSince ? this.formatTimeAgo(Math.floor(stats.trackedSince.getTime() / 1000)) : null;
        
        await ctx.reply(
          `<b>📊 ${classification.toUpperCase()}</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `<code>${walletAddr}</code>\n\n` +
          `<b>📊 Trading Stats</b>\n` +
          `Total Swaps: <code>${stats.totalSwaps}</code>\n` +
          `Total Volume: <code>$${this.formatNumber(stats.totalVolumeUSD)}</code>\n` +
          `Buys: <code>${stats.buyCount}</code> | Sells: <code>${stats.sellCount}</code>\n\n` +
          `<b>💰 Size Profile</b>\n` +
          `Avg Buy: <code>$${this.formatNumber(stats.avgBuySize)}</code>\n` +
          `Largest: <code>$${this.formatNumber(stats.largestBuy)}</code>\n\n` +
          `<b>📈 Performance</b>\n` +
          `Win Rate: <code>${winRate.toFixed(1)}%</code>\n` +
          `Tokens Traded: <code>${stats.totalTokensTraded}</code>\n\n` +
          `<b>⏰ Activity</b>\n` +
          `First Seen: <code>${this.formatTimeAgo(Math.floor(stats.firstSeen.getTime() / 1000))}</code>\n` +
          `Last Seen: <code>${this.formatTimeAgo(Math.floor(stats.lastSeen.getTime() / 1000))}</code>\n` +
          (trackedSince ? `\n⭐ <b>Tracked since:</b> ${trackedSince}\n` : '') +
          (stats.isMuted ? `\n🔇 <b>Muted</b> - no alerts\n` : ''),
          { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [
                Markup.button.url('Etherscan', `https://etherscan.io/address/${walletAddr}`),
                Markup.button.url('Debank', `https://debank.com/profile/${walletAddr}`)
              ],
              [
                Markup.button.callback(stats.isTracked ? '❌ Untrack' : '✅ Track', `track_${walletAddr}`),
                Markup.button.callback(stats.isMuted ? '🔊 Unmute' : '🔇 Mute', `mute_${walletAddr}`)
              ]
            ])
          }
        );
      } catch (error) {
        await ctx.reply('❌ Error fetching wallet data');
        console.error('Wallet command error:', error);
      }
    });

    // /leaderboard command - Top wallets by volume from database
    this.bot.command('leaderboard', async (ctx) => {
      try {
        const topWallets = await this.db.getTopWallets(10);
        
        if (topWallets.length === 0) {
          await ctx.reply(
            '📊 No trading activity recorded yet.\nLeaderboard will populate as swaps are detected.',
            { parse_mode: 'HTML' }
          );
          return;
        }
        
        let message = `<b>🏆 TOP TRADERS</b>\n\n`;
        
        topWallets.forEach((wallet: any, index: any) => {
          const num = (index + 1).toString().padStart(2, ' ');
          const addr = wallet.address.slice(0, 6) + '...' + wallet.address.slice(-4);
          const volume = this.formatNumber(wallet.totalVolumeUSD);
          const swaps = wallet.totalSwaps.toString();
          
          message += `<code>${num}</code>  <code>${addr}</code>\n`;
          message += `     <b>$${volume}</b>  •  ${swaps} swaps${wallet.isTracked ? ' ⭐' : ''}\n\n`;
        });
        
        message += `<i>Use /wallet [address] for stats</i>`;
        
        await ctx.reply(message, { parse_mode: 'HTML' });
      } catch (error) {
        await ctx.reply('❌ Error loading leaderboard');
        console.error('Leaderboard command error:', error);
      }
    });

    // /track command - Enhanced with database persistence
    this.bot.command('track', async (ctx) => {
      try {
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
          const trackedWallets = await this.db.getTrackedWallets();
          await ctx.reply(
            '<b>⭐ TRACK WALLET</b>\n\n' +
            '<b>Usage:</b> <code>/track [address] [label]</code>\n' +
            '<b>Example:</b> <code>/track 0x742d... Smart Money Alpha</code>\n\n' +
            '<b>Currently Tracking:</b>\n' +
            (trackedWallets.length > 0 
              ? trackedWallets.map((w: any) => `• <code>${w.address.slice(0, 12)}...</code>${w.label ? ` - ${w.label}` : ''}`).join('\n')
              : '<i>No wallets tracked yet</i>'),
            { parse_mode: 'HTML' }
          );
          return;
        }
        const wallet = args[1].toLowerCase();
        const label = args.slice(2).join(' ') || undefined;
        
        await this.db.trackWallet(wallet, label);
        
        await ctx.reply(
          `⭐ <b>Now Tracking Wallet</b>\n\n` +
          `<code>${wallet}</code>\n` +
          (label ? `\n<b>Label:</b> ${label}\n` : '') +
          `\n✅ You'll receive priority alerts for all activity from this address!`,
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        await ctx.reply('❌ Error tracking wallet');
        console.error('Track command error:', error);
      }
    });

    // /untrack command with database persistence
    this.bot.command('untrack', async (ctx) => {
      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        await ctx.reply('Usage: /untrack <wallet_address>');
        return;
      }
      const wallet = args[1].toLowerCase();
      
      try {
        await this.db.untrackWallet(wallet);
        
        await ctx.reply(
          `✅ Stopped tracking: <code>${wallet}</code>`,
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        // Wallet might not exist in DB
        await ctx.reply(
          `❌ Wallet was not being tracked: <code>${wallet}</code>`,
          { parse_mode: 'HTML' }
        );
      }
    });

    // /backfill command - Fetch historical data
    this.bot.command('backfill', async (ctx) => {
      const args = ctx.message.text.split(' ');
      let days = 7; // Default to 7 days (token just launched!)

      if (args.length > 1) {
        const parsed = parseInt(args[1]);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 365) {
          days = parsed;
        } else {
          await ctx.reply('⚠️ Please provide a valid number of days (1-365)\nExample: /backfill 7');
          return;
        }
      }

      if (!this.backfillService) {
        await ctx.reply('❌ Backfill service not initialized. Please restart the bot.');
        return;
      }

      // Check if backfill is already running
      if (this.backfillService.isBackfillRunning()) {
        await ctx.reply(
          `⚠️ <b>Backfill Already Running</b>\n\n` +
          `A backfill operation is currently in progress.\n` +
          `Use /cancelbackfill to stop it.`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      await ctx.reply(
        `🔄 <b>Starting Historical Data Backfill</b>\n\n` +
        `📅 Fetching last <b>${days} days</b> of EAGLE swaps...\n` +
        `⏳ This may take a few minutes. Progress updates will follow.\n\n` +
        `<i>Use /cancelbackfill to stop at any time</i>`,
        { parse_mode: 'HTML' }
      );

      // Start backfill with progress updates
      const result = await this.backfillService.backfillSwaps(days, (message) => {
        // Send progress updates to Telegram (throttled to avoid spam)
        if (message.includes('Progress:') || message.includes('complete') || message.includes('Processed:') || message.includes('cancelled')) {
          ctx.reply(message).catch(() => {});
        }
      });

      if (result.cancelled) {
        await ctx.reply(
          `⚠️ <b>Backfill Cancelled</b>\n\n` +
          `📊 <b>${result.swapsProcessed}</b> swaps were processed before cancellation\n` +
          `💾 Progress has been saved to database\n\n` +
          `<i>You can resume by running /backfill again</i>`,
          { parse_mode: 'HTML' }
        );
      } else if (result.success) {
        await ctx.reply(
          `✅ <b>Backfill Complete!</b>\n\n` +
          `📊 <b>${result.swapsProcessed}</b> historical swaps processed\n` +
          `💾 Database updated with complete trading history\n` +
          `🎯 Wallet statistics are now accurate\n\n` +
          `<i>Use /stats or /leaderboard to see updated data!</i>`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply(
          `❌ <b>Backfill Failed</b>\n\n` +
          `Error: ${result.error}\n\n` +
          `<i>Please try again later or contact support.</i>`,
          { parse_mode: 'HTML' }
        );
      }
    });

    // /cancelbackfill command - Stop ongoing backfill
    this.bot.command('cancelbackfill', async (ctx) => {
      if (!this.backfillService) {
        await ctx.reply('❌ Backfill service not initialized.');
        return;
      }

      if (!this.backfillService.isBackfillRunning()) {
        await ctx.reply(
          `ℹ️ No backfill operation is currently running.`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      const cancelled = this.backfillService.cancel();
      
      if (cancelled) {
        await ctx.reply(
          `⚠️ <b>Cancelling Backfill...</b>\n\n` +
          `The backfill will stop after the current swap is processed.\n` +
          `Progress will be saved to the database.\n\n` +
          `<i>Please wait...</i>`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply('❌ Failed to cancel backfill.');
      }
    });

    // /help command - Comprehensive command list
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `<b>🦅 EAGLE VAULT COMMANDS</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `<b>📊 ANALYTICS</b>\n` +
        `<code>/stats</code> - System statistics & activity\n` +
        `<code>/wallet [addr]</code> - Detailed wallet analysis\n` +
        `<code>/leaderboard</code> - Top traders by volume\n\n` +
        `<b>📂 DATA MANAGEMENT</b>\n` +
        `<code>/backfill [days]</code> - Fetch historical data (default: 7d)\n` +
        `<code>/cancelbackfill</code> - Stop ongoing backfill\n\n` +
        `<b>⚙️ SETTINGS</b>\n` +
        `<code>/settings</code> - Configure alert preferences\n` +
        `<code>/threshold [amt]</code> - Set min USD threshold\n\n` +
        `<b>⭐ TRACKING</b>\n` +
        `<code>/track [addr] [label]</code> - Track wallet activity\n` +
        `<code>/untrack [addr]</code> - Stop tracking\n\n` +
        `<b>🔇 FILTERING</b>\n` +
        `<code>/mute [addr]</code> - Mute wallet alerts\n` +
        `<code>/unmute [addr]</code> - Unmute wallet\n\n` +
        `<b>ℹ️ INFO</b>\n` +
        `<code>/start</code> - Welcome message\n` +
        `<code>/help</code> - This command list\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<i>💡 Tip: Use inline buttons on alerts for quick actions!</i>`,
        { parse_mode: 'HTML' }
      );
    });

    // ========================================================================
    // CALLBACK QUERY HANDLERS - Interactive buttons
    // ========================================================================

    this.bot.on('callback_query', async (ctx) => {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
      
      const data = ctx.callbackQuery.data;
      
      // Track/Untrack wallet with database
      if (data.startsWith('track_')) {
        const wallet = data.replace('track_', '').toLowerCase();
        const walletData = await this.db.getWallet(wallet);
        
        if (walletData?.isTracked) {
          // Untrack
          await this.db.untrackWallet(wallet);
          await ctx.answerCbQuery('✅ Wallet untracked');
          await ctx.reply(
            `🔕 Stopped tracking: <code>${wallet}</code>`,
            { parse_mode: 'HTML' }
          );
        } else {
          // Track
          await this.db.trackWallet(wallet);
          await ctx.answerCbQuery('✅ Wallet tracked');
          await ctx.reply(
            `⭐ Now tracking: <code>${wallet}</code>\n` +
            `You'll get priority alerts for this wallet!`,
            { parse_mode: 'HTML' }
          );
        }
      }
      
      // Mute wallet with database
      else if (data.startsWith('mute_')) {
        const wallet = data.replace('mute_', '').toLowerCase();
        const walletData = await this.db.getWallet(wallet);
        
        if (walletData?.isMuted) {
          // Unmute
          await this.db.unmuteWallet(wallet);
          await ctx.answerCbQuery('🔊 Wallet unmuted');
          await ctx.reply(
            `🔊 Unmuted: <code>${wallet}</code>\n` +
            `You'll now receive alerts from this address.`,
            { parse_mode: 'HTML' }
          );
        } else {
          // Mute
          await this.db.muteWallet(wallet);
          await ctx.answerCbQuery('🔇 Wallet muted');
          await ctx.reply(
            `🔇 Muted: <code>${wallet}</code>\n` +
            `No more notifications from this address.`,
            { parse_mode: 'HTML' }
          );
        }
      }
      
      // Settings toggles with database
      else if (data === 'toggle_whale') {
        const settings = await this.db.getAlertSettings();
        await this.db.updateAlertSettings({ enableWhaleAlerts: !settings.enableWhaleAlerts });
        await ctx.answerCbQuery(`🐋 Whale Alerts: ${!settings.enableWhaleAlerts ? 'ON' : 'OFF'}`);
        ctx.telegram.sendMessage(
          config.telegram.chatId,
          '✅ Updated! Use /settings to see current configuration.',
          { parse_mode: 'HTML' }
        );
      }
      
      else if (data === 'toggle_smart') {
        const settings = await this.db.getAlertSettings();
        await this.db.updateAlertSettings({ enableSmartMoneyAlerts: !settings.enableSmartMoneyAlerts });
        await ctx.answerCbQuery(`🧠 Smart Money: ${!settings.enableSmartMoneyAlerts ? 'ON' : 'OFF'}`);
        ctx.telegram.sendMessage(
          config.telegram.chatId,
          '✅ Updated! Use /settings to see current configuration.',
          { parse_mode: 'HTML' }
        );
      }
      
      else if (data === 'toggle_small') {
        const settings = await this.db.getAlertSettings();
        await this.db.updateAlertSettings({ showSmallTrades: !settings.showSmallTrades });
        await ctx.answerCbQuery(`📊 Small Trades: ${!settings.showSmallTrades ? 'ON' : 'OFF'}`);
        ctx.telegram.sendMessage(
          config.telegram.chatId,
          '✅ Updated! Use /settings to see current configuration.',
          { parse_mode: 'HTML' }
        );
      }
      
      else if (data === 'toggle_new') {
        const settings = await this.db.getAlertSettings();
        await this.db.updateAlertSettings({ onlyNewTokens: !settings.onlyNewTokens });
        await ctx.answerCbQuery(`🆕 New Tokens Only: ${!settings.onlyNewTokens ? 'ON' : 'OFF'}`);
        ctx.telegram.sendMessage(
          config.telegram.chatId,
          '✅ Updated! Use /settings to see current configuration.',
          { parse_mode: 'HTML' }
        );
      }
      
      else if (data === 'refresh_settings') {
        await ctx.answerCbQuery('🔄 Refreshed');
        ctx.telegram.sendMessage(
          config.telegram.chatId,
          '/settings'
        );
      }
      
      else if (data === 'set_threshold') {
        const settings = await this.db.getAlertSettings();
        await ctx.answerCbQuery('Use /threshold [amount]');
        await ctx.reply(
          '<b>💰 SET THRESHOLD</b>\n\n' +
          'Use command: <code>/threshold [amount]</code>\n' +
          '<b>Example:</b> <code>/threshold 5000</code>\n\n' +
          `<b>Current:</b> $${this.formatNumber(settings.minThreshold)}`,
          { parse_mode: 'HTML' }
        );
      }
    });
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 2000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.log(`⏳ Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async initialize(ethereumService?: EthereumService, priceService?: PriceService): Promise<void> {
    try {
      // Initialize database first
      console.log('💾 Connecting to database...');
      await this.db.initialize();
      
      // Initialize backfill service if ethereumService and priceService are provided
      if (ethereumService && priceService) {
        this.ethereumService = ethereumService;
        this.priceService = priceService;
        this.backfillService = new BackfillService(ethereumService, priceService, this.db);
        console.log('✅ Backfill service initialized');
      }
      
      console.log('🔌 Connecting to Telegram API...');
      
      const botInfo = await this.retryWithBackoff(
        () => this.bot.telegram.getMe(),
        3,
        2000
      );
      
      console.log(`✅ Telegram bot connected: @${botInfo.username}`);
      
      // Get settings from database
      const settings = await this.db.getAlertSettings();
      const trackedWallets = await this.db.getTrackedWallets();
      
      // Send a startup message (with retry)
      const poolCount = config.uniswapV4.monitoredPools.length;
      const poolsText = poolCount > 0 ? `${poolCount} pool(s)` : 'all pools';
      const monitoredToken = config.filters.monitoredToken;
      
      try {
        await this.retryWithBackoff(
          () => this.bot.telegram.sendMessage(
            config.telegram.chatId,
            `<b>🦅 EAGLE VAULT - SMART MONEY TRACKER</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<b>Status:</b> <code>🟢 ACTIVE</code>\n` +
            `<b>Network:</b> <code>Ethereum Mainnet</code>\n` +
            `<b>Monitoring:</b> <code>${poolsText}</code>\n` +
            `<b>Token Filter:</b> <code>${monitoredToken.slice(0, 10)}...${monitoredToken.slice(-8)}</code>\n` +
            `<b>Threshold:</b> <code>$${settings.minThreshold}</code>\n` +
            `<b>Tracked Wallets:</b> <code>${trackedWallets.length}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<i>✨ Only monitoring EAGLE token swaps!</i>\n` +
            `<i>Type /help to see available commands</i>`,
            { parse_mode: 'HTML' }
          ),
          2,
          2000
        );
      } catch (msgError) {
        console.warn('⚠️  Could not send startup message, but bot is connected');
      }
      
      console.log('✅ Telegram bot initialized successfully');
      console.log(`📊 Tracking ${trackedWallets.length} wallets`);
      console.log(`🎯 Only monitoring EAGLE token: ${monitoredToken}`);
      
      // Start bot for handling commands
      this.bot.launch().catch((err) => {
        console.error('Failed to start bot polling:', err);
      });
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Telegram bot after retries');
      console.error('Error details:', error.message);
      
      // Check for common issues
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.error('\n📡 Network connectivity issue detected:');
        console.error('   - Check your internet connection');
        console.error('   - Verify firewall settings');
        console.error('   - Try: curl -I https://api.telegram.org');
        console.error('   - If in China/restricted region, you may need a proxy\n');
      }
      
      throw error;
    }
  }

  setEthereumService(service: EthereumService): void {
    this.ethereumService = service;
  }

  // ============================================================================
  // WALLET MANAGEMENT & ANALYTICS - Database powered
  // ============================================================================

  async isWalletMuted(wallet: string): Promise<boolean> {
    const walletData = await this.db.getWallet(wallet.toLowerCase());
    return walletData?.isMuted || false;
  }

  async isWalletTracked(wallet: string): Promise<boolean> {
    const walletData = await this.db.getWallet(wallet.toLowerCase());
    return walletData?.isTracked || false;
  }

  private getClassificationEmoji(classification: string): string {
    const emojiMap: Record<string, string> = {
      'Mega Whale': '🐋',
      'Whale': '🐳',
      'Smart Money': '🧠',
      'Big Fish': '🦈',
      'Active Trader': '💼',
      'Regular Trader': '🐟',
      'Small Trader': '🦐',
      'Trader': '👤',
    };
    return emojiMap[classification] || '👤';
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const secondsAgo = now - Math.floor(timestamp / 1000);
    
    if (secondsAgo < 60) return 'just now';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
    return `${Math.floor(secondsAgo / 604800)}w ago`;
  }

  // ============================================================================
  // NOTIFICATION LOGIC & FILTERING
  // ============================================================================

  async shouldNotify(swap: ProcessedSwap): Promise<boolean> {
    // FIRST: Only notify for EAGLE token (your specific token)
    const monitoredToken = config.filters.monitoredToken.toLowerCase();
    const swapToken = (swap.token1Info?.address || '').toLowerCase();
    
    if (swapToken !== monitoredToken) {
      console.log(`⏭️  Skipping non-EAGLE token: ${swapToken}`);
      return false;
    }
    
    // Get settings from database
    const settings = await this.db.getAlertSettings();
    
    // Skip if wallet is muted
    if (await this.isWalletMuted(swap.actualTrader)) {
      console.log(`⏭️  Skipping muted wallet: ${swap.actualTrader}`);
      return false;
    }

    // Always notify for tracked wallets (high priority)
    if (await this.isWalletTracked(swap.actualTrader)) {
      return true;
    }

    // Check if small trades are disabled
    if (!settings.showSmallTrades && swap.valueUSD && swap.valueUSD < settings.minThreshold) {
      return false;
    }

    // Check threshold
    if (swap.valueUSD !== null && swap.valueUSD < settings.minThreshold) {
      return false;
    }

    // Whale alert filtering
    if (settings.enableWhaleAlerts && swap.valueUSD && swap.valueUSD >= 50000) {
      return true;
    }

    // Smart money detection
    if (settings.enableSmartMoneyAlerts) {
      const walletData = await this.db.getWallet(swap.actualTrader.toLowerCase());
      if (walletData && walletData.classification) {
        if (walletData.classification === 'Smart Money' || walletData.classification.includes('Whale')) {
          return true;
        }
      }
    }

    return true;
  }

  private async getNotificationPriority(swap: ProcessedSwap): Promise<'high' | 'normal' | 'low'> {
    // Get settings from database
    const settings = await this.db.getAlertSettings();
    
    // High priority for tracked wallets
    if (await this.isWalletTracked(swap.actualTrader)) {
      return 'high';
    }
    
    // High priority for whales
    if (swap.valueUSD && swap.valueUSD >= 100000) {
      return 'high';
    }
    
    // Low priority for small trades
    if (swap.valueUSD && swap.valueUSD < settings.minThreshold) {
      return 'low';
    }
    
    return 'normal';
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // Sort by priority (high -> normal -> low) and timestamp
      this.messageQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });
      
      // Send messages with rate limiting (max 30 messages per second for Telegram)
      while (this.messageQueue.length > 0) {
        const queuedMessage = this.messageQueue.shift();
        if (!queuedMessage) break;
        
        try {
          await this.bot.telegram.sendMessage(
            config.telegram.chatId,
            queuedMessage.message,
            queuedMessage.options
          );
          
          // Rate limit: 33ms between messages (30 msg/sec)
          await new Promise(resolve => setTimeout(resolve, 33));
        } catch (error: any) {
          console.error('❌ Error sending queued message:', error.message);
          
          // If rate limited, wait longer
          if (error.response?.error_code === 429) {
            const retryAfter = error.response.parameters?.retry_after || 30;
            console.log(`⏳ Rate limited. Waiting ${retryAfter}s...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // ============================================================================
  // NOTIFICATION SENDING
  // ============================================================================

  async sendBuyNotification(swap: ProcessedSwap): Promise<void> {
    try {
      // Save swap to database (returns null if duplicate)
      const savedSwap = await this.db.saveSwap(swap);
      
      // If swap already exists (duplicate), skip notification
      if (!savedSwap) {
        console.log(`⏭️  Skipping duplicate notification for tx: ${swap.txHash}`);
        return;
      }
      
      // Update wallet statistics
      await this.db.updateWalletStats(swap.actualTrader, swap);
      
      // Check if should notify
      if (!(await this.shouldNotify(swap))) {
        return;
      }

      // Render using modern UI system
      const { text: message, keyboard } = await this.ui.renderTradeCard(swap);
      const priority = await this.getNotificationPriority(swap);
      
      // Save notification history
      if (swap.token1Info?.address && swap.valueUSD) {
        await this.db.saveNotification({
          walletAddress: swap.actualTrader,
          tokenAddress: swap.token1Info.address,
          swapValue: swap.valueUSD,
          messageType: swap.amount1 > 0n ? 'buy' : 'sell',
          priority,
        });
      }
      
      // Add to queue instead of sending directly
      this.messageQueue.push({
        message,
        options: {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
          reply_markup: keyboard,
        },
        priority,
        timestamp: Date.now(),
      });
      
      // Process queue asynchronously
      this.processMessageQueue().catch(error => {
        console.error('❌ Error processing message queue:', error.message);
      });
      
      // Log notification type
      const priorityEmoji = priority === 'high' ? '⚡' : priority === 'normal' ? '📬' : '📭';
      console.log(`${priorityEmoji} Queued notification (${priority}) for ${swap.actualTrader.slice(0, 10)}...`);
    } catch (error: any) {
      console.error('❌ Error processing swap notification:', error.message);
    }
  }

  // ============================================================================
  // MESSAGE FORMATTING & UI
  // ============================================================================

  private getTier(valueUSD: number | null): { name: string; emoji: string; } {
    if (valueUSD === null || valueUSD === 0) return { name: 'STANDARD', emoji: '📊' };
    
    if (valueUSD >= 1000000) return { name: 'LEGENDARY', emoji: '👑' };
    if (valueUSD >= 500000) return { name: 'MEGA WHALE', emoji: '🐋' };
    if (valueUSD >= 100000) return { name: 'WHALE', emoji: '🐳' };
    if (valueUSD >= 50000) return { name: 'SHARK', emoji: '🦈' };
    if (valueUSD >= 10000) return { name: 'DOLPHIN', emoji: '🐬' };
    if (valueUSD >= 5000) return { name: 'FISH', emoji: '🐟' };
    if (valueUSD >= 1000) return { name: 'SHRIMP', emoji: '🦐' };
    return { name: 'MICRO', emoji: '🔬' };
  }

  private getVolumeBar(valueUSD: number | null, maxValue: number = 100000): string {
    if (!valueUSD || valueUSD <= 0) return '▱▱▱▱▱▱▱▱▱▱';
    
    const percentage = Math.min((valueUSD / maxValue) * 100, 100);
    const filledBars = Math.floor(percentage / 10);
    const emptyBars = 10 - filledBars;
    
    return '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);
  }

  private async getTradeIndicators(swap: ProcessedSwap): Promise<string> {
    const indicators: string[] = [];
    
    // Tracked wallet badge
    if (await this.isWalletTracked(swap.actualTrader)) {
      indicators.push('⭐');
    }
    
    // Whale badge
    if (swap.valueUSD && swap.valueUSD >= 100000) {
      indicators.push('🐋');
    }
    
    // Smart money badge
    const walletData = await this.db.getWallet(swap.actualTrader.toLowerCase());
    if (walletData) {
      if (walletData.classification === 'Smart Money') {
        indicators.push('🧠');
      }
      
      // New wallet badge (first trade)
      if (walletData.totalSwaps === 1) {
        indicators.push('🆕');
      }
      
      // Active trader (many trades recently)
      if (walletData.totalSwaps > 10) {
        indicators.push('🔥');
      }
    }
    
    return indicators.join(' ');
  }

  private async createInlineKeyboard(swap: ProcessedSwap) {
    const token0Address = swap.token0Info?.address === '0x0000000000000000000000000000000000000000' 
      ? 'ETH' 
      : swap.token0Info?.address || '';
    const token1Address = swap.token1Info?.address === '0x0000000000000000000000000000000000000000'
      ? 'ETH'
      : swap.token1Info?.address || '';
    
    const etherscanTxUrl = `https://etherscan.io/tx/${swap.txHash}`;
    const etherscanWalletUrl = `https://etherscan.io/address/${swap.actualTrader}`;
    const debankWalletUrl = `https://debank.com/profile/${swap.actualTrader}`;
    const uniswapUrl = `https://app.uniswap.org/swap?chain=mainnet&inputCurrency=${token0Address}&outputCurrency=${token1Address}`;
    const dextoolsUrl = `https://www.dextools.io/app/en/ether/pair-explorer/${token1Address}`;
    const geckoTerminalUrl = `https://www.geckoterminal.com/eth/pools/${swap.poolId}`;
    const etherscanTokenUrl = `https://etherscan.io/token/${token1Address}`;
    
    const isTracked = await this.isWalletTracked(swap.actualTrader);
    const isMuted = await this.isWalletMuted(swap.actualTrader);
    
    return {
      inline_keyboard: [
        [
          { text: '📊 Chart', url: dextoolsUrl },
          { text: '🔍 Token', url: etherscanTokenUrl },
          { text: '💦 Pool', url: geckoTerminalUrl },
        ],
        [
          { text: '🔗 TX', url: etherscanTxUrl },
          { text: '👤 Wallet', url: etherscanWalletUrl },
          { text: '💼 DeBank', url: debankWalletUrl },
        ],
        [
          { text: '🦄 Trade on Uniswap', url: uniswapUrl },
        ],
        [
          { text: isTracked ? '❌ Untrack' : '⭐ Track', callback_data: `track_${swap.actualTrader}` },
          { text: isMuted ? '🔊 Unmute' : '🔇 Mute', callback_data: `mute_${swap.actualTrader}` },
        ],
      ],
    };
  }

  private async formatSwapMessage(swap: ProcessedSwap): Promise<string> {
    const date = new Date(swap.timestamp * 1000);
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    const token0Symbol = swap.token0Info?.symbol || 'Token0';
    const token1Symbol = swap.token1Info?.symbol || 'Token1';
    
    const isEagleBuy = swap.amount1 > 0n;
    const action = isEagleBuy ? '🟢 BUY' : '🔴 SELL';
    
    const amount0Abs = swap.amount0 < 0n ? -swap.amount0 : swap.amount0;
    const amount1Abs = swap.amount1 < 0n ? -swap.amount1 : swap.amount1;
    
    const amount0Formatted = this.formatNumber(
      ethers.formatUnits(amount0Abs, swap.token0Info?.decimals || 18)
    );
    const amount1Formatted = this.formatNumber(
      ethers.formatUnits(amount1Abs, swap.token1Info?.decimals || 18)
    );
    
    const eagleAmount = amount1Formatted;
    const ethAmount = amount0Formatted;
    
    let usdPricePerToken = 'N/A';
    let totalValueUSD = 'N/A';
    
    if (swap.valueUSD !== null && swap.valueUSD > 0) {
      totalValueUSD = this.formatNumber(swap.valueUSD);
      const tokenAmount = parseFloat(eagleAmount.replace(/[KM]/g, ''));
      if (tokenAmount > 0) {
        const pricePerToken = swap.valueUSD / tokenAmount;
        usdPricePerToken = this.formatNumber(pricePerToken);
      }
    }
    
    const tier = this.getTier(swap.valueUSD);
    const isTracked = await this.isWalletTracked(swap.actualTrader);
    const indicators = await this.getTradeIndicators(swap);
    
    // Get wallet info for classification
    const walletData = await this.db.getWallet(swap.actualTrader.toLowerCase());
    const classification = walletData?.classification || 'Trader';
    const classEmoji = this.getClassificationEmoji(classification);
    
    // Build world-class message
    let message = `${action} ${tier.emoji}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Main trade info
    message += `<b>${eagleAmount} ${token1Symbol}</b>`;
    if (totalValueUSD !== 'N/A') {
      message += ` <b>≈ $${totalValueUSD}</b>`;
    }
    message += `\n`;
    
    // Price info
    message += `💰 <code>${ethAmount} ${token0Symbol}</code>`;
    if (usdPricePerToken !== 'N/A') {
      message += ` · $${usdPricePerToken}/${token1Symbol}`;
    }
    message += `\n\n`;
    
    // Trader info with badges
    message += `${classEmoji} <b>${classification}</b>`;
    if (indicators) {
      message += ` ${indicators}`;
    }
    message += `\n`;
    message += `<code>${swap.actualTrader.slice(0, 8)}...${swap.actualTrader.slice(-6)}</code>`;
    
    // Add wallet stats if available
    if (walletData && walletData.totalSwaps > 1) {
      const avgSize = walletData.avgBuySize > 0 ? `$${this.formatNumber(walletData.avgBuySize)}` : 'N/A';
      message += `\n📊 ${walletData.totalSwaps} swaps · Avg: ${avgSize}`;
    }
    
    message += `\n\n`;
    
    // Volume bar if USD value available
    if (swap.valueUSD && swap.valueUSD > 0) {
      const volumeBar = this.getVolumeBar(swap.valueUSD);
      message += `${volumeBar} ${tier.name}\n\n`;
    }
    
    // Footer
    message += `<i>⏰ ${timeStr} · #${swap.blockNumber}</i>`;
    
    return message;
  }

  private formatNumber(num: number | string): string {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K';
    } else if (value >= 1) {
      return value.toFixed(2);
    } else if (value >= 0.01) {
      return value.toFixed(4);
    } else {
      return value.toFixed(8);
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Shutting down Telegram bot...');
    await this.bot.stop();
    await this.db.disconnect();
    console.log('✅ Telegram bot and database stopped');
  }
}

