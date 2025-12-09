import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrowserProvider } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { NeoButton, NeoCard, NeoStatCard } from '../components/neumorphic';
import { ICONS } from '../config/icons';
import { useAnalyticsData } from '../hooks/useAnalyticsData';

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onNavigateUp?: () => void;
}

// Key events for capital injections - will be auto-detected from on-chain data
const CAPITAL_INJECTION_EVENTS: Array<{
  date: string;
  timestamp: number;
  label: string;
  amount?: string;
}> = [
  // Events will be automatically detected from Charm Finance data
];

export default function Analytics({ provider, account, onNavigateUp }: Props) {
  const [selectedVault, setSelectedVault] = useState<'USD1_WLFI' | 'WETH_WLFI' | 'combined'>('combined');
  const { data, loading, error, refetch } = useAnalyticsData(90);
  const [detectedEvents, setDetectedEvents] = useState<Array<{
    type: 'injection' | 'rebalance';
    timestamp: number;
    date: string;
    label: string;
    amount?: string;
    description: string;
  }>>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  // Get combined metrics
  const getCombinedMetrics = () => {
    if (!data) return null;
    
    const usd1 = data.vaults.USD1_WLFI;
    const weth = data.vaults.WETH_WLFI;
    
    const usd1Tvl = usd1.historicalSnapshots.slice(-1)[0]?.tvlUsd || 0;
    const wethTvl = weth.historicalSnapshots.slice(-1)[0]?.tvlUsd || 0;
    const combinedTvl = usd1Tvl + wethTvl;
    
    // Weight APY by TVL
    const usd1Apy = usd1.metrics?.weeklyApy ? parseFloat(usd1.metrics.weeklyApy) : null;
    const wethApy = weth.metrics?.weeklyApy ? parseFloat(weth.metrics.weeklyApy) : null;
    
    let weightedApy: number | null = null;
    if (usd1Apy !== null && wethApy !== null && combinedTvl > 0) {
      weightedApy = (usd1Apy * usd1Tvl + wethApy * wethTvl) / combinedTvl;
    } else if (usd1Apy !== null) {
      weightedApy = usd1Apy;
    } else if (wethApy !== null) {
      weightedApy = wethApy;
    }
    
    return {
      tvlUsd: formatUsd(combinedTvl),
      weeklyApy: weightedApy !== null ? `${weightedApy.toFixed(2)}%` : null,
      monthlyApy: null, // Would need more complex weighting
      inceptionApy: null,
      snapshotCount: (usd1.metrics?.snapshotCount || 0) + (weth.metrics?.snapshotCount || 0),
    };
  };

  // Get current vault metrics
  const getMetrics = () => {
    if (!data) return null;
    if (selectedVault === 'combined') return getCombinedMetrics();
    return data.vaults[selectedVault]?.metrics || null;
  };

  const metrics = getMetrics();
  const currentVault = selectedVault !== 'combined' ? data?.vaults[selectedVault] : null;

  // Detect events from historical data
  useEffect(() => {
    if (!data) return;
    
    const historicalData = getHistoricalData();
    if (historicalData.length === 0) return;
    
    const events: typeof detectedEvents = [];
    
    for (let i = 1; i < historicalData.length; i++) {
      const prev = historicalData[i - 1];
      const curr = historicalData[i];
      
      const tvlChange = curr.tvlUsd - prev.tvlUsd;
      const tvlChangePercent = prev.tvlUsd > 0 ? (tvlChange / prev.tvlUsd) * 100 : 0;
      
      if (tvlChangePercent > 5) {
        events.push({
          type: 'injection',
          timestamp: curr.timestamp,
          date: new Date(curr.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          label: 'Capital Injection',
          amount: formatUsd(tvlChange),
          description: `TVL increased by ${tvlChangePercent.toFixed(1)}%`,
        });
      }
    }
    
    console.log('[Analytics Page] Detected events:', events);
    setDetectedEvents(events);
  }, [data, selectedVault]);

  // Get historical data for chart
  const getHistoricalData = () => {
    if (!data) return [];
    if (selectedVault === 'combined') {
      // Combine both vaults' TVL
      const usd1 = data.vaults.USD1_WLFI.historicalSnapshots;
      const weth = data.vaults.WETH_WLFI.historicalSnapshots;
      
      // Use timestamps from the vault with more data
      const base = usd1.length >= weth.length ? usd1 : weth;
      return base.map((snap, i) => ({
        ...snap,
        tvlUsd: (usd1[i]?.tvlUsd || 0) + (weth[i]?.tvlUsd || 0),
      }));
    }
    return data.vaults[selectedVault]?.historicalSnapshots || [];
  };

  const historicalData = getHistoricalData();

  return (
    <div className="bg-neo-bg min-h-screen pb-24">
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-24">
        {/* Back Button */}
        {onNavigateUp ? (
          <NeoButton 
            onClick={onNavigateUp}
            label="Back to Home"
            icon={
              <svg className="w-4 h-4 -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            }
            className="mb-6 !text-gray-700"
          />
        ) : (
          <Link 
            to="/app"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors text-sm inline-flex"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <img 
            src={ICONS.EAGLE}
            alt="Analytics"
            className="w-16 h-16 rounded-2xl"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Vault Analytics</h1>
            <p className="text-sm text-gray-600">
              Real-time TVL and yield performance
              {data?.meta?.priceSource && (
                <span className="ml-2 text-xs text-gray-400">
                  (prices via {data.meta.priceSource})
                </span>
              )}
            </p>
          </div>
          <NeoButton
            onClick={refetch}
            disabled={loading}
            label=""
            icon={
              <svg 
                className={`w-4 h-4 text-gray-700 ${loading ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            className="!px-3 !py-2 !w-auto !rounded-full"
          />
        </div>

        {/* Vault Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'combined', label: 'Combined' },
            { key: 'USD1_WLFI', label: 'USD1/WLFI' },
            { key: 'WETH_WLFI', label: 'WETH/WLFI' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedVault(key as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedVault === key
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-white/50 text-gray-700 hover:bg-white/80 shadow-neo'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <NeoStatCard
            label="Total Value Locked"
            value={selectedVault === 'combined' 
              ? metrics?.tvlUsd || (loading ? '...' : '$0')
              : currentVault?.metrics?.tvlUsd || (loading ? '...' : '$0')}
            highlighted
            subtitle="In USD"
          />
          <NeoStatCard
            label="Weekly APY"
            value={metrics?.weeklyApy || (loading ? '...' : 'Calculating...')}
            subtitle={metrics?.weeklyApy ? '7-day annualized' : 'Need more data'}
          />
          <NeoStatCard
            label="Monthly APY"
            value={selectedVault !== 'combined' && currentVault?.metrics?.monthlyApy 
              ? currentVault.metrics.monthlyApy 
              : (loading ? '...' : 'Calculating...')}
            subtitle={currentVault?.metrics?.monthlyApy ? '30-day annualized' : 'Need more data'}
          />
          <NeoStatCard
            label="Since Inception"
            value={selectedVault !== 'combined' && currentVault?.metrics?.inceptionApy 
              ? currentVault.metrics.inceptionApy 
              : (loading ? '...' : 'Calculating...')}
            subtitle="All-time performance"
          />
        </div>

        {/* Token Prices */}
        {data?.prices && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/50 shadow-neo rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">WLFI Price</p>
              <p className="text-xl font-bold text-gray-900">${data.prices.WLFI.toFixed(4)}</p>
            </div>
            <div className="bg-white/50 shadow-neo rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">USD1 Price</p>
              <p className="text-xl font-bold text-gray-900">${data.prices.USD1.toFixed(2)}</p>
            </div>
            <div className="bg-white/50 shadow-neo rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">ETH Price</p>
              <p className="text-xl font-bold text-gray-900">${data.prices.WETH.toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* TVL Chart - Interactive */}
        <NeoCard className="mb-8">
          <div className="p-6">
            <h3 className="text-gray-900 dark:text-gray-100 font-bold text-xl mb-4">TVL Over Time</h3>
            <div className="bg-white/30 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-700 rounded-xl p-6 h-80 relative">
              {historicalData.length > 0 ? (
                <div className="h-full flex flex-col relative">
                  <svg 
                    ref={chartRef}
                    className="w-full flex-1 cursor-crosshair" 
                    viewBox="0 0 100 30" 
                    preserveAspectRatio="none"
                    onMouseMove={(e) => {
                      if (!chartRef.current) return;
                      const rect = chartRef.current.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const index = Math.round((x / 100) * (historicalData.length - 1));
                      const snapData = historicalData[index];
                      
                      if (snapData) {
                        setTooltip({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          data: snapData
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <defs>
                      <linearGradient id="tvl-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ca8a04" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#eab308" stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {(() => {
                      const tvlValues = historicalData.map(s => s.tvlUsd);
                      const maxTvl = Math.max(...tvlValues);
                      const minTvl = Math.min(...tvlValues);
                      const range = maxTvl - minTvl || 1;
                      const timestamps = historicalData.map(s => s.timestamp);
                      const minTime = Math.min(...timestamps);
                      const maxTime = Math.max(...timestamps);
                      
                      return (
                        <>
                          {/* Area under the line */}
                          <polygon
                            points={`0,30 ${historicalData.map((snap, i) => {
                              const x = (i / Math.max(historicalData.length - 1, 1)) * 100;
                              const y = 30 - ((snap.tvlUsd - minTvl) / range) * 25;
                              return `${x},${y}`;
                            }).join(' ')} 100,30`}
                            fill="url(#area-gradient)"
                          />
                          
                          {/* Main line */}
                          <polyline
                            points={historicalData.map((snap, i) => {
                              const x = (i / Math.max(historicalData.length - 1, 1)) * 100;
                              const y = 30 - ((snap.tvlUsd - minTvl) / range) * 25;
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="url(#tvl-gradient)"
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Event markers for capital injections */}
                          {detectedEvents.map((event, idx) => {
                            const eventIndex = historicalData.findIndex(s => 
                              Math.abs(s.timestamp - event.timestamp / 1000) < 86400 // Within 1 day
                            );
                            
                            if (eventIndex === -1) return null;
                            
                            const snap = historicalData[eventIndex];
                            const x = (eventIndex / Math.max(historicalData.length - 1, 1)) * 100;
                            const y = 30 - ((snap.tvlUsd - minTvl) / range) * 25;
                            
                            return (
                              <g key={idx}>
                                {/* Vertical line */}
                                <line
                                  x1={x}
                                  y1={y}
                                  x2={x}
                                  y2="30"
                                  stroke={event.type === 'injection' ? '#10b981' : '#3b82f6'}
                                  strokeWidth="0.3"
                                  strokeDasharray="0.5,0.5"
                                  opacity="0.6"
                                />
                                {/* Marker circle */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="0.8"
                                  fill={event.type === 'injection' ? '#10b981' : '#3b82f6'}
                                  stroke="white"
                                  strokeWidth="0.2"
                                />
                                {/* Label flag */}
                                <g transform={`translate(${x},${y - 2})`}>
                                  <rect
                                    x="-3"
                                    y="-2"
                                    width="6"
                                    height="1.5"
                                    fill={event.type === 'injection' ? '#10b981' : '#3b82f6'}
                                    rx="0.2"
                                  />
                                  <text
                                    x="0"
                                    y="-0.5"
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="0.8"
                                    fontWeight="bold"
                                  >
                                    {event.type === 'injection' ? '💰' : '⚖️'}
                                  </text>
                                </g>
                              </g>
                            );
                          })}
                          
                          {/* Hover indicator */}
                          {tooltip && (() => {
                            const snapData = tooltip.data;
                            const index = historicalData.findIndex(s => s.timestamp === snapData.timestamp);
                            if (index === -1) return null;
                            
                            const x = (index / Math.max(historicalData.length - 1, 1)) * 100;
                            const y = 30 - ((snapData.tvlUsd - minTvl) / range) * 25;
                            
                            return (
                              <>
                                {/* Vertical hover line */}
                                <line
                                  x1={x}
                                  y1="0"
                                  x2={x}
                                  y2="30"
                                  stroke="#eab308"
                                  strokeWidth="0.2"
                                  strokeDasharray="0.5,0.5"
                                  opacity="0.5"
                                />
                                {/* Hover point */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="0.6"
                                  fill="#eab308"
                                  stroke="white"
                                  strokeWidth="0.3"
                                />
                              </>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </svg>
                  
                  {/* Tooltip */}
                  {tooltip && (
                    <div 
                      className="absolute bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl border border-amber-500/50 backdrop-blur-sm z-50"
                      style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y - 80}px`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div className="font-semibold text-amber-400 mb-1">
                        {new Date(tooltip.data.timestamp * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-400">TVL:</span>
                          <span className="font-bold">{formatUsd(tooltip.data.tvlUsd)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-400">Share Price:</span>
                          <span className="font-mono">${tooltip.data.sharePrice.toFixed(4)}</span>
                        </div>
                      </div>
                      {/* Check if this is near a capital injection event */}
                      {(() => {
                        const nearbyEvent = detectedEvents.find(e => 
                          Math.abs(tooltip.data.timestamp - e.timestamp / 1000) < 86400
                        );
                        if (nearbyEvent) {
                          return (
                            <div className="mt-2 pt-2 border-t border-green-500/30">
                              <div className={`flex items-center gap-1.5 ${nearbyEvent.type === 'injection' ? 'text-green-400' : 'text-blue-400'}`}>
                                <span>{nearbyEvent.type === 'injection' ? '💰' : '⚖️'}</span>
                                <span className="font-semibold">{nearbyEvent.label}</span>
                              </div>
                              {nearbyEvent.amount && (
                                <div className="text-gray-300 text-xs mt-1">{nearbyEvent.amount}</div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <span>{historicalData[0]?.date}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Current: {formatUsd(historicalData[historicalData.length - 1]?.tvlUsd || 0)}
                    </span>
                    <span>{historicalData[historicalData.length - 1]?.date}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600 dark:text-gray-400">
                    {loading ? 'Loading TVL data...' : 'No data available yet'}
                  </p>
                </div>
              )}
            </div>
            {historicalData.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                {historicalData.length} data points • Updated {new Date(data?.meta?.generatedAt || '').toLocaleTimeString()}
              </p>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-gradient-to-r from-amber-600 to-amber-400"></div>
                    <span className="text-gray-600 dark:text-gray-400">TVL Trend</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-500">💰</span>
                    <span className="text-gray-600 dark:text-gray-400">Capital Injection</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </NeoCard>

        {/* Vault Details (when specific vault selected) */}
        {selectedVault !== 'combined' && currentVault?.metrics && (
          <NeoCard className="mb-8">
            <div className="p-6">
              <h3 className="text-gray-900 font-bold text-xl mb-4">{currentVault.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{currentVault.metrics.token0Symbol}</p>
                  <p className="text-lg font-bold text-gray-900">{currentVault.metrics.token0Amount}</p>
                </div>
                <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{currentVault.metrics.token1Symbol}</p>
                  <p className="text-lg font-bold text-gray-900">{currentVault.metrics.token1Amount}</p>
                </div>
                <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Share Price</p>
                  <p className="text-lg font-bold text-gray-900">{currentVault.metrics.sharePrice}</p>
                </div>
                <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Shares</p>
                  <p className="text-lg font-bold text-gray-900">{currentVault.metrics.totalShares}</p>
                </div>
              </div>
            </div>
          </NeoCard>
        )}

        {/* Fee Breakdown */}
        <NeoCard>
          <div className="p-6">
            <h3 className="text-gray-900 font-bold text-xl mb-6">Fee Structure</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-gray-700 font-semibold mb-4">Eagle Vault Fees</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 border-b border-gray-300">
                    <div>
                      <span className="text-gray-900 font-semibold block mb-1">Deposit Fee</span>
                      <p className="text-xs text-gray-600">One-time fee on deposits</p>
                    </div>
                    <span className="text-gray-900 font-bold text-lg">1%</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-gray-300">
                    <div>
                      <span className="text-gray-900 font-semibold block mb-1">Withdrawal Fee</span>
                      <p className="text-xs text-gray-600">One-time fee on withdrawals</p>
                    </div>
                    <span className="text-gray-900 font-bold text-lg">2%</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b-2 border-amber-400 bg-amber-50/50 -mx-2 px-2 rounded">
                    <div>
                      <span className="text-gray-900 font-semibold block mb-1">Performance Fee</span>
                      <p className="text-xs text-gray-600 mb-2">Charged on profits only</p>
                      <p className="text-xs text-gray-700">
                        • 3.7% to Eagle Vault<br />
                        • 1% to Charm Finance
                      </p>
                    </div>
                    <span className="text-amber-700 font-bold text-lg">4.7%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-gray-700 font-semibold mb-4">Active Strategies</h4>
                <div className="space-y-3">
                  <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">Strategy 1 (50%)</div>
                    <p className="text-gray-900 font-bold">USD1/WLFI Alpha Vault</p>
                    <p className="text-xs text-gray-600 mt-1">Uniswap V3 • 1% Fee Tier</p>
                    {data?.vaults.USD1_WLFI.metrics && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        TVL: {data.vaults.USD1_WLFI.metrics.tvlUsd}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">Strategy 2 (50%)</div>
                    <p className="text-gray-900 font-bold">WETH/WLFI Alpha Vault</p>
                    <p className="text-xs text-gray-600 mt-1">Uniswap V3 • 1% Fee Tier</p>
                    {data?.vaults.WETH_WLFI.metrics && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        TVL: {data.vaults.WETH_WLFI.metrics.tvlUsd}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Source */}
            <div className="mt-6 pt-6 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Data Sources:</span> Charm Finance Subgraph (TVL) • CoinGecko (Prices)
                {data?.meta?.totalSnapshots && (
                  <span className="ml-2">• {data.meta.totalSnapshots} snapshots</span>
                )}
              </p>
              <div className="flex gap-4 mt-2">
                <a 
                  href={`https://alpha.charm.fi/vault/${CONTRACTS.CHARM_VAULT}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium inline-flex items-center gap-1"
                >
                  USD1/WLFI on Charm
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a 
                  href="https://alpha.charm.fi/vault/0x3314e248f3f752cd16939773d83beb3a362f0aef"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium inline-flex items-center gap-1"
                >
                  WETH/WLFI on Charm
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </NeoCard>

        {/* Contract Addresses */}
        <NeoCard className="mt-8">
          <div className="p-6">
            <h3 className="text-gray-900 font-bold text-xl mb-6">Contract Addresses</h3>
            
            <div className="space-y-4">
              <ContractAddress 
                label="USD1/WLFI Charm Vault"
                address={CONTRACTS.CHARM_VAULT}
              />
              <ContractAddress 
                label="WETH/WLFI Charm Vault"
                address="0x3314e248F3F752Cd16939773D83bEb3a362F0AEF"
              />
              <ContractAddress 
                label="Eagle OVault Contract"
                address="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
              />
            </div>
          </div>
        </NeoCard>
      </div>
    </div>
  );
}

// Helper component for contract addresses
function ContractAddress({ label, address }: { label: string; address: string }) {
  return (
    <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
      <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="text-gray-900 font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg flex-1 break-all">
          {address}
        </code>
        <button
          onClick={() => navigator.clipboard.writeText(address)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          title="Copy to clipboard"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          title="View on Etherscan"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// Helper function
function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}
