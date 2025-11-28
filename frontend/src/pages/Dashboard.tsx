import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import AssetAllocationViz from '../components/AssetAllocationViz';

interface VaultStats {
  id: string;
  address: string;
  strategyType: string;
  prices: {
    token0Price: number;
    token1Price: number;
    token0Symbol: string;
    token1Symbol: string;
  } | null;
  stats: {
    total0: string;
    total1: string;
    totalSupply: string;
    fullFees0: string;
    fullFees1: string;
    baseFees0: string;
    baseFees1: string;
    limitFees0: string;
    limitFees1: string;
    calculatedApr: number | null;
    calculatedApy: number | null;
    updatedAt: string;
  } | null;
  snapshots: Array<{
    timestamp: string;
    totalAmount0: string;
    totalAmount1: string;
    totalSupply: string;
    feeApr: string | null;
    annualVsHoldPerfSince: string | null;
  }>;
  recentFees: Array<{
    id?: string;
    timestamp: string;
    feesToVault0: string;
    feesToVault1: string;
    txHash: string;
  }>;
  feeBreakdown?: {
    collected: {
      token0: string;
      token1: string;
    };
    uncollected: {
      token0: string;
      token1: string;
    };
    total: {
      token0: string;
      token1: string;
    };
  };
}

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onNavigateUp?: () => void;
}

export default function Dashboard({ provider, account, onNavigateUp }: Props) {
  const [loading, setLoading] = useState(true);
  const [vaults, setVaults] = useState<VaultStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVaultStats(true);
    const interval = setInterval(() => fetchVaultStats(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVaultStats = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      
      const apiUrl = '/api/vault-stats';
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        setVaults(data.vaults);
      } else {
        setError(data.error || 'Failed to fetch vault stats');
      }
    } catch (err: any) {
      console.error('Error fetching vault stats:', err);
      const errorMessage = err.message || 'Failed to fetch vault stats';
      setError(`${errorMessage}. Make sure the API server is running on port 3001.`);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const calculateTvl = (snapshot: VaultStats['snapshots'][0], vault: VaultStats) => {
    const amount0 = parseFloat(snapshot.totalAmount0 || '0') / 1e18;
    const amount1 = parseFloat(snapshot.totalAmount1 || '0') / 1e18;
    
    if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
      return amount0 * vault.prices.token0Price + amount1 * vault.prices.token1Price;
    }
    
    if (vault.strategyType === 'USD1') {
      return amount0 + amount1 * 0.15;
    } else {
      return amount0 * 3000 + amount1 * 0.15;
    }
  };

  const prepareChartData = (vault: VaultStats) => {
    const snapshotMap = new Map<number, VaultStats['snapshots'][0]>();
    for (const snapshot of vault.snapshots) {
      const timestamp = parseInt(snapshot.timestamp);
      const existing = snapshotMap.get(timestamp);
      if (!existing || timestamp >= parseInt(existing.timestamp)) {
        snapshotMap.set(timestamp, snapshot);
      }
    }
    
    const uniqueSnapshots = Array.from(snapshotMap.values()).sort((a, b) => 
      parseInt(a.timestamp) - parseInt(b.timestamp)
    );
    
    return uniqueSnapshots.map(snapshot => ({
      date: new Date(parseInt(snapshot.timestamp) * 1000).toLocaleDateString(),
      timestamp: parseInt(snapshot.timestamp),
      tvl: calculateTvl(snapshot, vault),
      feeApr: snapshot.feeApr ? parseFloat(snapshot.feeApr) * 100 : null,
      annualVsHoldPerf: snapshot.annualVsHoldPerfSince ? parseFloat(snapshot.annualVsHoldPerfSince) * 100 : null,
    }));
  };

  const prepareFeeChartData = (vault: VaultStats) => {
    if (vault.recentFees.length === 0) return [];

    const feeMap = new Map<string, { fees0: number; fees1: number; timestamp: number; txHash: string }>();
    for (const fee of vault.recentFees) {
      const fees0 = parseFloat(fee.feesToVault0 || '0') / 1e18;
      const fees1 = parseFloat(fee.feesToVault1 || '0') / 1e18;
      const timestamp = parseInt(fee.timestamp || '0');
      const key = fee.id || fee.txHash || `${timestamp}-${fees0}-${fees1}`;
      const existing = feeMap.get(key);
      if (!existing || timestamp > existing.timestamp) {
        feeMap.set(key, { fees0, fees1, timestamp, txHash: fee.txHash || '' });
      }
    }

    const sortedFees = Array.from(feeMap.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((fee, index, arr) => {
        return index === 0 || fee.timestamp !== arr[index - 1].timestamp;
      });
    
    if (sortedFees.length === 0) return [];

    const feeData: Array<{ date: string; timestamp: number; cumulativeFeesUsd: number; feeDeltaUsd: number }> = [];
    const token0Price = vault.prices?.token0Price || (vault.strategyType === 'USD1' ? 1 : 3000);
    const token1Price = vault.prices?.token1Price || 0.15;

    let cumulativeFees0 = 0;
    let cumulativeFees1 = 0;

    for (const fee of sortedFees) {
      cumulativeFees0 += fee.fees0;
      cumulativeFees1 += fee.fees1;

      const cumulativeFeesUsd = Math.max(0, cumulativeFees0 * token0Price + cumulativeFees1 * token1Price);
      const feeDeltaUsd = Math.max(0, fee.fees0 * token0Price + fee.fees1 * token1Price);

      feeData.push({
        date: new Date(fee.timestamp * 1000).toLocaleDateString(),
        timestamp: fee.timestamp,
        cumulativeFeesUsd,
        feeDeltaUsd,
      });
    }

    return feeData;
  };

  const calculateTotalFeesFromEvents = (vault: VaultStats): number => {
    if (vault.recentFees.length === 0) return 0;

    const feeMap = new Map<string, { fees0: number; fees1: number; timestamp: number }>();
    for (const fee of vault.recentFees) {
      const fees0 = parseFloat(fee.feesToVault0 || '0') / 1e18;
      const fees1 = parseFloat(fee.feesToVault1 || '0') / 1e18;
      const timestamp = parseInt(fee.timestamp || '0');
      const key = fee.id || fee.txHash || `${timestamp}-${fees0}-${fees1}`;
      const existing = feeMap.get(key);
      if (!existing || timestamp > existing.timestamp) {
        feeMap.set(key, { fees0, fees1, timestamp });
      }
    }

    const sortedFees = Array.from(feeMap.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((fee, index, arr) => {
        return index === 0 || fee.timestamp !== arr[index - 1].timestamp;
      });

    let fees0 = 0;
    let fees1 = 0;
    for (const fee of sortedFees) {
      fees0 += fee.fees0;
      fees1 += fee.fees1;
    }

    if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
      return Math.max(0, fees0 * vault.prices.token0Price + fees1 * vault.prices.token1Price);
    } else {
      if (vault.strategyType === 'USD1') {
        return Math.max(0, fees0 + fees1 * 0.15);
      } else {
        return Math.max(0, fees0 * 3000 + fees1 * 0.15);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-700 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Vault Analytics</h1>
            <p className="text-gray-400">Real-time performance metrics coming soon</p>
          </div>

          {/* Placeholder Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-6">
              <div className="text-sm text-gray-400 mb-2">Total Value Locked</div>
              <div className="text-3xl font-bold text-white">$--</div>
              <div className="text-xs text-emerald-400 mt-2">Updating...</div>
            </div>
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-6">
              <div className="text-sm text-gray-400 mb-2">Current APY</div>
              <div className="text-3xl font-bold text-[#F2D57C]">--%</div>
              <div className="text-xs text-gray-500 mt-2">7-day average</div>
            </div>
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-6">
              <div className="text-sm text-gray-400 mb-2">Total Fees Earned</div>
              <div className="text-3xl font-bold text-white">$--</div>
              <div className="text-xs text-gray-500 mt-2">All time</div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Analytics Dashboard</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Track vault performance, fee earnings, and strategy metrics. 
              Historical data and charts will be available once connected to the analytics backend.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a 
                href="https://etherscan.io/address/0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
              >
                View on Etherscan
              </a>
              <button
                onClick={() => fetchVaultStats(true)}
                className="px-6 py-3 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl text-violet-300 font-medium transition-all"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalTvl = vaults.reduce((sum, vault) => {
    // Use latest snapshot if available, otherwise fall back to stats
    if (vault.snapshots && vault.snapshots.length > 0) {
      // Get the latest snapshot (sorted by timestamp)
      const sortedSnapshots = [...vault.snapshots].sort((a, b) => 
        parseInt(b.timestamp) - parseInt(a.timestamp)
      );
      const latestSnapshot = sortedSnapshots[0];
      return sum + calculateTvl(latestSnapshot, vault);
    }
    
    // Fallback to stats if no snapshots
    if (!vault.stats) return sum;
    const amount0 = parseFloat(vault.stats.total0 || '0') / 1e18;
    const amount1 = parseFloat(vault.stats.total1 || '0') / 1e18;
    
    if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
      return sum + amount0 * vault.prices.token0Price + amount1 * vault.prices.token1Price;
    }
    
    if (vault.strategyType === 'USD1') {
      return sum + amount0 + amount1 * 0.15;
    } else {
      return sum + amount0 * 3000 + amount1 * 0.15;
    }
  }, 0);

  const totalFees = vaults.reduce((sum, vault) => {
    // Priority 1: Use feeBreakdown.total if available (most accurate)
    if (vault.feeBreakdown) {
      const token0 = parseFloat(vault.feeBreakdown.total.token0) / 1e18;
      const token1 = parseFloat(vault.feeBreakdown.total.token1) / 1e18;
      
      if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
        return sum + token0 * vault.prices.token0Price + token1 * vault.prices.token1Price;
      } else {
        if (vault.strategyType === 'USD1') {
          return sum + token0 + token1 * 0.15;
        } else {
          return sum + token0 * 3000 + token1 * 0.15;
        }
      }
    }
    
    // Priority 2: Use stats.fullFees0 and fullFees1 if available
    if (vault.stats && vault.stats.fullFees0 && vault.stats.fullFees1) {
      const fees0 = parseFloat(vault.stats.fullFees0) / 1e18;
      const fees1 = parseFloat(vault.stats.fullFees1) / 1e18;
      
      if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
        return sum + fees0 * vault.prices.token0Price + fees1 * vault.prices.token1Price;
      } else {
        if (vault.strategyType === 'USD1') {
          return sum + fees0 + fees1 * 0.15;
        } else {
          return sum + fees0 * 3000 + fees1 * 0.15;
        }
      }
    }
    
    // Priority 3: Fallback to calculating from recentFees events
    return sum + calculateTotalFeesFromEvents(vault);
  }, 0);

  const avgApr = vaults.length > 0 && vaults[0]?.stats?.calculatedApr
    ? vaults.reduce((sum, v) => sum + (v.stats?.calculatedApr || 0), 0) / vaults.length
    : null;

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Morningstar Style Dark */}
        <div className="mb-8 border-b border-gray-700 pb-6">
          <h1 className="text-3xl font-semibold text-white mb-2">Vault Analytics</h1>
          <p className="text-sm text-gray-400">Comprehensive performance metrics and historical data</p>
        </div>

        {/* Summary Metrics Table - Morningstar Style Dark */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg mb-8 overflow-hidden">
          <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Portfolio Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Metric</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[200px]">Value</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                <tr className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-200">Total Value Locked</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-white break-words min-w-0">
                    ${totalTvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-400">
                    {vaults.length} vault{vaults.length !== 1 ? 's' : ''}
                  </td>
                </tr>
                <tr className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-200">Total Fees Earned</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-white break-words min-w-0">
                    ${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-400">Cumulative</td>
                </tr>
                <tr className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-200">Average APR</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-blue-400">
                    {avgApr ? `${avgApr.toFixed(2)}%` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-400">Weighted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Vault Details */}
        {vaults.map((vault) => {
          const chartData = prepareChartData(vault);
          const feeChartData = prepareFeeChartData(vault);
          
          // Calculate current TVL from latest snapshot or stats
          let currentTvl = 0;
          if (vault.snapshots && vault.snapshots.length > 0) {
            // Get the latest snapshot
            const sortedSnapshots = [...vault.snapshots].sort((a, b) => 
              parseInt(b.timestamp) - parseInt(a.timestamp)
            );
            const latestSnapshot = sortedSnapshots[0];
            currentTvl = calculateTvl(latestSnapshot, vault);
          } else if (vault.stats) {
            // Fallback to stats
            const amount0 = parseFloat(vault.stats.total0 || '0') / 1e18;
            const amount1 = parseFloat(vault.stats.total1 || '0') / 1e18;
            
            if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
              currentTvl = amount0 * vault.prices.token0Price + amount1 * vault.prices.token1Price;
            } else {
              if (vault.strategyType === 'USD1') {
                currentTvl = amount0 + amount1 * 0.15;
              } else {
                currentTvl = amount0 * 3000 + amount1 * 0.15;
              }
            }
          }
          
          // Get token amounts for display
          const amount0 = vault.stats ? parseFloat(vault.stats.total0 || '0') / 1e18 : 0;
          const amount1 = vault.stats ? parseFloat(vault.stats.total1 || '0') / 1e18 : 0;
          
          // Calculate fees using same priority as totalFees
          let totalFeesUsd = 0;
          if (vault.feeBreakdown) {
            const token0 = parseFloat(vault.feeBreakdown.total.token0) / 1e18;
            const token1 = parseFloat(vault.feeBreakdown.total.token1) / 1e18;
            
            if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
              totalFeesUsd = token0 * vault.prices.token0Price + token1 * vault.prices.token1Price;
            } else {
              if (vault.strategyType === 'USD1') {
                totalFeesUsd = token0 + token1 * 0.15;
              } else {
                totalFeesUsd = token0 * 3000 + token1 * 0.15;
              }
            }
          } else if (vault.stats && vault.stats.fullFees0 && vault.stats.fullFees1) {
            const fees0 = parseFloat(vault.stats.fullFees0) / 1e18;
            const fees1 = parseFloat(vault.stats.fullFees1) / 1e18;
            
            if (vault.prices && vault.prices.token0Price > 0 && vault.prices.token1Price > 0) {
              totalFeesUsd = fees0 * vault.prices.token0Price + fees1 * vault.prices.token1Price;
            } else {
              if (vault.strategyType === 'USD1') {
                totalFeesUsd = fees0 + fees1 * 0.15;
              } else {
                totalFeesUsd = fees0 * 3000 + fees1 * 0.15;
              }
            }
          } else {
            totalFeesUsd = calculateTotalFeesFromEvents(vault);
          }
          const token0Amount = vault.stats ? parseFloat(vault.stats.total0 || '0') / 1e18 : 0;
          const token1Amount = vault.stats ? parseFloat(vault.stats.total1 || '0') / 1e18 : 0;
          const token0Symbol = vault.strategyType === 'USD1' ? 'USD1' : 'WETH';
          const token1Symbol = 'WLFI';

          return (
            <div key={vault.id} className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg mb-8">
              {/* Vault Header */}
              <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{vault.strategyType} / WLFI Vault</h2>
                    <p className="text-sm text-gray-400 mt-1 font-mono">{vault.address}</p>
                  </div>
                  {vault.stats?.calculatedApr && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-400">{vault.stats.calculatedApr.toFixed(2)}%</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">APR</div>
                      {vault.stats.calculatedApy && (
                        <>
                          <div className="text-xl font-semibold text-white mt-1">{vault.stats.calculatedApy.toFixed(2)}%</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider">APY</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Key Metrics Table */}
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Value Locked</div>
                    <div className="text-2xl font-bold text-white break-words overflow-visible">
                      ${currentTvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Fees Earned</div>
                    <div className="text-2xl font-bold text-white break-words overflow-visible">
                      ${totalFeesUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Data Points</div>
                    <div className="text-2xl font-bold text-white">
                      {vault.snapshots.length + vault.recentFees.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Allocation */}
              <div className="px-6 py-6 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Asset Allocation</h3>
                <AssetAllocationViz
                  token0Amount={token0Amount}
                  token1Amount={token1Amount}
                  token0Symbol={token0Symbol}
                  token1Symbol={token1Symbol}
                  token0Price={vault.prices?.token0Price || (vault.strategyType === 'USD1' ? 1 : 3000)}
                  token1Price={vault.prices?.token1Price || 0.15}
                  currentTvl={currentTvl}
                />
              </div>

              {/* Performance Chart */}
              {chartData.length > 0 && (
                <div className="px-6 py-6">
                  <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Performance History</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`tvlGradient-${vault.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id={`feesGradient-${vault.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af"
                        fontSize={12}
                        tick={{ fill: '#9ca3af' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#60a5fa"
                        fontSize={12}
                        tick={{ fill: '#60a5fa' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#34d399"
                        fontSize={12}
                        tick={{ fill: '#34d399' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '6px',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                        }}
                        labelStyle={{ color: '#f3f4f6', fontWeight: '600' }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: '#9ca3af' }}
                        iconType="line"
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="tvl"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        fill="url(#tvlGradient)"
                        name="TVL"
                      />
                      {feeChartData.length > 0 && (
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="cumulativeFeesUsd"
                          stroke="#34d399"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fill="url(#feesGradient)"
                          name="Cumulative Fees"
                          data={feeChartData}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
