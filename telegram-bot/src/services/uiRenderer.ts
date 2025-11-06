import { ethers } from 'ethers';
import { Markup } from 'telegraf';
import { ProcessedSwap } from './poolMonitor';
import { DatabaseService } from './databaseService';

export type Theme = 'minimal' | 'compact' | 'rich';

/**
 * UIRenderer - Modern, minimal UI design system for Telegram
 * 
 * Design Philosophy:
 * - Typography first (structure > decoration)
 * - Flat hierarchy (clear visual sections)
 * - Consistent whitespace rhythm
 * - Semantic layout (grouped by context)
 * - Minimal Unicode icons (▪, ▲, ▼, ⚡, ⏱)
 * - Interactive-first inline keyboards
 */
export class UIRenderer {
  private db: DatabaseService;
  private theme: Theme;
  
  // Design tokens
  private divider = '────────────────────────';
  private compactDivider = '─────────────';
  
  constructor(db: DatabaseService, theme: Theme = 'minimal') {
    this.db = db;
    this.theme = theme;
  }

  /**
   * Format numbers with K/M suffixes for readability
   */
  formatNumber(value: number | string): string {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(n)) return '—';
    
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
    if (n >= 1) return n.toFixed(2);
    if (n >= 0.01) return n.toFixed(4);
    if (n >= 0.0001) return n.toFixed(6);
    
    return n.toExponential(2);
  }

  /**
   * Main trade card renderer - Bloomberg-style minimal design
   */
  async renderTradeCard(swap: ProcessedSwap): Promise<{ text: string; keyboard: any }> {
    const walletData = await this.db.getWallet(swap.actualTrader.toLowerCase());
    const tier = walletData?.classification || 'Trader';
    const winRate = walletData && walletData.totalSwaps > 0
      ? walletData.profitableTokens / walletData.totalSwaps
      : 0;
    const confidence = winRate > 0 ? `${(winRate * 100).toFixed(0)}%` : '—';

    const tokenIn = swap.token0Info?.symbol || 'Token0';
    const tokenOut = swap.token1Info?.symbol || 'Token1';
    const valueUSD = swap.valueUSD ? `$${this.formatNumber(swap.valueUSD)}` : '—';
    const direction = swap.amount1 > 0n ? 'BUY' : 'SELL';
    const directionIcon = swap.amount1 > 0n ? '▲' : '▼';

    const ethAmount = this.formatNumber(
      ethers.formatUnits(
        swap.amount0 < 0n ? -swap.amount0 : swap.amount0,
        swap.token0Info?.decimals || 18
      )
    );
    const tokenAmount = this.formatNumber(
      ethers.formatUnits(
        swap.amount1 < 0n ? -swap.amount1 : swap.amount1,
        swap.token1Info?.decimals || 18
      )
    );

    // Calculate price per token
    let pricePerToken = '—';
    if (swap.valueUSD && swap.valueUSD > 0) {
      const tokenAmountNum = parseFloat(tokenAmount.replace(/[KM]/g, ''));
      if (tokenAmountNum > 0) {
        const price = swap.valueUSD / tokenAmountNum;
        pricePerToken = `$${this.formatNumber(price)}/${tokenOut}`;
      }
    }

    const timeStr = new Date(swap.timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Get tier indicator
    const tierIcon = this.getTierIndicator(tier);

    // Wallet stats
    const swapCount = walletData?.totalSwaps || 1;
    const avgBuy = walletData?.avgBuySize 
      ? `$${this.formatNumber(walletData.avgBuySize)}` 
      : '—';

    let message: string;

    if (this.theme === 'compact') {
      message = this.renderCompact(
        direction, directionIcon, tokenOut, tokenAmount, ethAmount, tokenIn,
        valueUSD, pricePerToken, swap.actualTrader, tier, tierIcon,
        timeStr, swap.blockNumber
      );
    } else if (this.theme === 'rich') {
      message = this.renderRich(
        direction, directionIcon, tokenOut, tokenAmount, ethAmount, tokenIn,
        valueUSD, pricePerToken, swap.actualTrader, tier, tierIcon, confidence,
        swapCount, avgBuy, timeStr, swap.blockNumber
      );
    } else {
      // Minimal theme (default)
      message = 
`${direction} ${directionIcon} ${tokenOut}
${this.divider}

${tokenAmount} ${tokenOut}  ≈  ${ethAmount} ${tokenIn}
Est. Value:  ${valueUSD}  ${pricePerToken ? `(${pricePerToken})` : ''}

Trader: <code>${swap.actualTrader.slice(0, 8)}...${swap.actualTrader.slice(-6)}</code>
Tier: ${tier} ${tierIcon} Confidence: ${confidence}

${this.divider}
Pool: Uniswap V4 Mainnet
Time: ${timeStr} ▪ Block: ${swap.blockNumber}
${this.divider}`;
    }

    const keyboard = this.createTradeKeyboard(swap);

    return { text: message, keyboard };
  }

  /**
   * Compact theme - single line format
   */
  private renderCompact(
    direction: string, directionIcon: string, tokenOut: string,
    tokenAmount: string, ethAmount: string, tokenIn: string,
    valueUSD: string, pricePerToken: string, trader: string,
    tier: string, tierIcon: string, timeStr: string, block: number
  ): string {
    return (
`${direction} ${directionIcon} ${tokenAmount} ${tokenOut} ≈ ${ethAmount} ${tokenIn}
${this.compactDivider}
${valueUSD} ${pricePerToken ? `▪ ${pricePerToken}` : ''}
<code>${trader.slice(0, 8)}...${trader.slice(-6)}</code> ${tierIcon}
${timeStr} ▪ #${block}`
    );
  }

  /**
   * Rich theme - detailed with trend indicators
   */
  private renderRich(
    direction: string, directionIcon: string, tokenOut: string,
    tokenAmount: string, ethAmount: string, tokenIn: string,
    valueUSD: string, pricePerToken: string, trader: string,
    tier: string, tierIcon: string, confidence: string,
    swapCount: number, avgBuy: string, timeStr: string, block: number
  ): string {
    return (
`${direction} ${directionIcon} ${tokenOut}
${this.divider}

<b>${tokenAmount} ${tokenOut}</b>  ≈  ${ethAmount} ${tokenIn}
Est. Value:  <b>${valueUSD}</b>  ${pricePerToken ? `(${pricePerToken})` : ''}

Trader: <code>${trader.slice(0, 8)}...${trader.slice(-6)}</code>
Tier: ${tier} ${tierIcon} Win Rate: ${confidence}
History: ${swapCount} swaps ▪ Avg: ${avgBuy}

${this.divider}
Pool: Uniswap V4 Mainnet
Time: ${timeStr} ▪ Block: ${block}
${this.divider}`
    );
  }

  /**
   * Get tier indicator symbol
   */
  private getTierIndicator(tier: string): string {
    const indicators: Record<string, string> = {
      'Mega Whale': '🐋',
      'Whale': '🐳',
      'Smart Money': '⚡',
      'Big Fish': '🦈',
      'Active Trader': '💼',
      'Regular Trader': '▪',
      'Small Trader': '▪',
      'Trader': '▪'
    };
    return indicators[tier] || '▪';
  }

  /**
   * Create inline keyboard for trade actions
   */
  private createTradeKeyboard(swap: ProcessedSwap) {
    const tokenAddress = swap.token1Info?.address || '';
    const poolId = swap.poolId || '';
    const walletAddr = swap.actualTrader;
    const token0Addr = swap.token0Info?.address || 'ETH';
    const token1Addr = swap.token1Info?.address || '';

    return Markup.inlineKeyboard([
      [
        Markup.button.url('Chart', `https://www.dextools.io/app/en/ether/pair-explorer/${tokenAddress}`),
        Markup.button.url('Token', `https://etherscan.io/token/${tokenAddress}`),
        Markup.button.url('Pool', `https://www.geckoterminal.com/eth/pools/${poolId}`),
      ],
      [
        Markup.button.url('TX', `https://etherscan.io/tx/${swap.txHash}`),
        Markup.button.url('Wallet', `https://etherscan.io/address/${walletAddr}`),
        Markup.button.url('DeBank', `https://debank.com/profile/${walletAddr}`),
      ],
      [
        Markup.button.url(
          'Trade on Uniswap',
          `https://app.uniswap.org/#/swap?chain=mainnet&inputCurrency=${token0Addr}&outputCurrency=${token1Addr}`
        ),
      ],
      [
        Markup.button.callback('⭐ Track', `track_${walletAddr}`),
        Markup.button.callback('🔇 Mute', `mute_${walletAddr}`),
      ],
    ]);
  }

  /**
   * Render wallet summary card
   */
  async renderWalletSummary(address: string): Promise<{ text: string; keyboard: any }> {
    const wallet = await this.db.getWallet(address.toLowerCase());
    
    if (!wallet) {
      return {
        text: `Wallet <code>${address}</code> not found in database.`,
        keyboard: Markup.inlineKeyboard([])
      };
    }

    const tier = wallet.classification || 'Trader';
    const tierIcon = this.getTierIndicator(tier);
    const calculatedWinRate = wallet.totalSwaps > 0
      ? wallet.profitableTokens / wallet.totalSwaps
      : 0;
    const winRate = calculatedWinRate > 0 ? `${(calculatedWinRate * 100).toFixed(0)}%` : '—';
    const totalVol = `$${this.formatNumber(wallet.totalVolumeUSD)}`;
    const avgBuy = wallet.avgBuySize ? `$${this.formatNumber(wallet.avgBuySize)}` : '—';
    const largestBuy = wallet.largestBuy ? `$${this.formatNumber(wallet.largestBuy)}` : '—';

    const message = 
`<b>WALLET ANALYTICS</b>
${this.divider}

<code>${address.slice(0, 8)}...${address.slice(-6)}</code>

Classification: ${tier} ${tierIcon}
Win Rate: ${winRate} (${wallet.profitableTokens}/${wallet.totalSwaps} swaps)

${this.divider}
<b>Trading Stats</b>

Total Volume: ${totalVol}
Buys: ${wallet.buyCount} ▪ Sells: ${wallet.sellCount}
Avg Buy: ${avgBuy}
Largest Buy: ${largestBuy}

${this.divider}
First Seen: ${new Date(wallet.firstSeen).toLocaleDateString()}
Last Active: ${new Date(wallet.lastSeen).toLocaleTimeString()}
${this.divider}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.url('Etherscan', `https://etherscan.io/address/${address}`),
        Markup.button.url('DeBank', `https://debank.com/profile/${address}`),
      ],
      [
        Markup.button.callback('↻ Refresh', `refresh_${address}`),
      ]
    ]);

    return { text: message, keyboard };
  }

  /**
   * Render statistics dashboard
   */
  async renderStatsDashboard(): Promise<string> {
    const settings = await this.db.getAlertSettings();
    const trackedCount = (await this.db.getTrackedWallets()).length;
    const topWallets = await this.db.getTopWallets(5);

    const topTraders = topWallets
      .map((w: any, i: any) => `${i + 1}. <code>${w.address.slice(0, 8)}...</code> $${this.formatNumber(w.totalVolumeUSD)}`)
      .join('\n');

    return (
`<b>📊 BOT STATISTICS</b>
${this.divider}

<b>Configuration</b>
Min Threshold: $${settings.minThreshold}
Tracked Wallets: ${trackedCount}
Smart Money: ${settings.enableSmartMoneyAlerts ? '✓' : '✗'}
Whale Alerts: ${settings.enableWhaleAlerts ? '✓' : '✗'}

${this.divider}
<b>Top Traders (Volume)</b>

${topTraders || 'No data yet'}

${this.divider}
Status: <b>🟢 ACTIVE</b>
Network: Ethereum Mainnet
${this.divider}`
    );
  }

  /**
   * Render settings card
   */
  async renderSettings(): Promise<{ text: string; keyboard: any }> {
    const settings = await this.db.getAlertSettings();

    const message = 
`<b>⚙️ ALERT SETTINGS</b>
${this.divider}

<b>Thresholds</b>
Min: $${settings.minThreshold}
Max: $${settings.maxThreshold || '∞'}

<b>Filters</b>
Small Trades: ${settings.showSmallTrades ? '✓ Enabled' : '✗ Disabled'}
New Tokens: ${settings.onlyNewTokens ? '✓ Only New' : '✗ All Tokens'}

<b>Priority Alerts</b>
Whale Alerts ($100K+): ${settings.enableWhaleAlerts ? '✓ ON' : '✗ OFF'}
Smart Money: ${settings.enableSmartMoneyAlerts ? '✓ ON' : '✗ OFF'}

${this.divider}
Use /threshold to update
${this.divider}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          settings.showSmallTrades ? '✗ Hide Small' : '✓ Show Small',
          'toggle_small'
        ),
        Markup.button.callback(
          settings.enableWhaleAlerts ? '✗ Whale OFF' : '✓ Whale ON',
          'toggle_whale'
        ),
      ],
      [
        Markup.button.callback(
          settings.enableSmartMoneyAlerts ? '✗ Smart OFF' : '✓ Smart ON',
          'toggle_smart'
        ),
      ],
    ]);

    return { text: message, keyboard };
  }

  /**
   * Change theme
   */
  setTheme(theme: Theme) {
    this.theme = theme;
  }
}

