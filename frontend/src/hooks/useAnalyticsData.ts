import { useState, useEffect, useCallback } from 'react';
import { CONTRACTS } from '../config/contracts';

// Token prices - in production, fetch these from CoinGecko or Chainlink
interface TokenPrices {
  WLFI: number;
  USD1: number;
  WETH: number;
}

interface VaultMetrics {
  tvlUsd: string;
  token0Amount: string;
  token1Amount: string;
  token0Symbol: string;
  token1Symbol: string;
  totalShares: string;
  sharePrice: string;
  snapshotCount: number;
  weeklyApy: string | null;
  monthlyApy: string | null;
  inceptionApy: string | null;
}

interface HistoricalSnapshot {
  timestamp: number;
  date: string;
  tvlUsd: number;
  sharePrice: number;
}

interface VaultData {
  address: string;
  name: string;
  symbol: string;
  metrics: VaultMetrics | null;
  historicalSnapshots: HistoricalSnapshot[];
}

interface AnalyticsData {
  vaults: {
    USD1_WLFI: VaultData;
    WETH_WLFI: VaultData;
  };
  prices: TokenPrices;
  meta: {
    totalSnapshots: number;
    generatedAt: string;
    priceSource: string;
  };
}

interface UseAnalyticsDataResult {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Fetch token prices from CoinGecko
async function fetchTokenPrices(): Promise<TokenPrices> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=world-liberty-financial,ethereum,usd1&vs_currencies=usd'
    );
    const data = await response.json();
    
    return {
      WLFI: data['world-liberty-financial']?.usd || 0.16,
      USD1: data['usd1']?.usd || 1.0,
      WETH: data['ethereum']?.usd || 3000,
    };
  } catch (error) {
    console.warn('[fetchTokenPrices] Failed to fetch prices, using defaults');
    return { WLFI: 0.16, USD1: 1.0, WETH: 3000 };
  }
}

// Fetch vault data from Charm Finance GraphQL
async function fetchVaultData(vaultAddress: string) {
  const query = `
    query GetVault($address: ID!) {
      vault(id: $address) {
        id
        name
        symbol
        totalSupply
        total0
        total1
        snapshot(orderBy: timestamp, orderDirection: asc, first: 1000) {
          timestamp
          totalAmount0
          totalAmount1
          totalSupply
        }
      }
    }
  `;

  const response = await fetch('https://stitching-v2.herokuapp.com/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { address: vaultAddress.toLowerCase() } })
  });

  const result = await response.json();
  return result.data?.vault || null;
}

// Format USD value
function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

// Format token amount
function formatTokenAmount(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Calculate APY from share price growth
function calculateApy(
  startPrice: number,
  endPrice: number,
  startTime: number,
  endTime: number
): number | null {
  if (startPrice <= 0 || endPrice <= 0) return null;
  
  const timeDiffSeconds = endTime - startTime;
  if (timeDiffSeconds < 3600) return null; // Need at least 1 hour
  
  const growth = (endPrice - startPrice) / startPrice;
  const secondsPerYear = 365 * 24 * 60 * 60;
  
  // Compound annualization
  const annualizedGrowth = Math.pow(1 + growth, secondsPerYear / timeDiffSeconds) - 1;
  const apy = annualizedGrowth * 100;
  
  // Sanity check
  if (apy < -99 || apy > 10000) return null;
  
  return apy;
}

// Process vault snapshots into metrics
function processVaultData(
  vault: any,
  prices: TokenPrices,
  isWethVault: boolean
): { metrics: VaultMetrics | null; historicalSnapshots: HistoricalSnapshot[] } {
  if (!vault || !vault.snapshot || vault.snapshot.length === 0) {
    return { metrics: null, historicalSnapshots: [] };
  }

  const snapshots = vault.snapshot;
  const token0Price = isWethVault ? prices.WETH : prices.USD1;
  const token1Price = prices.WLFI;
  const token0Symbol = isWethVault ? 'WETH' : 'USD1';
  const token1Symbol = 'WLFI';

  // Calculate share price (TVL / totalSupply) for each snapshot
  const processedSnapshots = snapshots.map((s: any) => {
    const amount0 = parseFloat(s.totalAmount0) / 1e18;
    const amount1 = parseFloat(s.totalAmount1) / 1e18;
    const supply = parseFloat(s.totalSupply) / 1e18;
    
    const tvlUsd = (amount0 * token0Price) + (amount1 * token1Price);
    const sharePrice = supply > 0 ? tvlUsd / supply : 0;
    
    return {
      timestamp: parseInt(s.timestamp),
      date: formatDate(parseInt(s.timestamp)),
      tvlUsd,
      sharePrice,
      amount0,
      amount1,
      supply,
    };
  });

  // Get latest and historical snapshots for APY calculation
  const latest = processedSnapshots[processedSnapshots.length - 1];
  const now = Date.now() / 1000;
  
  // Find snapshots closest to 1 week and 1 month ago
  const oneWeekAgo = now - (7 * 24 * 60 * 60);
  const oneMonthAgo = now - (30 * 24 * 60 * 60);
  const inception = processedSnapshots[0];
  
  const findClosest = (targetTime: number) => {
    return processedSnapshots.reduce((closest: any, snap: any) => {
      if (!closest) return snap;
      return Math.abs(snap.timestamp - targetTime) < Math.abs(closest.timestamp - targetTime) ? snap : closest;
    }, null);
  };

  const weekAgoSnap = findClosest(oneWeekAgo);
  const monthAgoSnap = findClosest(oneMonthAgo);

  // Calculate APYs
  const weeklyApy = weekAgoSnap && weekAgoSnap.timestamp < oneWeekAgo + 86400
    ? calculateApy(weekAgoSnap.sharePrice, latest.sharePrice, weekAgoSnap.timestamp, latest.timestamp)
    : null;
    
  const monthlyApy = monthAgoSnap && monthAgoSnap.timestamp < oneMonthAgo + 86400
    ? calculateApy(monthAgoSnap.sharePrice, latest.sharePrice, monthAgoSnap.timestamp, latest.timestamp)
    : null;
    
  const inceptionApy = calculateApy(inception.sharePrice, latest.sharePrice, inception.timestamp, latest.timestamp);

  const metrics: VaultMetrics = {
    tvlUsd: formatUsd(latest.tvlUsd),
    token0Amount: formatTokenAmount(latest.amount0),
    token1Amount: formatTokenAmount(latest.amount1),
    token0Symbol,
    token1Symbol,
    totalShares: formatTokenAmount(latest.supply),
    sharePrice: `$${latest.sharePrice.toFixed(4)}`,
    snapshotCount: snapshots.length,
    weeklyApy: weeklyApy !== null ? `${weeklyApy.toFixed(2)}%` : null,
    monthlyApy: monthlyApy !== null ? `${monthlyApy.toFixed(2)}%` : null,
    inceptionApy: inceptionApy !== null ? `${inceptionApy.toFixed(2)}%` : null,
  };

  const historicalSnapshots: HistoricalSnapshot[] = processedSnapshots.map((s: any) => ({
    timestamp: s.timestamp,
    date: s.date,
    tvlUsd: s.tvlUsd,
    sharePrice: s.sharePrice,
  }));

  return { metrics, historicalSnapshots };
}

export function useAnalyticsData(days: number = 90): UseAnalyticsDataResult {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch prices and vault data in parallel
      const [prices, usd1Vault, wethVault] = await Promise.all([
        fetchTokenPrices(),
        fetchVaultData(CONTRACTS.CHARM_VAULT),
        fetchVaultData('0x3314e248f3f752cd16939773d83beb3a362f0aef'),
      ]);

      const usd1Data = processVaultData(usd1Vault, prices, false);
      const wethData = processVaultData(wethVault, prices, true);

      const analyticsData: AnalyticsData = {
        vaults: {
          USD1_WLFI: {
            address: CONTRACTS.CHARM_VAULT,
            name: usd1Vault?.name || 'USD1/WLFI Vault',
            symbol: usd1Vault?.symbol || 'cvEAGLE',
            metrics: usd1Data.metrics,
            historicalSnapshots: usd1Data.historicalSnapshots,
          },
          WETH_WLFI: {
            address: '0x3314e248f3f752cd16939773d83beb3a362f0aef',
            name: wethVault?.name || 'WETH/WLFI Vault',
            symbol: wethVault?.symbol || 'cEAGLE',
            metrics: wethData.metrics,
            historicalSnapshots: wethData.historicalSnapshots,
          },
        },
        prices,
        meta: {
          totalSnapshots: (usd1Data.historicalSnapshots.length || 0) + (wethData.historicalSnapshots.length || 0),
          generatedAt: new Date().toISOString(),
          priceSource: 'CoinGecko',
        },
      };

      setData(analyticsData);
    } catch (err: any) {
      console.error('[useAnalyticsData] Error:', err);
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Hook for combined APY across both vaults
export function useCombinedMetrics() {
  const { data, loading, error } = useAnalyticsData();

  if (!data) return { loading, error, combinedTvl: null, combinedApy: null };

  const usd1Tvl = data.vaults.USD1_WLFI.historicalSnapshots.slice(-1)[0]?.tvlUsd || 0;
  const wethTvl = data.vaults.WETH_WLFI.historicalSnapshots.slice(-1)[0]?.tvlUsd || 0;
  const combinedTvl = usd1Tvl + wethTvl;

  // Weight APY by TVL
  const usd1Apy = data.vaults.USD1_WLFI.metrics?.weeklyApy;
  const wethApy = data.vaults.WETH_WLFI.metrics?.weeklyApy;

  let combinedApy: string | null = null;
  if (usd1Apy && wethApy && combinedTvl > 0) {
    const usd1ApyNum = parseFloat(usd1Apy);
    const wethApyNum = parseFloat(wethApy);
    const weightedApy = (usd1ApyNum * usd1Tvl + wethApyNum * wethTvl) / combinedTvl;
    combinedApy = `${weightedApy.toFixed(2)}%`;
  }

  return {
    loading,
    error,
    combinedTvl: formatUsd(combinedTvl),
    combinedApy,
    prices: data.prices,
  };
}

function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}
