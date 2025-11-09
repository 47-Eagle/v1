import { PrismaClient, Prisma } from '@prisma/client';
import { ProcessedSwap } from './poolMonitor';

// ============================================================================
// DATABASE SERVICE - Persistent storage for wallet intelligence
// ============================================================================

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Initialize default alert settings if not exists
      const settings = await this.prisma.alertSettings.findFirst();
      if (!settings) {
        await this.prisma.alertSettings.create({
          data: {
            minThreshold: 1,
            showSmallTrades: true,
            enableSmartMoneyAlerts: true,
            enableWhaleAlerts: true,
          },
        });
        console.log('✅ Default alert settings created');
      }
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    console.log('✅ Database disconnected');
  }

  // ============================================================================
  // WALLET OPERATIONS
  // ============================================================================

  async upsertWallet(
    address: string,
    data: {
      isTracked?: boolean;
      isMuted?: boolean;
      label?: string;
      firstSeen?: Date;
      lastSeen?: Date;
    }
  ) {
    const now = new Date();
    
    return await this.prisma.wallet.upsert({
      where: { address: address.toLowerCase() },
      create: {
        address: address.toLowerCase(),
        firstSeen: data.firstSeen || now,
        lastSeen: data.lastSeen || now,
        isTracked: data.isTracked || false,
        isMuted: data.isMuted || false,
        label: data.label,
      },
      update: {
        ...data,
        updatedAt: now,
      },
    });
  }

  async getWallet(address: string) {
    return await this.prisma.wallet.findUnique({
      where: { address: address.toLowerCase() },
      include: {
        swaps: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        labels: true,
        performance: {
          take: 1,
          orderBy: { periodEnd: 'desc' },
        },
      },
    });
  }

  async updateWalletStats(address: string, swap: ProcessedSwap) {
    const wallet = await this.getWallet(address);
    const isBuy = swap.amount1 > 0n;
    const swapValue = swap.valueUSD || 0;
    
    const newBuyCount = (wallet?.buyCount || 0) + (isBuy ? 1 : 0);
    const newTotalSwaps = (wallet?.totalSwaps || 0) + 1;
    const newTotalVolume = (wallet?.totalVolumeUSD || 0) + swapValue;
    
    // Calculate new average buy size
    let newAvgBuySize = wallet?.avgBuySize || 0;
    if (isBuy && newBuyCount > 0) {
      newAvgBuySize = ((wallet?.avgBuySize || 0) * ((wallet?.buyCount || 0)) + swapValue) / newBuyCount;
    }
    
    const classification = this.classifyWallet({
      totalVolumeUSD: newTotalVolume,
      avgBuySize: newAvgBuySize,
      buyCount: newBuyCount,
    });
    
    return await this.prisma.wallet.upsert({
      where: { address: address.toLowerCase() },
      create: {
        address: address.toLowerCase(),
        firstSeen: new Date(swap.timestamp * 1000),
        lastSeen: new Date(swap.timestamp * 1000),
        totalSwaps: 1,
        totalVolumeUSD: swapValue,
        buyCount: isBuy ? 1 : 0,
        sellCount: isBuy ? 0 : 1,
        avgBuySize: isBuy ? swapValue : 0,
        largestBuy: isBuy ? swapValue : 0,
        classification: classification.label,
      },
      update: {
        lastSeen: new Date(swap.timestamp * 1000),
        totalSwaps: newTotalSwaps,
        totalVolumeUSD: newTotalVolume,
        buyCount: wallet ? wallet.buyCount + (isBuy ? 1 : 0) : (isBuy ? 1 : 0),
        sellCount: wallet ? wallet.sellCount + (isBuy ? 0 : 1) : (isBuy ? 0 : 1),
        avgBuySize: newAvgBuySize,
        largestBuy: Math.max(wallet?.largestBuy || 0, isBuy ? swapValue : 0),
        classification: classification.label,
      },
    });
  }

  async trackWallet(address: string, label?: string) {
    return await this.upsertWallet(address, {
      isTracked: true,
      label,
    });
  }

  async untrackWallet(address: string) {
    return await this.prisma.wallet.update({
      where: { address: address.toLowerCase() },
      data: { isTracked: false },
    });
  }

  async muteWallet(address: string) {
    return await this.upsertWallet(address, { isMuted: true });
  }

  async unmuteWallet(address: string) {
    return await this.prisma.wallet.update({
      where: { address: address.toLowerCase() },
      data: { isMuted: false },
    });
  }

  async getTrackedWallets() {
    return await this.prisma.wallet.findMany({
      where: { isTracked: true },
      orderBy: { totalVolumeUSD: 'desc' },
    });
  }

  async getMutedWallets() {
    return await this.prisma.wallet.findMany({
      where: { isMuted: true },
    });
  }

  async getTopWallets(limit: number = 10) {
    return await this.prisma.wallet.findMany({
      take: limit,
      orderBy: { totalVolumeUSD: 'desc' },
      where: {
        totalSwaps: { gt: 0 },
      },
    });
  }

  // ============================================================================
  // TOKEN OPERATIONS
  // ============================================================================

  async upsertToken(data: {
    address: string;
    symbol: string;
    name?: string;
    decimals: number | bigint;
    priceUSD?: number;
    liquidityUSD?: number;
  }) {
    // Ensure decimals is a regular number (Prisma expects Int, not BigInt)
    const decimalsNum = typeof data.decimals === 'bigint' ? Number(data.decimals) : data.decimals;
    
    return await this.prisma.token.upsert({
      where: { address: data.address.toLowerCase() },
      create: {
        address: data.address.toLowerCase(),
        symbol: data.symbol,
        name: data.name,
        decimals: decimalsNum,
        priceUSD: data.priceUSD || 0,
        liquidityUSD: data.liquidityUSD || 0,
        lastSeen: new Date(),
      },
      update: {
        symbol: data.symbol,
        name: data.name,
        priceUSD: data.priceUSD,
        liquidityUSD: data.liquidityUSD,
        lastSeen: new Date(),
      },
    });
  }

  async getToken(address: string) {
    return await this.prisma.token.findUnique({
      where: { address: address.toLowerCase() },
      include: {
        swaps: {
          take: 20,
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }

  // ============================================================================
  // SWAP OPERATIONS
  // ============================================================================

  async saveSwap(swap: ProcessedSwap) {
    try {
      // Validate txHash exists
      if (!swap.txHash || swap.txHash === 'unknown') {
        console.error('❌ Cannot save swap: missing or invalid txHash');
        return null;
      }
      
      // Check if swap already exists (prevent duplicates)
      const existingSwap = await this.prisma.swap.findUnique({
        where: { txHash: swap.txHash },
      });

      if (existingSwap) {
        console.log(`⏭️  Swap already saved: ${swap.txHash}`);
        return null; // Already processed, don't send duplicate notification
      }

      // Ensure wallet exists
      const wallet = await this.upsertWallet(swap.actualTrader, {
        firstSeen: new Date(swap.timestamp * 1000),
        lastSeen: new Date(swap.timestamp * 1000),
      });

      // Ensure token exists
      const token = await this.upsertToken({
        address: swap.token1Info?.address || '',
        symbol: swap.token1Info?.symbol || 'UNKNOWN',
        name: swap.token1Info?.name,
        decimals: swap.token1Info?.decimals || 18,
      });

      const tier = this.getTier(swap.valueUSD);

      // Save swap
      return await this.prisma.swap.create({
        data: {
          txHash: swap.txHash,
          blockNumber: swap.blockNumber,
          poolId: swap.poolId,
          walletId: wallet.id,
          actualTrader: swap.actualTrader.toLowerCase(),
          tokenId: token.id,
          amount0: swap.amount0.toString(),
          amount1: swap.amount1.toString(),
          valueUSD: swap.valueUSD,
          isBuy: swap.amount1 > 0n,
          tier: tier.name,
          timestamp: new Date(swap.timestamp * 1000),
          notificationSent: true,
        },
      });
    } catch (error: any) {
      // Ignore duplicate key errors (swap already saved)
      if (error.code === 'P2002') {
        console.log(`⏭️  Duplicate swap detected: ${swap.txHash}`);
        return null;
      }
      console.error('Error saving swap to database:', error);
      return null;
    }
  }

  async getSwapHistory(options: {
    walletAddress?: string;
    tokenAddress?: string;
    limit?: number;
    minValueUSD?: number;
  }) {
    const where: any = {};
    
    if (options.walletAddress) {
      where.actualTrader = options.walletAddress.toLowerCase();
    }
    
    if (options.minValueUSD) {
      where.valueUSD = { gte: options.minValueUSD };
    }

    return await this.prisma.swap.findMany({
      where,
      take: options.limit || 50,
      orderBy: { timestamp: 'desc' },
      include: {
        wallet: true,
        token: true,
      },
    });
  }

  // ============================================================================
  // SETTINGS OPERATIONS
  // ============================================================================

  async getAlertSettings() {
    let settings = await this.prisma.alertSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.alertSettings.create({
        data: {
          minThreshold: 100,
          showSmallTrades: true,
          enableSmartMoneyAlerts: true,
          enableWhaleAlerts: true,
        },
      });
    }
    return settings;
  }

  async updateAlertSettings(data: Partial<{
    minThreshold: number;
    maxThreshold: number | null;
    minLiquidity: number | null;
    onlyNewTokens: boolean;
    showSmallTrades: boolean;
    enableSmartMoneyAlerts: boolean;
    enableWhaleAlerts: boolean;
  }>) {
    const settings = await this.getAlertSettings();
    return await this.prisma.alertSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  async getDailyStats(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const swaps = await this.prisma.swap.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        wallet: true,
      },
    });

    const uniqueWallets = new Set(swaps.map((s: any) => s.actualTrader)).size;
    const uniqueTokens = new Set(swaps.map((s: any) => s.tokenId)).size;
    const totalVolume = swaps.reduce((sum: any, s: any) => sum + (s.valueUSD || 0), 0);
    const avgTradeSize = swaps.length > 0 ? totalVolume / swaps.length : 0;
    
    const tradeSizes = swaps.map((s: any) => s.valueUSD || 0).sort((a: any, b: any) => a - b);
    const medianTradeSize = tradeSizes.length > 0 
      ? tradeSizes[Math.floor(tradeSizes.length / 2)] 
      : 0;
    
    const largestTrade = Math.max(...tradeSizes, 0);
    const smartMoneyTrades = swaps.filter((s: any) => 
      s.wallet?.classification?.includes('Smart Money') || 
      s.wallet?.classification?.includes('Whale')
    ).length;

    return {
      totalSwaps: swaps.length,
      totalVolumeUSD: totalVolume,
      uniqueWallets,
      uniqueTokens,
      avgTradeSize,
      medianTradeSize,
      largestTrade,
      smartMoneyTrades,
    };
  }

  async saveDailyAnalytics(date: Date) {
    const stats = await this.getDailyStats(date);
    
    return await this.prisma.dailyAnalytics.upsert({
      where: { date },
      create: {
        date,
        ...stats,
      },
      update: stats,
    });
  }

  async getAnalyticsSummary(days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.prisma.dailyAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // ============================================================================
  // NOTIFICATION HISTORY
  // ============================================================================

  async saveNotification(data: {
    walletAddress: string;
    tokenAddress: string;
    swapValue: number;
    messageType: string;
    priority: string;
  }) {
    return await this.prisma.notificationHistory.create({
      data: {
        walletAddress: data.walletAddress.toLowerCase(),
        tokenAddress: data.tokenAddress.toLowerCase(),
        swapValue: data.swapValue,
        messageType: data.messageType,
        priority: data.priority,
      },
    });
  }

  async getNotificationStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const notifications = await this.prisma.notificationHistory.findMany({
      where: {
        sentAt: { gte: startDate },
      },
    });

    return {
      total: notifications.length,
      byPriority: {
        high: notifications.filter((n: any) => n.priority === 'high').length,
        normal: notifications.filter((n: any) => n.priority === 'normal').length,
        low: notifications.filter((n: any) => n.priority === 'low').length,
      },
      byType: notifications.reduce((acc: any, n: any) => {
        acc[n.messageType] = (acc[n.messageType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private classifyWallet(stats: {
    totalVolumeUSD: number;
    avgBuySize: number;
    buyCount: number;
  }): { label: string; emoji: string } {
    const { totalVolumeUSD, avgBuySize, buyCount } = stats;
    
    if (totalVolumeUSD > 500000) {
      return { label: 'Mega Whale', emoji: '🐋' };
    } else if (totalVolumeUSD > 100000) {
      return { label: 'Whale', emoji: '🐳' };
    } else if (avgBuySize > 50000 && buyCount > 5) {
      return { label: 'Smart Money', emoji: '🧠' };
    } else if (totalVolumeUSD > 50000) {
      return { label: 'Big Fish', emoji: '🦈' };
    } else if (avgBuySize > 10000) {
      return { label: 'Active Trader', emoji: '💼' };
    } else if (totalVolumeUSD > 10000) {
      return { label: 'Regular Trader', emoji: '🐟' };
    } else {
      return { label: 'Small Trader', emoji: '🦐' };
    }
  }

  private getTier(valueUSD: number | null): { name: string; emoji: string } {
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

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  async cleanOldData(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean old notifications
    await this.prisma.notificationHistory.deleteMany({
      where: {
        sentAt: { lt: cutoffDate },
      },
    });

    // Clean old token price history
    await this.prisma.tokenPriceHistory.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    console.log(`✅ Cleaned data older than ${daysToKeep} days`);
  }
}

