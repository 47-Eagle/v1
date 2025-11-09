import { ethers } from 'ethers';
import { Markup } from 'telegraf';
import axios from 'axios';
import { ProcessedSwap } from './poolMonitor';
import { DatabaseService } from './databaseService';
import { config } from '../config';

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
  private marketCapCache: Map<string, { marketCap: number; timestamp: number }> = new Map();
  private readonly MARKET_CAP_CACHE_DURATION = 300000; // 5 minutes cache
  private totalSupplyCache: Map<string, { totalSupply: bigint; timestamp: number }> = new Map();
  private readonly TOTAL_SUPPLY_CACHE_DURATION = 3600000; // 1 hour cache

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
   * Format market cap with $ prefix
   */
  formatMarketCap(value: number): string {
    return `$${this.formatNumber(value)}`;
  }

  /**
   * Fetch comprehensive token data from DexScreener API
   */
  async getTokenData(tokenAddress: string): Promise<{
    marketCap: number | null;
    price: number | null;
    priceChange24h: number | null;
    volume24h: number | null;
    liquidity: number | null;
  }> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        { timeout: 5000 } // 5 second timeout
      );

      const pairs = response.data?.pairs;
      if (pairs && pairs.length > 0) {
        // Find the pair with the highest liquidity (most reliable data)
        const bestPair = pairs.reduce((best: any, current: any) => {
          return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
        });

        return {
          marketCap: bestPair.marketCap || null,
          price: bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : null,
          priceChange24h: bestPair.priceChange?.h24 ? parseFloat(bestPair.priceChange.h24) : null,
          volume24h: bestPair.volume?.h24 ? parseFloat(bestPair.volume.h24) : null,
          liquidity: bestPair.liquidity?.usd ? parseFloat(bestPair.liquidity.usd) : null,
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch token data for ${tokenAddress}:`, error instanceof Error ? error.message : String(error));
    }

    // Fallback: return null values if API fails
    return {
      marketCap: null,
      price: null,
      priceChange24h: null,
      volume24h: null,
      liquidity: null,
    };
  }

  /**
   * Get total supply from blockchain
   */
  async getTotalSupply(tokenAddress: string): Promise<bigint | null> {
    // Check cache first
    const cached = this.totalSupplyCache.get(tokenAddress.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.TOTAL_SUPPLY_CACHE_DURATION) {
      return cached.totalSupply;
    }

    try {
      const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function totalSupply() view returns (uint256)'],
        provider
      );

      const totalSupply = await tokenContract.totalSupply();
      const totalSupplyBigInt = BigInt(totalSupply.toString());

      // Cache the result
      this.totalSupplyCache.set(tokenAddress.toLowerCase(), {
        totalSupply: totalSupplyBigInt,
        timestamp: Date.now(),
      });

      return totalSupplyBigInt;
    } catch (error) {
      console.warn(`Failed to fetch total supply for ${tokenAddress}:`, error instanceof Error ? error.message : String(error));
      // Fallback to hardcoded value if blockchain call fails
      return 50000000n * (10n ** 18n); // 50M tokens with 18 decimals
    }
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
      // Minimal theme (default) - EAGLE style
      // Get comprehensive token data from DexScreener
      const tokenData = await this.getTokenData(swap.token1Info?.address || '');
      const marketCap = tokenData.marketCap ? this.formatMarketCap(tokenData.marketCap) : '$0';
      const traderProfileLink = `https://etherscan.io/address/${swap.actualTrader}`;
      const txLink = `https://etherscan.io/tx/${swap.txHash}`;
      const traderLabel = direction === 'BUY' ? 'Buyer' : 'Seller';
      const tokenAddress = swap.token1Info?.address || '';
      
      // Calculate emoji count based on dollar value (1 emoji per $1, no upper limit)
      const usdValue = parseFloat(valueUSD.replace(/[$,]/g, ''));
      const emojiCount = Math.max(1, Math.floor(usdValue));
      const emojiPattern = '💎🦅';
      const repeatedEmojis = emojiPattern.repeat(Math.ceil(emojiCount / 2)).substring(0, emojiCount * 2);

      message =
`EAGLE ${direction}!

${repeatedEmojis}

💵 ${ethAmount} ${tokenIn} (${valueUSD})
🪙 ${tokenAmount} ${tokenOut}
👤 <a href="${traderProfileLink}">${traderLabel}</a> | <a href="${txLink}">Txn</a>
🔼 Market Cap: ${marketCap}

📈 Chart (https://dexscreener.com/ethereum/${tokenAddress}) 🔄 Buy (https://app.uniswap.org/swap?chain=mainnet&inputCurrency=ETH&outputCurrency=${tokenAddress}) 🟦 Trending (https://www.geckoterminal.com/eth/pools/${swap.poolId})
📱 47Eagle (https://47eagle.com)`;
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
   * Create inline keyboard for trade actions - EAGLE style (links now embedded in message)
   */
  private createTradeKeyboard(swap: ProcessedSwap) {
    // Links are now embedded in the message text, so we use an empty keyboard
    return Markup.inlineKeyboard([]);
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

