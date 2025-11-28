import { useState, useEffect, useCallback } from 'react';
import { CONTRACTS } from '../config/contracts';

interface VaultMetrics {
  currentFeeApr: string | null;
  weeklyApy: string | null;
  monthlyApy: string | null;
  inceptionApy: string | null;
  weeklyFeeApr: string | null;
  snapshotCount: number;
  tvl: string | null;
}

interface HistoricalSnapshot {
  timestamp: number;
  feeApr: string | null;
  annualVsHold: string | null;
  tvl?: string;
  valuePerShare?: number;
}

interface VaultData {
  address: string;
  metrics: VaultMetrics | null;
  historicalSnapshots: HistoricalSnapshot[];
}

interface AnalyticsData {
  vaults: {
    USD1_WLFI: VaultData;
    WETH_WLFI: VaultData;
  };
  syncStatus: Record<string, {
    lastSyncAt: string | null;
    syncErrors: number;
    lastError: string | null;
  }>;
  meta: {
    daysRequested: number;
    totalSnapshots: number;
    generatedAt: string;
  };
}

interface UseAnalyticsDataResult {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  source: 'cache' | 'graphql' | null;
}

// Fallback: Direct GraphQL fetch from Charm Finance
async function fetchFromGraphQLDirect(vaultAddress: string) {
  const query = `
    query GetVault($address: ID!) {
      vault(id: $address) {
        totalSupply
        snapshot(orderBy: timestamp, orderDirection: asc, first: 1000) {
          timestamp
          feeApr
          annualVsHoldPerfSince
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
  return result.data?.vault?.snapshot || [];
}

// Calculate value per share - normalize to avoid precision issues
function calculateValuePerShare(snapshot: any): number {
  const totalSupply = parseFloat(snapshot.totalSupply || '0');
  if (totalSupply === 0) return 0;
  
  // Both amounts are in wei (18 decimals)
  const amount0 = parseFloat(snapshot.totalAmount0 || '0');
  const amount1 = parseFloat(snapshot.totalAmount1 || '0');
  
  // Value per share = total value / total supply
  // Since all are in same decimals, this gives us a normalized ratio
  return (amount0 + amount1) / totalSupply;
}

// Format large numbers for display
function formatTVL(amount0: string, amount1: string): string {
  const a0 = parseFloat(amount0) / 1e18;
  const a1 = parseFloat(amount1) / 1e18;
  const total = a0 + a1;
  
  if (total >= 1e9) return `${(total / 1e9).toFixed(2)}B`;
  if (total >= 1e6) return `${(total / 1e6).toFixed(2)}M`;
  if (total >= 1e3) return `${(total / 1e3).toFixed(2)}K`;
  return total.toFixed(2);
}

function calculateMetricsFromSnapshots(snapshots: any[]): VaultMetrics | null {
  if (!snapshots || snapshots.length < 2) {
    return {
      currentFeeApr: null,
      weeklyApy: null,
      monthlyApy: null,
      inceptionApy: null,
      weeklyFeeApr: null,
      snapshotCount: snapshots?.length || 0,
      tvl: null,
    };
  }

  const now = Date.now() / 1000;
  const oneWeekAgo = now - (7 * 24 * 60 * 60);
  const oneMonthAgo = now - (30 * 24 * 60 * 60);

  // Get the latest snapshot
  const current = snapshots[snapshots.length - 1];
  const currentVPS = calculateValuePerShare(current);
  const currentTime = parseInt(current.timestamp);

  // Find snapshots closest to our target times
  const findClosestSnapshot = (targetTime: number) => {
    let closest = snapshots[0];
    let minDiff = Math.abs(parseInt(snapshots[0].timestamp) - targetTime);
    
    for (const snap of snapshots) {
      const diff = Math.abs(parseInt(snap.timestamp) - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snap;
      }
    }
    return closest;
  };

  // Calculate APY between two snapshots
  const calculateAPY = (startSnap: any, endSnap: any): number | null => {
    const startVPS = calculateValuePerShare(startSnap);
    const endVPS = calculateValuePerShare(endSnap);
    
    if (startVPS === 0 || endVPS === 0) return null;
    
    const startTime = parseInt(startSnap.timestamp);
    const endTime = parseInt(endSnap.timestamp);
    const secondsDiff = endTime - startTime;
    
    // Need at least 1 hour of data
    if (secondsDiff < 3600) return null;
    
    // Calculate growth rate
    const growthRate = (endVPS - startVPS) / startVPS;
    
    // Annualize: (1 + rate) ^ (seconds_per_year / seconds_elapsed) - 1
    const secondsPerYear = 365 * 24 * 60 * 60;
    const annualizedRate = Math.pow(1 + growthRate, secondsPerYear / secondsDiff) - 1;
    
    // Return as percentage, capped at reasonable bounds
    const percentage = annualizedRate * 100;
    
    // Sanity check - APY should be between -100% and +10000%
    if (percentage < -100 || percentage > 10000) {
      console.warn('[calculateAPY] Unreasonable APY calculated:', percentage, { startVPS, endVPS, growthRate });
      return null;
    }
    
    return percentage;
  };

  // Find reference snapshots
  const weekAgoSnap = findClosestSnapshot(oneWeekAgo);
  const monthAgoSnap = findClosestSnapshot(oneMonthAgo);
  const inceptionSnap = snapshots[0];

  // Only calculate if we have meaningful time differences
  const weeklyApy = parseInt(weekAgoSnap.timestamp) < oneWeekAgo + 86400 
    ? calculateAPY(weekAgoSnap, current) 
    : null;
    
  const monthlyApy = parseInt(monthAgoSnap.timestamp) < oneMonthAgo + 86400 
    ? calculateAPY(monthAgoSnap, current) 
    : null;
    
  const inceptionApy = calculateAPY(inceptionSnap, current);

  // Get TVL
  const tvl = formatTVL(current.totalAmount0, current.totalAmount1);

  // Use feeApr from subgraph if available and valid
  const validFeeApr = current?.feeApr && parseFloat(current.feeApr) > 0;
  const currentFeeApr = validFeeApr 
    ? (parseFloat(current.feeApr) * 100).toFixed(2)
    : weeklyApy !== null ? weeklyApy.toFixed(2) : null;

  return {
    currentFeeApr,
    weeklyApy: weeklyApy !== null ? weeklyApy.toFixed(2) : null,
    monthlyApy: monthlyApy !== null ? monthlyApy.toFixed(2) : null,
    inceptionApy: inceptionApy !== null ? inceptionApy.toFixed(2) : null,
    weeklyFeeApr: currentFeeApr,
    snapshotCount: snapshots.length,
    tvl,
  };
}

export function useAnalyticsData(days: number = 30): UseAnalyticsDataResult {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'graphql' | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try cached API first
      const apiUrl = `/api/analytics?days=${days}`;
      
      try {
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data) {
            setData(result.data);
            setSource('cache');
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.log('[useAnalyticsData] Cache API unavailable, falling back to GraphQL');
      }

      // Fallback to direct GraphQL
      console.log('[useAnalyticsData] Fetching from GraphQL directly...');
      
      const [usd1Snapshots, wethSnapshots] = await Promise.all([
        fetchFromGraphQLDirect(CONTRACTS.CHARM_VAULT),
        fetchFromGraphQLDirect('0x3314e248f3f752cd16939773d83beb3a362f0aef'),
      ]);

      // Map snapshots with normalized value per share for charting
      const mapSnapshots = (snapshots: any[]): HistoricalSnapshot[] => {
        if (snapshots.length === 0) return [];
        
        // Use first snapshot's VPS as baseline (= 1.0)
        const baselineVPS = calculateValuePerShare(snapshots[0]);
        
        return snapshots.map((s: any) => {
          const currentVPS = calculateValuePerShare(s);
          // Normalize: growth from baseline as percentage
          const normalizedGrowth = baselineVPS > 0 
            ? ((currentVPS / baselineVPS) - 1) * 100 
            : 0;
          
          return {
            timestamp: parseInt(s.timestamp),
            feeApr: normalizedGrowth.toFixed(2),
            annualVsHold: normalizedGrowth.toFixed(2),
            tvl: formatTVL(s.totalAmount0, s.totalAmount1),
            valuePerShare: currentVPS,
          };
        });
      };

      const analyticsData: AnalyticsData = {
        vaults: {
          USD1_WLFI: {
            address: CONTRACTS.CHARM_VAULT,
            metrics: calculateMetricsFromSnapshots(usd1Snapshots),
            historicalSnapshots: mapSnapshots(usd1Snapshots),
          },
          WETH_WLFI: {
            address: '0x3314e248f3f752cd16939773d83beb3a362f0aef',
            metrics: calculateMetricsFromSnapshots(wethSnapshots),
            historicalSnapshots: mapSnapshots(wethSnapshots),
          },
        },
        syncStatus: {},
        meta: {
          daysRequested: days,
          totalSnapshots: usd1Snapshots.length + wethSnapshots.length,
          generatedAt: new Date().toISOString(),
        },
      };

      setData(analyticsData);
      setSource('graphql');

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
    source,
  };
}

// Combined APY from both vaults (weighted by TVL or simple average)
export function useCombinedApy(): {
  combinedApy: string | null;
  loading: boolean;
} {
  const { data, loading } = useAnalyticsData(7);

  if (loading || !data) {
    return { combinedApy: null, loading };
  }

  const usd1Apy = data.vaults.USD1_WLFI.metrics?.weeklyApy;
  const wethApy = data.vaults.WETH_WLFI.metrics?.weeklyApy;

  if (!usd1Apy && !wethApy) {
    return { combinedApy: null, loading: false };
  }

  // Simple average (could be weighted by TVL)
  const apys = [usd1Apy, wethApy].filter(Boolean).map(Number);
  const avgApy = apys.reduce((a, b) => a + b, 0) / apys.length;

  return {
    combinedApy: avgApy.toFixed(2),
    loading: false,
  };
}
