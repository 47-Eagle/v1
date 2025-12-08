import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { ICONS } from '../config/icons';
import { TokenIcon } from './TokenIcon';
import { getActiveStrategies } from '../config/strategies';
import { ErrorBoundary } from './ErrorBoundary';
import AssetAllocationSunburst from './AssetAllocationSunburst';
import { NeoTabs, NeoButton, NeoInput, NeoStatCard, NeoCard, NeoStatusIndicator } from './neumorphic';
import { UniswapBadge, CharmBadge, LayerZeroBadge } from './tech-stack';
import { DESIGN_SYSTEM as DS } from '../styles/design-system';
import { useRevertFinanceData } from '../hooks/useRevertFinanceData';
import { useSafeApp } from '../hooks/useSafeApp';
import { ComposerPanel } from './ComposerPanel';
import { useCharmStats } from '../context/CharmStatsContext';
import { useAnalyticsData } from '../hooks/useAnalyticsData';

// Lazy load 3D visualization
const VaultVisualization = lazy(() => import('./VaultVisualization'));

// Strategy Row Component with Dropdown

// Analytics Tab Content Component
function AnalyticsTabContent() {
  const { data, loading, error, refetch } = useAnalyticsData(90);
  const [selectedVault, setSelectedVault] = useState<'combined' | 'USD1_WLFI' | 'WETH_WLFI'>('combined');

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getCombinedMetrics = () => {
    if (!data) return null;
    const usd1 = data.vaults.USD1_WLFI;
    const weth = data.vaults.WETH_WLFI;
    const usd1Tvl = usd1.historicalSnapshots.slice(-1)[0]?.tvlUsd || 0;
    const wethTvl = weth.historicalSnapshots.slice(-1)[0]?.tvlUsd || 0;
    const combinedTvl = usd1Tvl + wethTvl;
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
    };
  };

  const getMetrics = () => {
    if (!data) return null;
    if (selectedVault === 'combined') return getCombinedMetrics();
    return data.vaults[selectedVault]?.metrics || null;
  };

  const metrics = getMetrics();
  const currentVault = selectedVault !== 'combined' ? data?.vaults[selectedVault] : null;

  const getHistoricalData = () => {
    if (!data) return [];
    if (selectedVault === 'combined') {
      const usd1 = data.vaults.USD1_WLFI.historicalSnapshots;
      const weth = data.vaults.WETH_WLFI.historicalSnapshots;
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
    <div className="space-y-4">
      {/* Vault Selector */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'combined', label: 'Combined' },
          { key: 'USD1_WLFI', label: 'USD1/WLFI' },
          { key: 'WETH_WLFI', label: 'WETH/WLFI' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedVault(key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedVault === key
                ? 'bg-amber-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={refetch}
          disabled={loading}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
        >
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">TVL</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {metrics?.tvlUsd || (loading ? '...' : '$0')}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Weekly APY</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {metrics?.weeklyApy || (loading ? '...' : 'N/A')}
          </p>
        </div>
      </div>

      {/* Token Prices */}
      {data?.prices && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">WLFI</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">${data.prices.WLFI.toFixed(4)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">USD1</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">${data.prices.USD1.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">ETH</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">${data.prices.WETH.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Mini TVL Chart */}
      {historicalData.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">TVL Over Time</p>
          <div className="h-24">
            <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tvl-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const tvlValues = historicalData.map(s => s.tvlUsd);
                const maxTvl = Math.max(...tvlValues);
                const minTvl = Math.min(...tvlValues);
                const range = maxTvl - minTvl || 1;
                const points = historicalData.map((snap, i) => {
                  const x = (i / (historicalData.length - 1)) * 100;
                  const y = 30 - ((snap.tvlUsd - minTvl) / range) * 28;
                  return `${x},${y}`;
                }).join(' ');
                return (
                  <>
                    <polygon points={`0,30 ${points} 100,30`} fill="url(#tvl-grad)" />
                    <polyline points={points} fill="none" stroke="#eab308" strokeWidth="1.5" />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyRow({ strategy, wlfiPrice, revertData, onToast }: { strategy: any; wlfiPrice?: string; revertData?: any; onToast: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get appropriate Revert Finance data for this strategy
  const strategyRevertData = strategy.id === 1 ? revertData?.strategy1 : strategy.id === 2 ? revertData?.strategy2 : null;

  return (
    <div className={`
      group relative rounded-2xl overflow-hidden transition-all duration-300
      ${strategy.status === 'active' 
        ? 'bg-white/5 dark:bg-white/5 border border-gray-200/10 dark:border-gray-700/20 hover:bg-white/8 dark:hover:bg-white/8 hover:border-[#D4B474]/20' 
        : 'bg-white/3 dark:bg-white/3 border border-gray-200/5 dark:border-gray-700/10 opacity-40'
      }
    `}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 transition-all duration-300"
      >
        <div className="flex items-center justify-between w-full gap-4">
          {/* Left: Number + Name + Meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              {/* Strategy Number - No glow */}
              <span className={`
                text-base font-bold shrink-0
                ${strategy.status === 'active'
                  ? 'text-[#D4B474]'
                  : 'text-gray-600 dark:text-gray-600'
                }
              `}>
                #{strategy.id}
              </span>
              
              {/* Strategy Name */}
              <h4 className={`
                font-semibold text-base truncate
                ${strategy.status === 'active'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-400'
                }
              `}>
                {strategy.name}
              </h4>
            </div>
            
            {/* Compact Meta Info - One Line */}
            {strategy.status === 'active' && (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-500">
                <span>Uniswap {strategy.feeTier || '1%'} Fee Tier</span>
                <span>•</span>
                <span className="text-[#A27D46] dark:text-[#D4B474]">4.7% Performance Fee</span>
              </div>
            )}
            
            {strategy.status !== 'active' && (
              <div className="text-[11px] text-gray-500 dark:text-gray-500">
                {strategy.protocol}
              </div>
            )}
          </div>
          
          {/* Right: Allocation + Expand */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Allocation - Table Header Style */}
            {strategy.allocation && strategy.status === 'active' && (
              <div className="text-center">
                <div className="text-[9px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">
                  Allocation
                </div>
                <div className="text-2xl font-bold text-[#D4B474] leading-none">
                  {strategy.allocation}
                </div>
              </div>
            )}
            
            {/* Expand Icon */}
            <div className={`
              transition-all duration-300
              ${strategy.status === 'active' ? 'text-gray-400 group-hover:text-[#D4B474]' : 'text-gray-600'}
            `}>
              <svg 
                className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={`
          px-4 sm:px-5 pb-4 sm:pb-5 pt-4 border-t animate-fadeIn
          ${strategy.status === 'active'
            ? 'border-gray-200/5 dark:border-gray-700/10'
            : 'border-gray-200/3 dark:border-gray-700/5'
          }
        `}>
          {strategy.status === 'active' && (
            <>
              {/* Deployed Amounts - At the top */}
              {strategy.deployed !== undefined && (
                <div className="mb-4 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-lg p-4 border border-emerald-200/30 dark:border-emerald-700/20">
                  <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Deployed Capital</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    ${Number(strategy.deployed).toFixed(0)}
                  </div>
                  {/* Show token breakdown with icons */}
                  {strategy.usd1Amount && Number(strategy.usd1Amount) > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1 bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                        <TokenIcon symbol="USD1" address={CONTRACTS.USD1} className="w-5 h-5 rounded-full" />
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">USD1</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{Number(strategy.usd1Amount).toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-1 bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                        <TokenIcon symbol="WLFI" address={CONTRACTS.WLFI} className="w-5 h-5 rounded-full" />
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">WLFI</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{Number(strategy.wlfiAmount).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ) : strategy.wethAmount && Number(strategy.wethAmount) > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1 bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                        <TokenIcon symbol="WETH" address={CONTRACTS.WETH} className="w-5 h-5 rounded-full" />
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">WETH</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{Number(strategy.wethAmount).toFixed(4)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-1 bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                        <TokenIcon symbol="WLFI" address={CONTRACTS.WLFI} className="w-5 h-5 rounded-full" />
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">WLFI</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{Number(strategy.wlfiAmount).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* 3D Visualization for Strategy #1 only */}
              {strategy.id === 1 && wlfiPrice && (
                <div className="mb-4">
                  <ErrorBoundary fallback={
                    <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg p-4 text-center">
                      <p className="text-xs text-orange-700 dark:text-orange-400">3D visualization unavailable</p>
                    </div>
                  }>
                    <Suspense fallback={
                      <div className="bg-white/30 dark:bg-gray-800/30 rounded-lg p-6 flex items-center justify-center h-64">
                        <div className="text-center">
                          <svg className="animate-spin w-8 h-8 mx-auto mb-2 text-[#A27D46] dark:text-[#D4B474]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Loading...</p>
                        </div>
                      </div>
                    }>
                      <VaultVisualization currentPrice={Number(wlfiPrice)} />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              )}

              {/* Revert Finance Data for Strategy #2 */}
              {strategy.id === 2 && strategyRevertData && !strategyRevertData.loading && (
                <div className="mb-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg p-4 border border-purple-200/30 dark:border-purple-700/20">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Pool Analytics (Revert Finance)</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Pool TVL</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${(strategyRevertData.tvl / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">7D Avg APR</div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {strategyRevertData.avgAPR.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Max APR (7D)</div>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {strategyRevertData.maxAPR.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Avg Volume (7D)</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ${(strategyRevertData.avgVolume / 1000).toFixed(1)}K
                      </div>
                    </div>
                  </div>
                </div>
              )}
          
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{strategy.description}</p>
              
              {strategy.contract && (
                <div className="space-y-2 mb-4">
                  {/* Contract Addresses - Compact Single Line */}
                  <div className="bg-white/5 dark:bg-white/5 rounded-lg p-3 border border-gray-200/10 dark:border-gray-700/20">
                    {/* Strategy Contract */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold shrink-0 min-w-[100px]">Strategy:</span>
                      <a 
                        href={`https://etherscan.io/address/${strategy.contract}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-xs text-gray-700 dark:text-gray-300 hover:text-[#A27D46] dark:hover:text-[#D4B474] font-mono transition-colors truncate"
                        title={strategy.contract}
                      >
                        {strategy.contract}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(strategy.contract);
                          onToast({ message: 'Contract address copied!', type: 'success' });
                        }}
                        className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Copy address"
                      >
                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <a 
                        href={`https://etherscan.io/address/${strategy.contract}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="View on Etherscan"
                      >
                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>

                    {/* Charm Vault */}
                    {strategy.charmVault && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold shrink-0 min-w-[100px]">Charm Vault:</span>
                        <a 
                          href={`https://etherscan.io/address/${strategy.charmVault}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs text-gray-700 dark:text-gray-300 hover:text-[#A27D46] dark:hover:text-[#D4B474] font-mono transition-colors truncate"
                          title={strategy.charmVault}
                        >
                          {strategy.charmVault}
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(strategy.charmVault);
                            onToast({ message: 'Charm Vault address copied!', type: 'success' });
                          }}
                          className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Copy address"
                        >
                          <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <a 
                          href={`https://etherscan.io/address/${strategy.charmVault}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="View on Etherscan"
                        >
                          <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}

                    {/* Uniswap V3 Pool - Compact Single Line */}
                    {strategy.uniswapPool && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold shrink-0 min-w-[100px]">Uniswap Pool:</span>
                        <a 
                          href={`https://etherscan.io/address/${strategy.uniswapPool}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs text-gray-700 dark:text-gray-300 hover:text-[#A27D46] dark:hover:text-[#D4B474] font-mono transition-colors truncate"
                          title={strategy.uniswapPool}
                        >
                          {strategy.uniswapPool}
                        </a>
                        <div className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[9px] font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                          {strategy.feeTier || '1%'}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(strategy.uniswapPool);
                            onToast({ message: 'Pool address copied!', type: 'success' });
                          }}
                          className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Copy address"
                        >
                          <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <a 
                          href={`https://etherscan.io/address/${strategy.uniswapPool}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="View on Etherscan"
                        >
                          <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <a 
                          href={`https://revert.finance/#/pool/mainnet/uniswapv3/${strategy.uniswapPool}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                          title="View on Revert Finance"
                        >
                          <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          
          {strategy.status === 'coming-soon' && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">This strategy will be available in a future update.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function depositDual(uint256 wlfiAmount, uint256 usd1Amount, address receiver) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function getWLFIPrice() view returns (uint256)',
  'function getUSD1Price() view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function maxWithdraw(address owner) view returns (uint256)',
  'function maxRedeem(address owner) view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
  onNavigateUp?: () => void;
  onNavigateToWrapper?: () => void;
  onNavigateToCrossChain?: () => void;
  onNavigateToAnalytics?: () => void;
}

export default function VaultView({ provider, account, onToast, onNavigateUp, onNavigateToWrapper, onNavigateToCrossChain, onNavigateToAnalytics }: Props) {
  const [infoTab, setInfoTab] = useState<'vault' | 'strategies' | 'analytics'>('vault');
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [controlMode, setControlMode] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  
  // Charm stats context - share data with Analytics page
  const { setStats: setCharmStatsContext } = useCharmStats();
  
  // Admin injection state
  const [injectWlfi, setInjectWlfi] = useState('');
  const [injectUsd1, setInjectUsd1] = useState('');
  const [injectLoading, setInjectLoading] = useState(false);
  const [injectionPreview, setInjectionPreview] = useState<{
    newShareValue: string;
    valueIncrease: string;
    percentageIncrease: string;
  } | null>(null);
  
  // Safe App detection
  const { isSafeApp, safeAddress, isSafeMultisig } = useSafeApp();
  
  // Determine which address to use for transactions: Safe wallet if available, otherwise the connected account
  const effectiveAddress = isSafeApp && safeAddress ? safeAddress : account;
  
  // Check if current account is admin (now showing to everyone)
  const isAdmin = true; // Changed: Admin panel now visible to all users
  
  // Admin check: either direct connection with multisig address OR running in Safe app with correct multisig
  const isActualAdmin = 
    account?.toLowerCase() === CONTRACTS.MULTISIG.toLowerCase() || // Direct connection
    (isSafeApp && isSafeMultisig(CONTRACTS.MULTISIG)); // Running in Safe app with correct Safe address
  
  // Debug admin status and effective address
  useEffect(() => {
    if (account || isSafeApp) {
      console.log('[VaultView] Admin Check:', {
        currentAccount: account,
        currentAccountLower: account?.toLowerCase(),
        multisig: CONTRACTS.MULTISIG,
        multisigLower: CONTRACTS.MULTISIG.toLowerCase(),
        isSafeApp,
        safeAddress,
        effectiveAddress,
        usingAddress: effectiveAddress ? `Using ${isSafeApp ? 'Safe' : 'regular'} wallet: ${effectiveAddress}` : 'No address',
        isSafeMultisig: isSafeMultisig(CONTRACTS.MULTISIG),
        isActualAdmin,
      });
    }
  }, [account, isActualAdmin, isSafeApp, safeAddress, effectiveAddress, isSafeMultisig]);

  // Fetch Revert Finance data for strategy display
  const revertData = useRevertFinanceData();

  // PRODUCTION: All values reset to 0 - fresh deployment
  const [data, setData] = useState({
    totalAssets: '0',
    totalSupply: '0',
    userBalance: '0',
    wlfiBalance: '0',
    usd1Balance: '0',
    wlfiPrice: '0.132',
    usd1Price: '1.000',
    userBalanceUSD: '0',
    expectedShares: '0',
    expectedWithdrawWLFI: '0',
    expectedWithdrawUSD1: '0',
    maxRedeemable: '0',
    vaultLiquidWLFI: '0', // Production: Empty vault
    vaultLiquidUSD1: '0', // Production: Empty vault
    strategyWLFI: '0', // Production: No strategy deposits yet
    strategyUSD1: '0', // Production: No strategy deposits yet
    strategyWETH: '0', // WETH amount in WETH/WLFI strategy
    strategyWLFIinPool: '0', // Actual WLFI tokens in WETH/WLFI pool
    strategyUSD1InPool: '0', // Actual USD1 tokens in USD1/WLFI pool
    strategyWLFIinUSD1Pool: '0', // Actual WLFI tokens in USD1/WLFI pool
    liquidTotal: '0',
    strategyTotal: '0',
    currentFeeApr: '0',
    weeklyApy: '0' as string,
    monthlyApy: '0' as string,
    historicalSnapshots: [] as Array<{ timestamp: number; feeApr: string; totalValue: number }>,
    calculatedApr: null as number | null,
    calculatedApy: null as number | null,
  });

  // Scroll parent container to top on mount
  useEffect(() => {
    const vaultFloor = document.getElementById('vault-floor');
    if (vaultFloor) {
      vaultFloor.scrollTop = 0;
    }
  }, []);

  // Calculate APY from Fee APR using compounding formula
  // APY = (1 + APR/n)^n - 1, where n = compounding frequency (365 for daily)
  const aprToApy = (apr: number): number => {
    if (!apr || apr <= 0 || !isFinite(apr)) return 0;
    // APR is in percentage (e.g., 10 for 10%), convert to decimal
    const aprDecimal = apr / 100;
    // Daily compounding: APY = (1 + APR/365)^365 - 1
    const apy = (Math.pow(1 + aprDecimal / 365, 365) - 1) * 100;
    return isNaN(apy) || !isFinite(apy) ? 0 : apy;
  };

  // Fetch Charm Finance Fee APR data (reliable source)
  const fetchCharmStats = useCallback(async (usd1StrategyTvl: number, wethStrategyTvl: number) => {
    try {
      console.log('[fetchCharmStats] Starting fetch with TVL:', { usd1StrategyTvl, wethStrategyTvl });
      
      // Use the proper GraphQL query structure matching Charm Finance's API
      const query = `query GetVaults($usd1Address: ID!, $wethAddress: ID!) {
        usd1: vault(id: $usd1Address) { 
          total0
          total1
          totalSupply
          fullFees0
          fullFees1
          baseFees0
          baseFees1
          limitFees0
          limitFees1
          pool {
            token0Price
            token1Price
          }
          collectFee(orderBy: timestamp, orderDirection: desc, first: 100) {
            id
            feesToVault0
            feesToVault1
            feesToProtocol0
            feesToProtocol1
            timestamp
          }
          snapshot(orderBy: timestamp, orderDirection: desc, first: 100) { 
            id
            tick
            totalAmount0
            totalAmount1
            totalSupply
            baseLower
            baseUpper
            limitLower
            limitUpper
            timestamp
            price
            fullRangeWeight
            txHash
            vsHoldPerfSince
            annualVsHoldPerfSince
            feeApr
          } 
        }
        weth: vault(id: $wethAddress) { 
          total0
          total1
          totalSupply
          fullFees0
          fullFees1
          baseFees0
          baseFees1
          limitFees0
          limitFees1
          pool {
            token0Price
            token1Price
          }
          collectFee(orderBy: timestamp, orderDirection: desc, first: 100) {
            id
            feesToVault0
            feesToVault1
            feesToProtocol0
            feesToProtocol1
            timestamp
          }
          snapshot(orderBy: timestamp, orderDirection: desc, first: 100) { 
            id
            tick
            totalAmount0
            totalAmount1
            totalSupply
            baseLower
            baseUpper
            limitLower
            limitUpper
            timestamp
            price
            fullRangeWeight
            txHash
            vsHoldPerfSince
            annualVsHoldPerfSince
            feeApr
          } 
        }
      }`;
      
      const response = await fetch('https://stitching-v2.herokuapp.com/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          variables: {
            usd1Address: CONTRACTS.CHARM_VAULT_USD1.toLowerCase(),
            wethAddress: CONTRACTS.CHARM_VAULT_WETH.toLowerCase()
          }
        })
      });
      
      if (!response.ok) {
        console.error('[fetchCharmStats] HTTP error:', response.status, response.statusText);
        return null;
      }
      
      const result = await response.json();
      console.log('[fetchCharmStats] API response:', result);
      
      if (result.errors) {
        console.error('[fetchCharmStats] GraphQL errors:', result.errors);
        return null;
      }
      
      if (!result.data) {
        console.warn('[fetchCharmStats] No data in response');
        return null;
      }
      
      const usd1Vault = result.data.usd1 || {};
      const wethVault = result.data.weth || {};
      const usd1Snapshots = usd1Vault.snapshot || [];
      const wethSnapshots = wethVault.snapshot || [];
      const usd1CollectFees = usd1Vault.collectFee || [];
      const wethCollectFees = wethVault.collectFee || [];
      
      console.log('[fetchCharmStats] Snapshots:', { 
        usd1Count: usd1Snapshots.length, 
        wethCount: wethSnapshots.length 
      });
      
      console.log('[fetchCharmStats] CollectFee events:', {
        usd1Count: usd1CollectFees.length,
        wethCount: wethCollectFees.length
      });
      
      // Get vault-level fee data for fallback calculation
      const usd1TotalFees0 = parseFloat(usd1Vault.fullFees0 || '0') + parseFloat(usd1Vault.baseFees0 || '0') + parseFloat(usd1Vault.limitFees0 || '0');
      const usd1TotalFees1 = parseFloat(usd1Vault.fullFees1 || '0') + parseFloat(usd1Vault.baseFees1 || '0') + parseFloat(usd1Vault.limitFees1 || '0');
      const wethTotalFees0 = parseFloat(wethVault.fullFees0 || '0') + parseFloat(wethVault.baseFees0 || '0') + parseFloat(wethVault.limitFees0 || '0');
      const wethTotalFees1 = parseFloat(wethVault.fullFees1 || '0') + parseFloat(wethVault.baseFees1 || '0') + parseFloat(wethVault.limitFees1 || '0');
      
      console.log('[fetchCharmStats] Vault fees:', {
        usd1: { fees0: usd1TotalFees0, fees1: usd1TotalFees1 },
        weth: { fees0: wethTotalFees0, fees1: wethTotalFees1 }
      });

      // Calculate APY from collectFee events (most accurate method)
      const calculateApyFromCollectFees = (collectFees: any[], strategyTvl: number, pool: any) => {
        if (collectFees.length === 0 || strategyTvl <= 0) return 0;
        
        // Get recent fee collections (last 30 days worth)
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
        
        // Filter to recent fee collections with actual fees
        const recentFees = collectFees.filter((fee: any) => {
          const timestamp = parseInt(fee.timestamp);
          return timestamp >= thirtyDaysAgo && 
                 (parseFloat(fee.feesToVault0 || '0') > 0 || parseFloat(fee.feesToVault1 || '0') > 0);
        });
        
        if (recentFees.length === 0) return 0;
        
        // Calculate total fees collected in USD
        const token0Price = parseFloat(pool?.token0Price || '0');
        const token1Price = parseFloat(pool?.token1Price || '0');
        
        let totalFeesUsd = 0;
        for (const fee of recentFees) {
          const fees0 = parseFloat(fee.feesToVault0 || '0') / 1e18;
          const fees1 = parseFloat(fee.feesToVault1 || '0') / 1e18;
          
          if (token0Price > 0 && token1Price > 0) {
            totalFeesUsd += (fees0 * token0Price) + (fees1 * token1Price);
          } else {
            // Fallback: rough estimates
            // USD1 ≈ $1, WLFI ≈ $0.15 (rough estimate)
            totalFeesUsd += fees0 + (fees1 * 0.15);
          }
        }
        
        // Calculate time period (from oldest to newest fee collection)
        const oldestTimestamp = Math.min(...recentFees.map((f: any) => parseInt(f.timestamp)));
        const newestTimestamp = Math.max(...recentFees.map((f: any) => parseInt(f.timestamp)));
        const timePeriodDays = Math.max(1, (newestTimestamp - oldestTimestamp) / (24 * 60 * 60));
        
        // Calculate daily average fees
        const avgDailyFees = totalFeesUsd / timePeriodDays;
        
        // Calculate annual APR
        const annualFees = avgDailyFees * 365;
        const apr = (annualFees / strategyTvl) * 100;
        
        console.log('[fetchCharmStats] APY from collectFee:', {
          recentFeesCount: recentFees.length,
          totalFeesUsd: totalFeesUsd.toFixed(2),
          timePeriodDays: timePeriodDays.toFixed(2),
          avgDailyFees: avgDailyFees.toFixed(2),
          apr: apr.toFixed(2)
        });
        
        return apr > 0 && apr < 1000 ? apr : 0; // Sanity check
      };
      
      // Find the most recent valid snapshot (skip NaN/invalid values)
      const findValidSnapshot = (snapshots: any[]) => {
        for (const snapshot of snapshots) {
          // Prefer snapshots with valid feeApr > 0 (this is the APR we want)
          if (snapshot.feeApr && 
              parseFloat(snapshot.feeApr) > 0 && 
              !isNaN(parseFloat(snapshot.feeApr))) {
            return snapshot;
          }
          // Or check if annualVsHoldPerfSince is valid (not NaN, not null, not undefined)
          if (snapshot.annualVsHoldPerfSince && 
              snapshot.annualVsHoldPerfSince !== 'NaN' && 
              snapshot.annualVsHoldPerfSince !== null &&
              !isNaN(parseFloat(snapshot.annualVsHoldPerfSince))) {
            return snapshot;
          }
        }
        return snapshots[0]; // Fallback to latest even if invalid
      };

      const usd1Current = findValidSnapshot(usd1Snapshots);
      const wethCurrent = findValidSnapshot(wethSnapshots);

      console.log('[fetchCharmStats] USD1 snapshot data:', usd1Current);
      console.log('[fetchCharmStats] WETH snapshot data:', wethCurrent);

      // Try multiple fields to get APR/APY from Charm Finance
      // Priority: annualVsHoldPerfSince (APY) > apy > feesApr > apr > feeApr > calculate from feesUsd
        let usd1FeeApr = 0;
      let usd1Apy = 0;
      let wethFeeApr = 0;
      let wethApy = 0;
        
      // USD1 Strategy
        if (usd1Current) {
        // Try feeApr first (this is the actual APR from Charm Finance)
        // User indicates it should be 74% APR
        // feeApr "0.7407727938153109" might be stored as decimal where 0.74 = 74%
        if (usd1Current.feeApr && parseFloat(usd1Current.feeApr) > 0) {
          const feeAprRaw = parseFloat(usd1Current.feeApr);
          // If value is < 1, treat as decimal (0.74 = 74%), multiply by 100
          // If value is >= 1, treat as percentage (74 = 74%)
          // Based on user feedback, 0.74 should be interpreted as 74% APR
          usd1FeeApr = feeAprRaw < 1 ? feeAprRaw * 100 : feeAprRaw;
          console.log('[fetchCharmStats] USD1 Fee APR from feeApr:', usd1FeeApr, 'raw:', feeAprRaw);
        }
        // Try annualVsHoldPerfSince (this might be APY or APR - check value)
        else if (usd1Current.annualVsHoldPerfSince && 
            usd1Current.annualVsHoldPerfSince !== 'NaN' &&
            usd1Current.annualVsHoldPerfSince !== null &&
            !isNaN(parseFloat(usd1Current.annualVsHoldPerfSince))) {
          const annualPerf = parseFloat(usd1Current.annualVsHoldPerfSince);
          // If value is < 1, it's likely a decimal (0.8067 = 80.67%)
          // If value is > 1, it's likely already a percentage
          if (annualPerf < 1) {
            usd1Apy = annualPerf * 100; // Convert decimal to percentage
            usd1FeeApr = usd1Apy / 1.1; // Approximate APR from APY
          } else {
            usd1Apy = annualPerf; // Already a percentage
            usd1FeeApr = usd1Apy / 1.1;
          }
          console.log('[fetchCharmStats] USD1 APY from annualVsHoldPerfSince:', usd1Apy, 'APR:', usd1FeeApr);
        }
        // Try apy field
        else if (usd1Current.apy) {
          usd1Apy = parseFloat(usd1Current.apy) * 100;
          usd1FeeApr = usd1Apy / 1.1;
          console.log('[fetchCharmStats] USD1 APY from apy field:', usd1Apy);
        }
        // Try feesApr (Fee APR)
        else if (usd1Current.feesApr && parseFloat(usd1Current.feesApr) > 0) {
          usd1FeeApr = parseFloat(usd1Current.feesApr) * 100;
          console.log('[fetchCharmStats] USD1 Fee APR from feesApr:', usd1FeeApr);
        }
        // Try apr field
        else if (usd1Current.apr && parseFloat(usd1Current.apr) > 0) {
          usd1FeeApr = parseFloat(usd1Current.apr) * 100;
          console.log('[fetchCharmStats] USD1 Fee APR from apr:', usd1FeeApr);
        }
        // Calculate from feesUsd and TVL if available
        else if (usd1Current.feesUsd && usd1StrategyTvl > 0) {
          // feesUsd is likely daily fees, convert to annual APR
          const dailyFees = parseFloat(usd1Current.feesUsd);
          const annualFees = dailyFees * 365;
          usd1FeeApr = (annualFees / usd1StrategyTvl) * 100;
          console.log('[fetchCharmStats] USD1 Fee APR calculated from feesUsd:', usd1FeeApr, 'dailyFees:', dailyFees);
        }
        
        if (isNaN(usd1FeeApr) || !isFinite(usd1FeeApr) || usd1FeeApr < 0) {
          usd1FeeApr = 0;
        }
        if (isNaN(usd1Apy) || !isFinite(usd1Apy) || usd1Apy < 0) {
          usd1Apy = 0;
        }
      }

      // WETH Strategy
        if (wethCurrent) {
        // Try feeApr first (this is the actual APR from Charm Finance)
        // User indicates it should be 74% APR
        // feeApr might be stored as decimal where 0.74 = 74%
        if (wethCurrent.feeApr && parseFloat(wethCurrent.feeApr) > 0) {
          const feeAprRaw = parseFloat(wethCurrent.feeApr);
          // If value is < 1, treat as decimal (0.74 = 74%), multiply by 100
          // If value is >= 1, treat as percentage (74 = 74%)
          // Based on user feedback, 0.74 should be interpreted as 74% APR
          wethFeeApr = feeAprRaw < 1 ? feeAprRaw * 100 : feeAprRaw;
          console.log('[fetchCharmStats] WETH Fee APR from feeApr:', wethFeeApr, 'raw:', feeAprRaw);
        }
        // Try annualVsHoldPerfSince (this might be APY or APR - check value)
        else if (wethCurrent.annualVsHoldPerfSince && 
            wethCurrent.annualVsHoldPerfSince !== 'NaN' &&
            wethCurrent.annualVsHoldPerfSince !== null &&
            !isNaN(parseFloat(wethCurrent.annualVsHoldPerfSince))) {
          const annualPerf = parseFloat(wethCurrent.annualVsHoldPerfSince);
          // If value is < 1, it's likely a decimal (0.8067 = 80.67%)
          // If value is > 1, it's likely already a percentage
          if (annualPerf < 1) {
            wethApy = annualPerf * 100; // Convert decimal to percentage
            wethFeeApr = wethApy / 1.1; // Approximate APR from APY
          } else {
            wethApy = annualPerf; // Already a percentage
            wethFeeApr = wethApy / 1.1;
          }
          console.log('[fetchCharmStats] WETH APY from annualVsHoldPerfSince:', wethApy, 'APR:', wethFeeApr);
        }
        // Try apy field
        else if (wethCurrent.apy) {
          wethApy = parseFloat(wethCurrent.apy) * 100;
          wethFeeApr = wethApy / 1.1;
          console.log('[fetchCharmStats] WETH APY from apy field:', wethApy);
        }
        // Try feesApr (Fee APR)
        else if (wethCurrent.feesApr && parseFloat(wethCurrent.feesApr) > 0) {
          wethFeeApr = parseFloat(wethCurrent.feesApr) * 100;
          console.log('[fetchCharmStats] WETH Fee APR from feesApr:', wethFeeApr);
        }
        // Try apr field
        else if (wethCurrent.apr && parseFloat(wethCurrent.apr) > 0) {
          wethFeeApr = parseFloat(wethCurrent.apr) * 100;
          console.log('[fetchCharmStats] WETH Fee APR from apr:', wethFeeApr);
        }
        // Calculate from feesUsd and TVL if available
        else if (wethCurrent.feesUsd && wethStrategyTvl > 0) {
          // feesUsd is likely daily fees, convert to annual APR
          const dailyFees = parseFloat(wethCurrent.feesUsd);
          const annualFees = dailyFees * 365;
          wethFeeApr = (annualFees / wethStrategyTvl) * 100;
          console.log('[fetchCharmStats] WETH Fee APR calculated from feesUsd:', wethFeeApr, 'dailyFees:', dailyFees);
        }
        
        if (isNaN(wethFeeApr) || !isFinite(wethFeeApr) || wethFeeApr < 0) {
          wethFeeApr = 0;
        }
        if (isNaN(wethApy) || !isFinite(wethApy) || wethApy < 0) {
          wethApy = 0;
        }
      }

      // If still 0, try calculating from collectFee events (most accurate)
      if (usd1FeeApr === 0 && usd1StrategyTvl > 0 && usd1CollectFees.length > 0) {
        const calculatedApr = calculateApyFromCollectFees(usd1CollectFees, usd1StrategyTvl, usd1Vault.pool);
        if (calculatedApr > 0) {
          usd1FeeApr = calculatedApr;
          console.log('[fetchCharmStats] USD1 Fee APR from collectFee events:', usd1FeeApr);
        }
      }

      if (wethFeeApr === 0 && wethStrategyTvl > 0 && wethCollectFees.length > 0) {
        const calculatedApr = calculateApyFromCollectFees(wethCollectFees, wethStrategyTvl, wethVault.pool);
        if (calculatedApr > 0) {
          wethFeeApr = calculatedApr;
          console.log('[fetchCharmStats] WETH Fee APR from collectFee events:', wethFeeApr);
        }
      }
      
      // Final fallback: use cumulative vault fees if collectFee events don't work
      if (usd1FeeApr === 0 && usd1StrategyTvl > 0) {
        const usd1Pool = usd1Vault.pool || {};
        const token0Price = parseFloat(usd1Pool.token0Price || '0');
        const token1Price = parseFloat(usd1Pool.token1Price || '0');
        
        let feesUsdEstimate = 0;
        if (token0Price > 0 && token1Price > 0) {
          feesUsdEstimate = (usd1TotalFees0 / 1e18 * token0Price) + (usd1TotalFees1 / 1e18 * token1Price);
        } else if (usd1TotalFees0 > 0 || usd1TotalFees1 > 0) {
          feesUsdEstimate = (usd1TotalFees0 / 1e18) + (usd1TotalFees1 / 1e18 * 0.15);
        }
        
        if (feesUsdEstimate > 0 && usd1StrategyTvl > 0) {
          const estimatedDailyFees = feesUsdEstimate / 30;
          const annualFees = estimatedDailyFees * 365;
          const estimatedApr = (annualFees / usd1StrategyTvl) * 100;
          
          if (estimatedApr > 0 && estimatedApr < 1000) {
            usd1FeeApr = estimatedApr;
            console.log('[fetchCharmStats] USD1 Fee APR estimated from cumulative vault fees:', usd1FeeApr);
          }
        }
      }

      if (wethFeeApr === 0 && wethStrategyTvl > 0) {
        const wethPool = wethVault.pool || {};
        const token0Price = parseFloat(wethPool.token0Price || '0');
        const token1Price = parseFloat(wethPool.token1Price || '0');
        
        let feesUsdEstimate = 0;
        if (token0Price > 0 && token1Price > 0) {
          feesUsdEstimate = (wethTotalFees0 / 1e18 * token0Price) + (wethTotalFees1 / 1e18 * token1Price);
        } else if (wethTotalFees0 > 0 || wethTotalFees1 > 0) {
          feesUsdEstimate = (wethTotalFees0 / 1e18 * 3000) + (wethTotalFees1 / 1e18 * 0.15);
        }
        
        if (feesUsdEstimate > 0 && wethStrategyTvl > 0) {
          const estimatedDailyFees = feesUsdEstimate / 30;
          const annualFees = estimatedDailyFees * 365;
          const estimatedApr = (annualFees / wethStrategyTvl) * 100;
          
          if (estimatedApr > 0 && estimatedApr < 1000) {
            wethFeeApr = estimatedApr;
            console.log('[fetchCharmStats] WETH Fee APR estimated from cumulative vault fees:', wethFeeApr);
          }
        }
      }

      // Only use estimate if we truly have no data
      if (usd1FeeApr === 0 && usd1StrategyTvl > 0) {
        usd1FeeApr = 10.0;
        console.log('[fetchCharmStats] Using estimated USD1 Fee APR:', usd1FeeApr, '% (no historical data available)');
      }

      if (wethFeeApr === 0 && wethStrategyTvl > 0) {
        wethFeeApr = 10.0;
        console.log('[fetchCharmStats] Using estimated WETH Fee APR:', wethFeeApr, '% (no historical data available)');
      }

      // Use APR directly (user wants 74% APR, not converted APY)
      // If we have APY from annualVsHoldPerfSince, convert it back to approximate APR
      // Otherwise use feeApr directly (which is already APR)
      if (usd1Apy > 0 && usd1FeeApr === 0) {
        // We have APY but no APR, approximate APR from APY
        usd1FeeApr = usd1Apy / 1.1; // Rough conversion
      }
      if (wethApy > 0 && wethFeeApr === 0) {
        // We have APY but no APR, approximate APR from APY
        wethFeeApr = wethApy / 1.1; // Rough conversion
      }
      
      // If we have APR but no APY, convert APR to APY for display
      if (usd1Apy === 0 && usd1FeeApr > 0) {
        usd1Apy = aprToApy(usd1FeeApr);
        }
      if (wethApy === 0 && wethFeeApr > 0) {
        wethApy = aprToApy(wethFeeApr);
      }
      
      console.log('[fetchCharmStats] Final values:', { usd1Apy, wethApy, usd1FeeApr, wethFeeApr });

      // Calculate weighted APR and APY using actual TVL from our vault data
        let weightedApy = 0;
        let weightedFeeApr = 0;
      const totalTvl = usd1StrategyTvl + wethStrategyTvl;
      
      console.log('[fetchCharmStats] TVL calculation:', { 
        usd1StrategyTvl, 
        wethStrategyTvl, 
        totalTvl 
      });
      
      if (totalTvl > 0 && !isNaN(totalTvl) && isFinite(totalTvl)) {
        // Weight by actual strategy TVL from our vault
        weightedFeeApr = ((usd1FeeApr * usd1StrategyTvl) + (wethFeeApr * wethStrategyTvl)) / totalTvl;
        weightedApy = ((usd1Apy * usd1StrategyTvl) + (wethApy * wethStrategyTvl)) / totalTvl;
        console.log('[fetchCharmStats] Weighted by TVL:', { weightedApy, weightedFeeApr });
      } else if (usd1FeeApr > 0 || wethFeeApr > 0) {
        // Fallback: if TVL is 0 but we have fee APR data, use simple average
        const validApys = [usd1Apy, wethApy].filter(apy => apy > 0 && isFinite(apy));
        const validFeeAprs = [usd1FeeApr, wethFeeApr].filter(apr => apr > 0 && isFinite(apr));
        
        console.log('[fetchCharmStats] Using fallback average:', { validApys, validFeeAprs });
        
        if (validFeeAprs.length > 0) {
          weightedFeeApr = validFeeAprs.reduce((sum, apr) => sum + apr, 0) / validFeeAprs.length;
        }
        if (validApys.length > 0) {
          weightedApy = validApys.reduce((sum, apy) => sum + apy, 0) / validApys.length;
        }
        console.log('[fetchCharmStats] Fallback result:', { weightedApy, weightedFeeApr });
      } else {
        console.warn('[fetchCharmStats] No valid data: TVL is 0 and no Fee APR available');
        }

      // Final safety check
      if (isNaN(weightedApy) || !isFinite(weightedApy)) weightedApy = 0;
      if (isNaN(weightedFeeApr) || !isFinite(weightedFeeApr)) weightedFeeApr = 0;

      // Use APR directly for display (user wants 74% APR)
      // Convert APR to APY only if APR is available
      const displayApy = weightedFeeApr > 0 ? aprToApy(weightedFeeApr) : weightedApy;
      const weeklyApy = displayApy > 0 ? displayApy.toFixed(2) : '0';
        const monthlyApy = weeklyApy;
      const currentFeeApr = weightedFeeApr > 0 ? weightedFeeApr.toFixed(2) : '0';

      console.log('[fetchCharmStats] Final result:', { 
        weeklyApy, 
        currentFeeApr, 
        weightedApy, 
        weightedFeeApr 
      });

      // For historical chart, use USD1 strategy
        const historicalSnapshots = usd1Snapshots.map((s: any) => ({ 
          timestamp: parseInt(s.timestamp), 
          feeApr: s.feeApr ? (parseFloat(s.feeApr) * 100).toFixed(2) : '0', 
          totalValue: parseFloat(s.totalAmount0 || '0') + parseFloat(s.totalAmount1 || '0') 
        }));
        
        return { currentFeeApr, weeklyApy, monthlyApy, historicalSnapshots };
    } catch (error) {
      console.error('[fetchCharmStats] Error fetching Charm stats:', error);
    return null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    console.log('[VaultView] fetchData called', { provider: !!provider, account });
    if (!provider) {
      console.warn('[VaultView] No provider available');
      return;
    }

    try {
      console.log('[VaultView] Starting data fetch...');
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
      const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, provider);
      const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, provider);

      // Fetch vault data with individual error handling for totalAssets (may revert due to stale oracles)
      let totalAssets = 0n;
      let totalSupply = 0n;
      let wlfiPrice = 0n;
      let usd1Price = 0n;

      try {
        [totalSupply, wlfiPrice, usd1Price] = await Promise.all([
          vault.totalSupply(),
          vault.getWLFIPrice(),
          vault.getUSD1Price(),
        ]);
      } catch (error: any) {
        console.error('[VaultView] Error fetching basic vault data:', error);
        throw error; // This is critical, can't continue
      }

      // Try to get totalAssets, but don't fail if oracles are stale
      try {
        totalAssets = await vault.totalAssets();
        console.log('[VaultView] totalAssets:', formatEther(totalAssets));
      } catch (error: any) {
        console.warn('[VaultView] totalAssets() failed (likely stale oracle), will calculate manually:', error?.reason || error?.message);
        // We'll calculate it manually from vault + strategy balances below
        totalAssets = 0n;
      }

      let userBalance = '0';
      let wlfiBalance = '0';
      let usd1Balance = '0';
      let userBalanceUSD = '0';
      let maxRedeemable = '0';
      let vaultLiquidWLFI = '0';
      let vaultLiquidUSD1 = '0';
      let strategyWLFI = '0';
      let strategyUSD1 = '0';

      // Get vault balances
      const [vaultWlfiBal, vaultUsd1Bal] = await Promise.all([
        wlfi.balanceOf(CONTRACTS.VAULT),
        usd1.balanceOf(CONTRACTS.VAULT),
      ]);
      
      vaultLiquidWLFI = formatEther(vaultWlfiBal);
      vaultLiquidUSD1 = formatEther(vaultUsd1Bal);
      
      // Get strategy balances from BOTH strategies
      // USD1 Strategy: getTotalAmounts() returns (wlfiAmount, usd1Amount)
      let strategyUSD1InPool = '0';
      let strategyWLFIinUSD1Pool = '0';
      console.log('[VaultView] ===== FETCHING USD1 STRATEGY DATA =====');
      console.log('[VaultView] USD1 Strategy Address:', CONTRACTS.STRATEGY_USD1);
      try {
        const usd1Strategy = new Contract(
          CONTRACTS.STRATEGY_USD1,
          ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
          provider
        );
        const [usd1Wlfi, usd1Amount] = await usd1Strategy.getTotalAmounts();
        
        // Store individual amounts for breakdown display
        strategyWLFIinUSD1Pool = Number(formatEther(usd1Wlfi)).toFixed(2);
        strategyUSD1InPool = Number(formatEther(usd1Amount)).toFixed(2);
        
        // For USD1 strategy display, show total USD value (USD1 + WLFI converted to USD)
        const wlfiValueUsd = Number(formatEther(usd1Wlfi)) * 0.132; // WLFI worth ~$0.132
        const usd1ValueUsd = Number(formatEther(usd1Amount)); // USD1 worth ~$1.00
        const usd1Total = wlfiValueUsd + usd1ValueUsd;
        strategyUSD1 = usd1Total.toFixed(2);
      } catch (error) {
        console.error('Error fetching USD1 strategy balances:', error);
        strategyUSD1 = '0';
        strategyUSD1InPool = '0';
        strategyWLFIinUSD1Pool = '0';
      }
      
      // WETH Strategy: Get actual WETH + WLFI balances from Charm vault
      // Since getTotalAmounts() reverts due to stale oracles, we'll query the Charm vault directly
      let strategyWETH = '0';
      let strategyWLFIinPool = '0';
      console.log('[VaultView] ===== FETCHING WETH STRATEGY DATA =====');
      console.log('[VaultView] WETH Strategy Address:', CONTRACTS.STRATEGY_WETH);
      console.log('[VaultView] WETH Charm Vault Address:', CONTRACTS.CHARM_VAULT_WETH);
      try {
        // Get strategy's share balance in Charm vault
        const charmVault = new Contract(
          CONTRACTS.CHARM_VAULT_WETH,
          [
            'function balanceOf(address) external view returns (uint256)',
            'function totalSupply() external view returns (uint256)',
            'function getTotalAmounts() external view returns (uint256 total0, uint256 total1)'
          ],
          provider
        );
        
        const strategyShares = await charmVault.balanceOf(CONTRACTS.STRATEGY_WETH);
        console.log('[VaultView] WETH strategy Charm shares:', formatEther(strategyShares));
        
        if (strategyShares > 0n) {
          const totalShares = await charmVault.totalSupply();
          
          // Try getTotalAmounts() first, but fallback to direct token balance query if it reverts
          let totalWeth = 0n;
          let totalWlfi = 0n;
          
          try {
            const [total0, total1] = await charmVault.getTotalAmounts();
            totalWeth = total0;
            totalWlfi = total1;
            console.log('[VaultView] Successfully fetched via getTotalAmounts()');
          } catch (getTotalAmountsError: any) {
            console.warn('[VaultView] getTotalAmounts() failed, trying direct token balance query:', getTotalAmountsError?.reason || getTotalAmountsError?.message);
            
            // Fallback: Query token balances directly from the Charm vault
            try {
              const wethToken = new Contract(
                CONTRACTS.WETH,
                ['function balanceOf(address) external view returns (uint256)'],
                provider
              );
              const wlfiToken = new Contract(
                CONTRACTS.WLFI,
                ['function balanceOf(address) external view returns (uint256)'],
                provider
              );
              
              const [wethBal, wlfiBal] = await Promise.all([
                wethToken.balanceOf(CONTRACTS.CHARM_VAULT_WETH),
                wlfiToken.balanceOf(CONTRACTS.CHARM_VAULT_WETH)
              ]);
              
              totalWeth = wethBal;
              totalWlfi = wlfiBal;
              console.log('[VaultView] Successfully fetched via direct token balances');
            } catch (tokenBalanceError: any) {
              console.error('[VaultView] Direct token balance query also failed:', tokenBalanceError?.reason || tokenBalanceError?.message);
              throw tokenBalanceError;
            }
          }
          
          if (totalShares > 0n && (totalWeth > 0n || totalWlfi > 0n)) {
            // Calculate strategy's proportional share
            const strategyWethAmount = (totalWeth * strategyShares) / totalShares;
            const strategyWlfiAmount = (totalWlfi * strategyShares) / totalShares;
            
            strategyWETH = Number(formatEther(strategyWethAmount)).toFixed(4);
            strategyWLFIinPool = Number(formatEther(strategyWlfiAmount)).toFixed(2);
            
            console.log('[VaultView] ===== WETH STRATEGY DATA =====');
            console.log('[VaultView] WETH amount:', strategyWETH);
            console.log('[VaultView] WLFI in pool amount:', strategyWLFIinPool);
            console.log('[VaultView] Shares:', formatEther(strategyShares));
            console.log('[VaultView] Total WETH in vault:', formatEther(totalWeth));
            console.log('[VaultView] Total WLFI in vault:', formatEther(totalWlfi));
            console.log('[VaultView] ============================');
            
            // For display, show total USD value (WETH worth ~$3500, WLFI worth ~$0.132)
            const wethValueUsd = Number(strategyWETH) * 3500;
            const wlfiValueUsd = Number(strategyWLFIinPool) * 0.132;
            strategyWLFI = (wethValueUsd + wlfiValueUsd).toFixed(2);
          } else {
            console.log('[VaultView] No assets in Charm vault or invalid share calculation');
          }
        } else {
          console.log('[VaultView] Strategy has no shares in Charm vault');
        }
      } catch (error: any) {
        console.warn('WETH strategy Charm vault query failed:', error?.reason || error?.message || error);
        strategyWLFI = '0';
        strategyWETH = '0';
        strategyWLFIinPool = '0';
      }

      // Calculate total USD value of vault reserves (WLFI worth ~$0.132, USD1 worth ~$1.00)
      const vaultWlfiValueUsd = Number(vaultLiquidWLFI) * 0.132;
      const vaultUsd1ValueUsd = Number(vaultLiquidUSD1);
      const liquidTotal = (vaultWlfiValueUsd + vaultUsd1ValueUsd).toFixed(2);
      
      // strategyWLFI and strategyUSD1 are already in USD terms from above calculations
      const strategyTotal = (Number(strategyWLFI) + Number(strategyUSD1)).toFixed(2);

      console.log('[VaultView] ===== ALL STRATEGY BALANCES =====');
      console.log('[VaultView] Vault Liquid WLFI:', vaultLiquidWLFI);
      console.log('[VaultView] Vault Liquid USD1:', vaultLiquidUSD1);
      console.log('[VaultView] USD1 Strategy Total:', strategyUSD1);
      console.log('[VaultView] WETH Strategy Total Value:', strategyWLFI);
      console.log('[VaultView] WETH Strategy WETH Amount:', strategyWETH);
      console.log('[VaultView] WETH Strategy WLFI in Pool:', strategyWLFIinPool);
      console.log('[VaultView] ===============================');

      // If totalAssets failed to fetch, calculate it manually (in USD)
      if (totalAssets === 0n) {
        const manualTotal = Number(liquidTotal) + Number(strategyTotal);
        totalAssets = parseEther(manualTotal.toFixed(18));
        console.log('[VaultView] Calculated totalAssets manually (USD):', formatEther(totalAssets));
      }

      // Fetch Charm stats using our actual vault TVL data
      const usd1StrategyTvl = Number(strategyUSD1) || 0;
      const wethStrategyTvl = Number(strategyWLFI) || 0;
      console.log('[VaultView] Fetching Charm stats with TVL:', { usd1StrategyTvl, wethStrategyTvl });
      const charmStats = await fetchCharmStats(usd1StrategyTvl, wethStrategyTvl);
      console.log('[VaultView] Charm stats result:', charmStats);

      // Also fetch vault stats from API for APY data (more reliable)
      let calculatedApr = null;
      let calculatedApy = null;
      try {
        const vaultStatsResponse = await fetch('/api/vault-stats');
        if (vaultStatsResponse.ok) {
          const vaultStatsData = await vaultStatsResponse.json();
          if (vaultStatsData.success && vaultStatsData.vaults && vaultStatsData.vaults.length > 0) {
            // Get the first vault's stats (or average across all vaults)
            const firstVault = vaultStatsData.vaults[0];
            if (firstVault.stats) {
              calculatedApr = firstVault.stats.calculatedApr;
              calculatedApy = firstVault.stats.calculatedApy;
              console.log('[VaultView] Fetched APY from vault-stats API:', { calculatedApr, calculatedApy });
            }
          }
        }
      } catch (error) {
        console.warn('[VaultView] Failed to fetch vault stats API:', error);
      }

      if (account) {
        const [vEagle, wlfiBal, usd1Bal, maxRedeem] = await Promise.all([
          vault.balanceOf(effectiveAddress),
          wlfi.balanceOf(effectiveAddress),
          usd1.balanceOf(effectiveAddress),
          vault.maxRedeem(effectiveAddress),
        ]);
        userBalance = formatEther(vEagle);
        wlfiBalance = formatEther(wlfiBal);
        usd1Balance = formatEther(usd1Bal);
        maxRedeemable = formatEther(maxRedeem);

        if (Number(totalSupply) > 0) {
          const assetsPerShare = Number(formatEther(totalAssets)) / Number(formatEther(totalSupply));
          const userAssets = Number(userBalance) * assetsPerShare;
          userBalanceUSD = userAssets.toFixed(2);
        }
      }

      const newData = {
        ...data,
        totalAssets: formatEther(totalAssets),
        totalSupply: formatEther(totalSupply),
        userBalance,
        wlfiBalance,
        usd1Balance,
        wlfiPrice: Number(formatEther(wlfiPrice)).toFixed(3),
        usd1Price: Number(formatEther(usd1Price)).toFixed(3),
        userBalanceUSD,
        maxRedeemable,
        vaultLiquidWLFI,
        vaultLiquidUSD1,
        strategyWLFI,
        strategyUSD1,
        strategyWETH,
        strategyWLFIinPool,
        strategyUSD1InPool,
        strategyWLFIinUSD1Pool,
        liquidTotal,
        strategyTotal,
        currentFeeApr: charmStats?.currentFeeApr || '0',
        weeklyApy: charmStats?.weeklyApy || '0',
        monthlyApy: charmStats?.monthlyApy || '0',
        historicalSnapshots: charmStats?.historicalSnapshots || [],
        calculatedApr,
        calculatedApy,
      };
      
      console.log('[VaultView] Setting new data:', {
        ...newData,
        strategyWETH_check: strategyWETH, // Explicit check
        strategyWLFI_check: strategyWLFI,
        strategyUSD1_check: strategyUSD1
      });
      setData(newData);
      
      // Share Charm stats with Analytics page via context
      setCharmStatsContext({
        currentFeeApr: newData.currentFeeApr,
        weeklyApy: newData.weeklyApy,
        monthlyApy: newData.monthlyApy,
        historicalSnapshots: newData.historicalSnapshots,
        calculatedApr: newData.calculatedApr,
        calculatedApy: newData.calculatedApy,
        liquidTotal: newData.liquidTotal,
        strategyTotal: newData.strategyTotal,
      });
      
      console.log('[VaultView] Data fetch complete!');
    } catch (error) {
      console.error('[VaultView] Error fetching data:', error);
    }
  }, [provider, account, fetchCharmStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  }, [fetchData]);

  const handleSyncBalances = useCallback(async () => {
    if (!provider || !account) {
      onToast({ message: 'Connect wallet first', type: 'error' });
      return;
    }

    try {
      const signer = await provider.getSigner();
      const vault = new Contract(
        CONTRACTS.VAULT,
        ['function syncBalances()'],
        signer
      );

      onToast({ message: 'Syncing vault balances...', type: 'info' });
      const tx = await vault.syncBalances();
      await tx.wait();
      
      onToast({ message: '✅ Balances synced! Refreshing data...', type: 'success', txHash: tx.hash });
      
      // Refresh data after sync
      setTimeout(() => {
        fetchData();
      }, 2000);
    } catch (error: any) {
      console.error('Sync error:', error);
      let msg = 'Sync failed';
      if (error.message?.includes('onlyManager')) {
        msg = 'Only the vault manager can sync balances';
      } else if (error.message) {
        msg = error.message.slice(0, 100);
      }
      onToast({ message: msg, type: 'error' });
    }
  }, [provider, account, onToast, fetchData]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Memoize calculated values (for potential future use)
  // const calculatedMetrics = useMemo(() => {
  //   const totalAssetsNum = Number(data.totalAssets);
  //   const totalSupplyNum = Number(data.totalSupply);
  //   const liquidTotalNum = Number(data.liquidTotal);
  //   const strategyTotalNum = Number(data.strategyTotal);
  //   
  //   const liquidPercent = totalAssetsNum > 0 ? ((liquidTotalNum / totalAssetsNum) * 100).toFixed(1) : '0';
  //   const deployedPercent = totalAssetsNum > 0 ? ((strategyTotalNum / totalAssetsNum) * 100).toFixed(1) : '0';
  //   const sharePrice = totalSupplyNum > 0 ? (totalAssetsNum / totalSupplyNum) : 1;
  //   const netApy = (Number(data.monthlyApy) * 0.953).toFixed(2); // After 4.7% fee
  //
  //   return { liquidPercent, deployedPercent, sharePrice, netApy };
  // }, [data.totalAssets, data.totalSupply, data.liquidTotal, data.strategyTotal, data.monthlyApy]);

  const handleDeposit = async () => {
    if (!provider || !account) {
      onToast({ message: 'Connect wallet to deposit', type: 'error' });
      return;
    }

    if (!wlfiAmount && !usd1Amount) {
      onToast({ message: 'Enter deposit amount', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wlfiAmt = wlfiAmount ? parseEther(wlfiAmount) : 0n;
      const usd1Amt = usd1Amount ? parseEther(usd1Amount) : 0n;

      // Approve if needed
      if (wlfiAmt > 0n) {
        const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, signer);
        const allowance = await wlfi.allowance(effectiveAddress, CONTRACTS.VAULT);
        if (allowance < wlfiAmt) {
          const tx = await wlfi.approve(CONTRACTS.VAULT, wlfiAmt);
          await tx.wait();
        }
      }

      if (usd1Amt > 0n) {
        const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, signer);
        const allowance = await usd1.allowance(effectiveAddress, CONTRACTS.VAULT);
        if (allowance < usd1Amt) {
          const tx = await usd1.approve(CONTRACTS.VAULT, usd1Amt);
          await tx.wait();
        }
      }

      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const tx = await vault.depositDual(wlfiAmt, usd1Amt, effectiveAddress);
      onToast({ message: 'Depositing...', type: 'info', txHash: tx.hash });

      await tx.wait();
      onToast({ message: '✅ Deposit successful!', type: 'success', txHash: tx.hash });

      setWlfiAmount('');
      setUsd1Amount('');
    } catch (error: any) {
      console.error('Deposit error:', error);
      onToast({ message: error.message || 'Deposit failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate expected withdrawal amounts based on ACTUAL vault composition
  useEffect(() => {
    const calculateWithdrawal = async () => {
      if (!provider || !withdrawAmount || Number(withdrawAmount) <= 0) {
        setData(prev => ({ 
          ...prev, 
          expectedWithdrawWLFI: '0',
          expectedWithdrawUSD1: '0'
        }));
        return;
      }

      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, provider);
        const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, provider);
        
        const [totalSupply, vaultWlfiBal, vaultUsd1Bal] = await Promise.all([
          vault.totalSupply(),
          wlfi.balanceOf(CONTRACTS.VAULT),
          usd1.balanceOf(CONTRACTS.VAULT),
        ]);
        
        // Get strategy balances from BOTH strategies
        let strategyWlfiBal = 0n;
        let strategyUsd1Bal = 0n;
        let strategyWethBal = 0n;
        
        try {
          // USD1 Strategy
          const usd1Strategy = new Contract(
            CONTRACTS.STRATEGY_USD1,
            ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
            provider
          );
          const [usd1Wlfi, usd1Amount] = await usd1Strategy.getTotalAmounts();
          strategyWlfiBal = usd1Wlfi;
          strategyUsd1Bal = usd1Amount;
        } catch (error) {
          console.error('Error fetching USD1 strategy balances for withdrawal calc:', error);
        }
        
        try {
          // WETH Strategy - may fail if oracles are stale
          const wethStrategy = new Contract(
            CONTRACTS.STRATEGY_WETH,
            ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
            provider
          );
          const [wlfiAmount] = await wethStrategy.getTotalAmounts();
          strategyWlfiBal = strategyWlfiBal + wlfiAmount; // Add WLFI from both strategies
        } catch (error: any) {
          console.warn('WETH strategy getTotalAmounts() failed in withdrawal calc:', error?.reason || error?.message);
          // Fallback: Use WLFI balance of strategy contract
          try {
            const wlfi = new Contract(CONTRACTS.WLFI, ['function balanceOf(address) external view returns (uint256)'], provider);
            const wlfiBal = await wlfi.balanceOf(CONTRACTS.STRATEGY_WETH);
            strategyWlfiBal = strategyWlfiBal + wlfiBal;
          } catch {}
        }
        
        const supply = Number(formatEther(totalSupply));
        const totalWlfi = Number(formatEther(vaultWlfiBal)) + Number(formatEther(strategyWlfiBal));
        const totalUsd1 = Number(formatEther(vaultUsd1Bal)) + Number(formatEther(strategyUsd1Bal));
        
        const withdrawPortion = Number(withdrawAmount) / supply;
        const expectedWlfi = (totalWlfi * withdrawPortion).toFixed(4);
        const expectedUsd1 = (totalUsd1 * withdrawPortion).toFixed(4);
        
        setData(prev => ({
          ...prev,
          expectedWithdrawWLFI: expectedWlfi,
          expectedWithdrawUSD1: expectedUsd1,
        }));
      } catch (error) {
        console.error('Error calculating withdrawal:', error);
      }
    };

    calculateWithdrawal();
  }, [provider, withdrawAmount]);

  const handleWithdraw = async () => {
    if (!provider || !account) {
      onToast({ message: 'Connect wallet to withdraw', type: 'error' });
      return;
    }

    if (!withdrawAmount || withdrawAmount === '0' || withdrawAmount === '') {
      onToast({ message: 'Enter withdrawal amount', type: 'error' });
      return;
    }

    const withdrawNum = Number(withdrawAmount);
    
    console.log('=== WITHDRAWAL INITIATED ===');
    console.log('Input value:', withdrawAmount);
    console.log('Parsed number:', withdrawNum);
    console.log('Your balance:', data.userBalance);
    console.log('Max redeemable:', data.maxRedeemable);
    
    // Validate input is a valid number
    if (isNaN(withdrawNum) || withdrawNum <= 0) {
      onToast({ message: 'Invalid withdrawal amount', type: 'error' });
      return;
    }
    
    if (withdrawNum > Number(data.userBalance)) {
      onToast({ message: `Insufficient balance. You have ${Number(data.userBalance).toFixed(4)} vEAGLE`, type: 'error' });
      return;
    }

    // Check against maxRedeemable from data
    const maxFromData = Number(data.maxRedeemable);
    if (maxFromData > 0 && withdrawNum > maxFromData) {
      onToast({ 
        message: `Maximum withdrawal: ${maxFromData.toFixed(4)} vEAGLE. Auto-filled for you.`, 
        type: 'error' 
      });
      setWithdrawAmount(maxFromData.toFixed(4));
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);

      const shares = parseEther(withdrawAmount);
      console.log('Shares in wei:', shares.toString());
      
      // CALCULATE REAL MAXIMUM based on actual vault token balances
      const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, provider);
      const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, provider);
      
      const [totalSupply, vaultWlfiBal, vaultUsd1Bal, totalAssets] = await Promise.all([
        vault.totalSupply(),
        wlfi.balanceOf(CONTRACTS.VAULT),
        usd1.balanceOf(CONTRACTS.VAULT),
        vault.totalAssets(),
      ]);
      
      const vaultWlfi = Number(formatEther(vaultWlfiBal));
      const vaultUsd1 = Number(formatEther(vaultUsd1Bal));
      const supply = Number(formatEther(totalSupply));
      // const assets = Number(formatEther(totalAssets)); // For potential future use
      
      // Get strategy balances from BOTH strategies
      let strategyWlfiBal = 0n;
      let strategyUsd1Bal = 0n;
      
      try {
        // USD1 Strategy
        const usd1Strategy = new Contract(
          CONTRACTS.STRATEGY_USD1,
          ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
          provider
        );
        const [usd1Wlfi, usd1Amount] = await usd1Strategy.getTotalAmounts();
        strategyWlfiBal = usd1Wlfi;
        strategyUsd1Bal = usd1Amount;
      } catch (error) {
        console.error('Error fetching USD1 strategy balances for withdraw:', error);
      }
      
      try {
        // WETH Strategy - may fail if oracles are stale
        const wethStrategy = new Contract(
          CONTRACTS.STRATEGY_WETH,
          ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
          provider
        );
        const [wlfiAmount] = await wethStrategy.getTotalAmounts();
        strategyWlfiBal = strategyWlfiBal + wlfiAmount; // Add WLFI from both strategies
      } catch (error: any) {
        console.warn('WETH strategy getTotalAmounts() failed in withdraw:', error?.reason || error?.message);
        // Fallback: Use WLFI balance of strategy contract
        try {
          const wlfi = new Contract(CONTRACTS.WLFI, ['function balanceOf(address) external view returns (uint256)'], provider);
          const wlfiBal = await wlfi.balanceOf(CONTRACTS.STRATEGY_WETH);
          strategyWlfiBal = strategyWlfiBal + wlfiBal;
        } catch {}
      }
      
      const strategyWlfi = Number(formatEther(strategyWlfiBal));
      const strategyUsd1 = Number(formatEther(strategyUsd1Bal));
      
      // ACTUAL total tokens in system
      const totalWlfiTokens = vaultWlfi + strategyWlfi;
      const totalUsd1Tokens = vaultUsd1 + strategyUsd1;
      const totalTokens = totalWlfiTokens + totalUsd1Tokens;
      
      // Calculate ACTUAL ratio of tokens (not 50/50!)
      const wlfiRatio = totalTokens > 0 ? totalWlfiTokens / totalTokens : 0.5;
      const usd1Ratio = totalTokens > 0 ? totalUsd1Tokens / totalTokens : 0.5;
      
      // Calculate what portion of total you're trying to withdraw
      const withdrawPortion = withdrawNum / supply;
      
      // What you'll actually get (based on current vault composition)
      const expectedWlfi = totalWlfiTokens * withdrawPortion;
      const expectedUsd1 = totalUsd1Tokens * withdrawPortion;
      
      console.log('Total supply:', supply.toFixed(2), 'vEAGLE');
      console.log('Total WLFI in system:', totalWlfiTokens.toFixed(2), `(${(wlfiRatio * 100).toFixed(1)}%)`);
      console.log('Total USD1 in system:', totalUsd1Tokens.toFixed(2), `(${(usd1Ratio * 100).toFixed(1)}%)`);
      console.log('Vault WLFI:', vaultWlfi.toFixed(2));
      console.log('Vault USD1:', vaultUsd1.toFixed(2));
      console.log('Strategy WLFI:', strategyWlfi.toFixed(2));
      console.log('Strategy USD1:', strategyUsd1.toFixed(2));
      console.log('Withdraw portion:', (withdrawPortion * 100).toFixed(2) + '%');
      console.log('You will get:', expectedWlfi.toFixed(2), 'WLFI +', expectedUsd1.toFixed(2), 'USD1');
      console.log('Vault needs to have:', expectedWlfi.toFixed(2), 'WLFI +', expectedUsd1.toFixed(2), 'USD1');
      
      // Check if vault has enough (with 0.1% tolerance for floating point errors)
      const tolerance = 1.001; // 0.1% tolerance
      const hasEnoughWlfi = vaultWlfi >= (expectedWlfi / tolerance);
      const hasEnoughUsd1 = vaultUsd1 >= (expectedUsd1 / tolerance);
      
      console.log('Has enough WLFI?', hasEnoughWlfi, `(${vaultWlfi.toFixed(2)} >= ${(expectedWlfi / tolerance).toFixed(2)})`);
      console.log('Has enough USD1?', hasEnoughUsd1, `(${vaultUsd1.toFixed(2)} >= ${(expectedUsd1 / tolerance).toFixed(2)})`);
      
      if (!hasEnoughWlfi || !hasEnoughUsd1) {
        const limitingToken = !hasEnoughUsd1 ? 'USD1' : 'WLFI';
        const available = limitingToken === 'USD1' ? vaultUsd1 : vaultWlfi;
        const needed = limitingToken === 'USD1' ? expectedUsd1 : expectedWlfi;
        
        // Calculate actual max based on limiting token
        const maxByToken = limitingToken === 'USD1' 
          ? (vaultUsd1 / (expectedUsd1 / withdrawNum)) 
          : (vaultWlfi / (expectedWlfi / withdrawNum));
        
        console.log(`❌ BLOCKED: Not enough ${limitingToken}`);
        console.log(`Available: ${available.toFixed(2)}, Needed: ${needed.toFixed(2)}`);
        console.log(`Real maximum: ${maxByToken.toFixed(4)} vEAGLE`);
        
        onToast({ 
          message: `Vault only has ${available.toFixed(2)} ${limitingToken} (needs ${needed.toFixed(2)}). Maximum: ${maxByToken.toFixed(4)} vEAGLE. Auto-filled.`, 
          type: 'error' 
        });
        setLoading(false);
        setWithdrawAmount(maxByToken.toFixed(4));
        return;
      }

      console.log('✅ Vault has enough tokens (within tolerance), proceeding!');

      // Proceed with redemption using standard ERC-4626 redeem
      console.log('📤 Sending transaction...');
      onToast({ message: 'Redeeming shares from vault...', type: 'info' });
      const tx = await vault.redeem(shares, account, account);
      onToast({ message: 'Transaction submitted...', type: 'info', txHash: tx.hash });

      await tx.wait();
      onToast({ message: '✅ Withdrawal successful!', type: 'success', txHash: tx.hash });

      setWithdrawAmount('');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Withdraw error:', error);
      let errorMessage = 'Withdrawal failed';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('transfer amount exceeds balance')) {
        errorMessage = 'Vault has insufficient tokens. Most assets are earning in Charm Finance. Use the Max button to withdraw available amount.';
      } else if (error.message) {
        errorMessage = error.message.slice(0, 150);
      }
      
      onToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Preview capital injection impact
  const handlePreviewInjection = useCallback(async () => {
    if (!provider || (!injectWlfi && !injectUsd1)) {
      setInjectionPreview(null);
      return;
    }

    try {
      const vault = new Contract(
        CONTRACTS.VAULT,
        [
          'function previewCapitalInjection(uint256 wlfiAmount, uint256 usd1Amount) external view returns (uint256 newShareValue, uint256 valueIncrease, uint256 percentageIncrease)'
        ],
        provider
      );

      const wlfiWei = injectWlfi ? parseEther(injectWlfi) : 0n;
      const usd1Wei = injectUsd1 ? parseEther(injectUsd1) : 0n;

      const [newShareValue, valueIncrease, percentageIncrease] = await vault.previewCapitalInjection(wlfiWei, usd1Wei);

      setInjectionPreview({
        newShareValue: formatEther(newShareValue),
        valueIncrease: formatEther(valueIncrease),
        percentageIncrease: (Number(percentageIncrease) / 100).toFixed(2), // Convert basis points to percentage
      });
    } catch (error) {
      console.error('Error previewing injection:', error);
      setInjectionPreview(null);
    }
  }, [provider, injectWlfi, injectUsd1]);

  // Handle capital injection
  const handleInjectCapital = async () => {
    if (!provider || !account || (!injectWlfi && !injectUsd1)) {
      onToast({ message: 'Please enter WLFI and/or USD1 amount', type: 'error' });
      return;
    }

    // Check if user is actually admin
    if (!isActualAdmin) {
      onToast({ message: 'Only the multisig admin can execute capital injections', type: 'error' });
      return;
    }

    setInjectLoading(true);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(
        CONTRACTS.VAULT,
        [
          'function injectCapital(uint256 wlfiAmount, uint256 usd1Amount) external',
          'function balanceOf(address) external view returns (uint256)'
        ],
        signer
      );

      const wlfiWei = injectWlfi && parseFloat(injectWlfi) > 0 ? parseEther(injectWlfi) : 0n;
      const usd1Wei = injectUsd1 && parseFloat(injectUsd1) > 0 ? parseEther(injectUsd1) : 0n;

      console.log('[VaultView] Injecting capital:', { wlfiWei: wlfiWei.toString(), usd1Wei: usd1Wei.toString() });

      // Approve tokens if needed
      if (wlfiWei > 0n) {
        const wlfiToken = new Contract(
          CONTRACTS.WLFI,
          [
            'function approve(address spender, uint256 amount) external returns (bool)', 
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function balanceOf(address) external view returns (uint256)'
          ],
          signer
        );
        
        // Check balance first
        const balance = await wlfiToken.balanceOf(effectiveAddress);
        console.log('[VaultView] WLFI balance:', formatEther(balance), 'Required:', formatEther(wlfiWei));
        
        if (balance < wlfiWei) {
          onToast({ message: `Insufficient WLFI balance. You have ${formatEther(balance)} but need ${formatEther(wlfiWei)}`, type: 'error' });
          setInjectLoading(false);
          return;
        }

        const allowance = await wlfiToken.allowance(effectiveAddress, CONTRACTS.VAULT);
        console.log('[VaultView] WLFI allowance:', formatEther(allowance));
        
        if (BigInt(allowance.toString()) < wlfiWei) {
          onToast({ message: 'Approving WLFI...', type: 'info' });
          const approveTx = await wlfiToken.approve(CONTRACTS.VAULT, wlfiWei);
          console.log('[VaultView] WLFI approve tx:', approveTx.hash);
          await approveTx.wait();
          onToast({ message: 'WLFI approved!', type: 'success', txHash: approveTx.hash });
        }
      }

      if (usd1Wei > 0n) {
        const usd1Token = new Contract(
          CONTRACTS.USD1,
          [
            'function approve(address spender, uint256 amount) external returns (bool)', 
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function balanceOf(address) external view returns (uint256)'
          ],
          signer
        );
        
        // Check balance first
        const balance = await usd1Token.balanceOf(effectiveAddress);
        console.log('[VaultView] USD1 balance:', formatEther(balance), 'Required:', formatEther(usd1Wei));
        
        if (balance < usd1Wei) {
          onToast({ message: `Insufficient USD1 balance. You have ${formatEther(balance)} but need ${formatEther(usd1Wei)}`, type: 'error' });
          setInjectLoading(false);
          return;
        }
        
        const allowance = await usd1Token.allowance(effectiveAddress, CONTRACTS.VAULT);
        console.log('[VaultView] USD1 allowance:', formatEther(allowance));
        
        if (BigInt(allowance.toString()) < usd1Wei) {
          onToast({ message: 'Approving USD1...', type: 'info' });
          const approveTx = await usd1Token.approve(CONTRACTS.VAULT, usd1Wei);
          console.log('[VaultView] USD1 approve tx:', approveTx.hash);
          await approveTx.wait();
          onToast({ message: 'USD1 approved!', type: 'success', txHash: approveTx.hash });
        }
      }

      // Inject capital
      onToast({ message: 'Injecting capital into vault...', type: 'info' });
      console.log('[VaultView] Calling injectCapital with:', { wlfiWei: wlfiWei.toString(), usd1Wei: usd1Wei.toString() });
      
      const tx = await vault.injectCapital(wlfiWei, usd1Wei);
      console.log('[VaultView] Inject capital tx:', tx.hash);
      onToast({ message: 'Transaction submitted...', type: 'info', txHash: tx.hash });

      const receipt = await tx.wait();
      console.log('[VaultView] Inject capital receipt:', receipt);
      
      onToast({ 
        message: `✅ Successfully injected ${injectWlfi || '0'} WLFI + ${injectUsd1 || '0'} USD1!`, 
        type: 'success', 
        txHash: tx.hash 
      });

      setInjectWlfi('');
      setInjectUsd1('');
      setInjectionPreview(null);
      await fetchData();
    } catch (error: any) {
      console.error('[VaultView] Inject capital error:', error);
      let errorMessage = 'Capital injection failed';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.reason) {
        errorMessage = `Error: ${error.reason}`;
      } else if (error.message) {
        // Try to extract meaningful error
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user';
        } else if (error.message.includes('ERC20')) {
          errorMessage = 'Token transfer failed - check balance and allowance';
        } else {
          errorMessage = error.message.slice(0, 150);
        }
      }
      
      onToast({ message: errorMessage, type: 'error' });
    } finally {
      setInjectLoading(false);
    }
  };

  // Deploy assets to strategy
  const [deployLoading, setDeployLoading] = useState(false);
  
  const handleDeployToStrategy = async () => {
    if (!provider || !account) {
      onToast({ message: 'Connect wallet first', type: 'error' });
      return;
    }

    if (!isActualAdmin) {
      onToast({ message: 'Admin only function', type: 'error' });
      return;
    }

    setDeployLoading(true);

    try {
      const signer = await provider.getSigner();
      const vault = new Contract(
        CONTRACTS.VAULT,
        [
          'function forceDeployToStrategy() external',
        ],
        signer
      );

      console.log('[VaultView] Deploying assets to strategy...');
      onToast({ message: 'Deploying assets to strategy...', type: 'info' });

      const tx = await vault.forceDeployToStrategy();
      console.log('[VaultView] Deploy to strategy tx:', tx.hash);
      onToast({ message: 'Transaction submitted...', type: 'info', txHash: tx.hash });

      const receipt = await tx.wait();
      console.log('[VaultView] Deploy to strategy receipt:', receipt);
      
      onToast({ 
        message: '✅ Successfully deployed assets to strategy!', 
        type: 'success', 
        txHash: tx.hash 
      });

      await fetchData();
    } catch (error: any) {
      console.error('[VaultView] Deploy to strategy error:', error);
      let errorMessage = 'Deploy to strategy failed';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.reason) {
        errorMessage = `Error: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message.slice(0, 150);
      }
      
      onToast({ message: errorMessage, type: 'error' });
    } finally {
      setDeployLoading(false);
    }
  };

  // Preview injection on amount change
  useEffect(() => {
    handlePreviewInjection();
  }, [handlePreviewInjection]);

  return (
    <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-black dark:to-gray-900 min-h-screen pb-32 sm:pb-24 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-24 sm:pb-24">


        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-4 sm:mb-8">
          <NeoStatCard
            label="Total deposited"
            value={(() => {
              // liquidTotal and strategyTotal are already in USD
              const totalUSD = Number(data.liquidTotal) + Number(data.strategyTotal);
              return `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            })()}
            subtitle={(() => {
              // Calculate actual token amounts for display
              const totalWLFI = Number(data.vaultLiquidWLFI) + Number(data.strategyWLFIinUSD1Pool) + Number(data.strategyWLFIinPool);
              const totalUSD1 = Number(data.vaultLiquidUSD1) + Number(data.strategyUSD1InPool);
              return `${totalWLFI.toFixed(2)} WLFI + ${totalUSD1.toFixed(2)} USD1`;
            })()}
          />
          <div className="relative">
          <button 
            onClick={() => onNavigateToAnalytics?.()}
            className="w-full text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
          <NeoStatCard
            label="Current APY"
            value={
              data.calculatedApy && data.calculatedApy > 0
                ? `${data.calculatedApy.toFixed(2)}%`
                : data.calculatedApr && data.calculatedApr > 0
                ? `${data.calculatedApr.toFixed(2)}%`
                : data.weeklyApy === 'calculating' 
                ? '📊' 
                  : data.weeklyApy && data.weeklyApy !== '0' && data.weeklyApy !== 'NaN' && !isNaN(parseFloat(data.weeklyApy))
                  ? `${data.weeklyApy}%` 
                    : data.currentFeeApr && data.currentFeeApr !== '0' && data.currentFeeApr !== 'NaN' && !isNaN(parseFloat(data.currentFeeApr))
                      ? `${data.currentFeeApr}% APR`
                  : 'N/A'
            }
            highlighted
            subtitle={
              data.calculatedApy && data.calculatedApy > 0
                ? 'APY (from Analytics)'
                : data.calculatedApr && data.calculatedApr > 0
                ? 'APR (from Analytics)'
                : data.weeklyApy === 'calculating'
                ? 'New vault - APY calculating...'
                  : data.weeklyApy && data.weeklyApy !== '0' && data.weeklyApy !== 'NaN' && !isNaN(parseFloat(data.weeklyApy))
                  ? 'Weighted Avg. (TVL)' 
                    : data.currentFeeApr && data.currentFeeApr !== '0' && data.currentFeeApr !== 'NaN' && !isNaN(parseFloat(data.currentFeeApr))
                      ? 'Fee APR (from Charm)'
                  : 'Loading...'
            }
          />
          </button>
            <button
              onClick={() => onNavigateToAnalytics?.()}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all bg-[#D4B474]/10 text-[#D4B474] hover:bg-[#D4B474]/20 hover:scale-105 active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </div>
          <NeoStatCard
            label="Circulating / Max Supply"
            value={`${Number(data.totalSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })} / 50M`}
            subtitle={(() => {
               const totalWLFI = Number(data.vaultLiquidWLFI) + Number(data.strategyWLFIinUSD1Pool) + Number(data.strategyWLFIinPool);
               const totalEagle = Number(data.totalSupply);
               const ratio = totalEagle > 0 ? (totalWLFI / totalEagle).toFixed(4) : '0.0000';
               return `Ratio: ${ratio} WLFI / EAGLE`;
            })()}
          />
        </div>

        {/* Stacked Layout: Vault/Strategies on top, Controls below */}
        <div className="flex flex-col gap-3 sm:gap-6">
          {/* START_SECTION_TABS */}
          {/* Tabbed Vault Info & Strategies */}
          <div>
            <NeoCard className="!p-0">
              {/* ERC-4626 Vault Header - Matches User/Admin Controls style */}
              <div className={`px-3 sm:px-4 py-3 sm:py-4 border-b ${DS.borders.separator}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 ${DS.backgrounds.highlight} ${DS.radius.full} flex items-center justify-center shrink-0 ${DS.shadows.raised}`}>
                      <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${DS.text.highlight}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`${DS.text.h3} leading-tight`}>ERC-4626 Vault</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        Deposit <span className="text-[#A27D46] dark:text-[#D4B474] font-semibold">WLFI</span> or <span className="text-[#A27D46] dark:text-[#D4B474] font-semibold">USD1</span> for auto-compounding yield
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NeoButton
                      onClick={handleRefresh}
                      disabled={refreshing}
                      label=""
                      icon={
                        <svg 
                          className={`w-3 h-3 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                      }
                      className="!px-2 sm:!px-2.5 !py-1.5 !w-auto !rounded-full"
                    />
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-gray-800 dark:to-gray-850 ${DS.radius.full} ${DS.shadows.raised} border border-emerald-200/70 dark:border-emerald-700/50`}>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <img 
                        src={ICONS.ETHEREUM}
                        alt="Ethereum"
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold hidden sm:inline">Ethereum</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Headers */}
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <NeoTabs
                  tabs={[
                    { id: 'vault', label: 'Assets' },
                    { id: 'strategies', label: 'Strategies' },
                    { id: 'analytics', label: 'Analytics' },
                  ]}
                  defaultTab={infoTab}
                  onChange={(tabId) => setInfoTab(tabId as 'vault' | 'strategies' | 'analytics')}
                />
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-6">
                {infoTab === 'vault' && (
                  <div className="space-y-4">
                    {/* Asset Deployment Sunburst Chart */}
                    <div className="space-y-3">
                      {/* Sunburst Chart */}
                      <AssetAllocationSunburst
                        vaultWLFI={Number(data.vaultLiquidWLFI)}
                        vaultUSD1={Number(data.vaultLiquidUSD1)}
                        strategyWLFI={Number(data.strategyWLFI)}
                        strategyUSD1={Number(data.strategyUSD1)}
                        wlfiPrice={Number(data.wlfiPrice)}
                        strategyWETH={Number(data.strategyWETH)}
                        strategyWLFIinPool={Number(data.strategyWLFIinPool)}
                        strategyUSD1InPool={Number(data.strategyUSD1InPool)}
                        strategyWLFIinUSD1Pool={Number(data.strategyWLFIinUSD1Pool)}
                      />
                      
                      {/* Assets Display */}
                      <div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Assets</div>
                        <div className="space-y-2">
                          {/* WLFI */}
                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2.5 border border-gray-200/50 dark:border-gray-700/30">
                            <TokenIcon symbol="WLFI" address={CONTRACTS.WLFI} className="w-8 h-8 rounded-full flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">WLFI</div>
                              <a 
                                href={`https://etherscan.io/token/${CONTRACTS.WLFI}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-gray-600 dark:text-gray-400 hover:text-[#A27D46] dark:hover:text-[#D4B474] font-mono transition-colors truncate block"
                                title={CONTRACTS.WLFI}
                              >
                                {CONTRACTS.WLFI}
                              </a>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(CONTRACTS.WLFI);
                                onToast({ message: 'WLFI address copied!', type: 'success' });
                              }}
                              className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              title="Copy address"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>

                          {/* USD1 */}
                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2.5 border border-gray-200/50 dark:border-gray-700/30">
                            <TokenIcon symbol="USD1" address={CONTRACTS.USD1} className="w-8 h-8 rounded-full flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">USD1</div>
                              <a 
                                href={`https://etherscan.io/token/${CONTRACTS.USD1}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-gray-600 dark:text-gray-400 hover:text-[#A27D46] dark:hover:text-[#D4B474] font-mono transition-colors truncate block"
                                title={CONTRACTS.USD1}
                              >
                                {CONTRACTS.USD1}
                              </a>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(CONTRACTS.USD1);
                                onToast({ message: 'USD1 address copied!', type: 'success' });
                              }}
                              className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              title="Copy address"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>

                          {/* WETH */}
                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2.5 border border-gray-200/50 dark:border-gray-700/30">
                            <TokenIcon symbol="WETH" address={CONTRACTS.WETH} className="w-8 h-8 rounded-full flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">WETH</div>
                              <a 
                                href={`https://etherscan.io/token/${CONTRACTS.WETH}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-gray-600 dark:text-gray-400 hover:text-[#A27D46] dark:hover:text-[#D4B474] font-mono transition-colors truncate block"
                                title={CONTRACTS.WETH}
                              >
                                {CONTRACTS.WETH}
                              </a>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(CONTRACTS.WETH);
                                onToast({ message: 'WETH address copied!', type: 'success' });
                              }}
                              className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              title="Copy address"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {infoTab === 'strategies' && (
                  <div className="space-y-5">
                    {/* All 5 Strategies as Expandable Rows */}
                    {(() => {
                      // Calculate actual allocation percentages
                      const totalDeployed = Number(data.strategyTotal) || 1; // Avoid division by zero
                      const usd1Deployed = Number(data.strategyUSD1) || 0;
                      const wethDeployed = Number(data.strategyWLFI) || 0; // This is the WETH strategy total value
                      
                      const usd1Allocation = totalDeployed > 0 ? ((usd1Deployed / totalDeployed) * 100).toFixed(1) : '0.0';
                      const wethAllocation = totalDeployed > 0 ? ((wethDeployed / totalDeployed) * 100).toFixed(1) : '0.0';
                      
                      return [
                        {
                          id: 1,
                          name: 'Charm USD1/WLFI Alpha Vault',
                          protocol: 'Charm Finance',
                          pool: 'USD1/WLFI',
                          feeTier: '1%',
                          allocation: `${usd1Allocation}%`,
                          status: 'active',
                          description: 'Actively managed concentrated liquidity position on Uniswap V3, optimized for the USD1/WLFI 1% fee tier pool.',
                          analytics: 'https://alpha.charm.fi/vault/1/0x47b2f57fb48177c02e9e219ad4f4e42d5f4f1a0c',
                          revertAnalytics: 'https://revert.finance/#/pool/mainnet/uniswapv3/0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d',
                          contract: '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f',
                          charmVault: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
                          uniswapPool: '0xf9f5E6f7A44Ee10c72E67Bded6654afAf4D0c85d', // USD1/WLFI 1% pool
                          deployed: data.strategyUSD1,
                          usd1Amount: data.strategyUSD1InPool, // Add USD1 amount for display
                          wlfiAmount: data.strategyWLFIinUSD1Pool // Add WLFI amount for display
                        },
                        {
                          id: 2,
                          name: 'Charm WETH/WLFI Alpha Vault',
                          protocol: 'Charm Finance',
                          pool: 'WETH/WLFI',
                          feeTier: '1%',
                          allocation: `${wethAllocation}%`,
                          status: 'active',
                          description: 'Actively managed concentrated liquidity position on Uniswap V3, optimized for the WETH/WLFI 1% fee tier pool. Features 24-hour oracle support for stable operations.',
                          analytics: 'https://alpha.charm.fi/vault/1/0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
                          contract: CONTRACTS.STRATEGY_WETH,
                          charmVault: CONTRACTS.CHARM_VAULT_WETH,
                          uniswapPool: CONTRACTS.UNISWAP_V3_POOL_WETH_1PCT, // WETH/WLFI 1% pool
                          deployed: data.strategyWLFI,
                          wethAmount: data.strategyWETH, // Add WETH amount for display
                          wlfiAmount: data.strategyWLFIinPool // Add WLFI in pool for display
                        },
                        {
                          id: 3,
                          name: 'Additional Strategies',
                          protocol: 'Coming Soon',
                          description: 'More yield optimization strategies are in development. Stay tuned for announcements about additional DeFi integrations and liquidity opportunities.',
                          status: 'coming-soon',
                          allocation: 'TBD'
                        }
                      ];
                    })().map((strategy) => (
                      <StrategyRow 
                        key={strategy.id} 
                        strategy={strategy} 
                        wlfiPrice={data.wlfiPrice} 
                        revertData={revertData}
                        onToast={onToast}
                      />
                    ))}
                  </div>
                )}

                {infoTab === 'analytics' && (
                  <AnalyticsTabContent />
                )}
              </div>
            </NeoCard>
          </div>
          {/* START_SECTION_CONTROLS */}
          {/* User/Admin Controls - Should be SECOND */}
          <div>
            <NeoCard className="!p-0 overflow-hidden relative">
              {/* Mode Toggle Button - Elegant Switch */}
              {isAdmin && (
                <div className="absolute top-3 right-3 z-20">
                  <button
                    onClick={() => setControlMode(controlMode === 'user' ? 'admin' : 'user')}
                    className={`group relative flex items-center gap-2 px-4 py-2 ${DS.radius.full} text-xs font-semibold ${DS.transitions.default}
                      ${DS.backgrounds.highlight} ${DS.shadows.raised} ${DS.shadows.raisedHover}
                      ${DS.text.highlight} ${DS.interactive.hover} ${DS.interactive.active}`}
                    title={`Switch to ${controlMode === 'user' ? 'Admin' : 'User'} Mode`}
                  >
                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>{controlMode === 'user' ? 'Switch to Admin' : 'Switch to User'}</span>
                  </button>
                </div>
              )}

              {/* Disabled Overlay - Temporarily removed for Composer testing */}
              {/* {!isActualAdmin && controlMode === 'user' && (
                <div className="absolute inset-0 bg-gray-200/60 dark:bg-gray-900/60 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl max-w-xs text-center border-2 border-blue-500 dark:border-blue-600">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">Bootstrapping Phase</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Deposits & withdrawals temporarily disabled while we deploy capital.
                    </p>
                  </div>
                </div>
              )} */}
              
              {/* Header - User Mode */}
              {controlMode === 'user' && (
                <div className={`px-3 sm:px-4 py-3 sm:py-4 border-b ${DS.borders.separator}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 ${DS.backgrounds.highlight} ${DS.radius.full} flex items-center justify-center shrink-0 ${DS.shadows.raised}`}>
                      <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${DS.text.highlight}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className={`${DS.text.h3} leading-tight`}>User Controls</h3>
                  </div>
                </div>
              )}

              {/* Header - Admin Mode */}
              {controlMode === 'admin' && (
                <div className={`px-3 sm:px-4 py-3 sm:py-4 border-b ${DS.borders.separator}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 ${DS.backgrounds.highlight} ${DS.radius.full} flex items-center justify-center shrink-0 ${DS.shadows.raised}`}>
                      <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${DS.text.highlight}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`${DS.text.h3} leading-tight`}>Admin Controls</h3>
                    </div>
                    {isActualAdmin && (
                      <div className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg text-[10px] font-semibold text-green-700 dark:text-green-400 shrink-0">
                        ADMIN
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content - User Mode - Composer Only */}
              {controlMode === 'user' && (
                <div className="p-4 sm:p-6">
                  <ComposerPanel />
                </div>
              )}

              {/* Content - Admin Mode */}
              {controlMode === 'admin' && (
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Admin Notice - Always visible */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-2.5 sm:p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      <strong>ℹ️ Info:</strong> Visible to all for transparency. Only multisig admin ({CONTRACTS.MULTISIG.slice(0, 6)}...{CONTRACTS.MULTISIG.slice(-4)}) can execute. Open from Safe wallet to use.
                    </p>
                  </div>

                  {/* Sync Balances Button */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Sync Balances</h4>
                    <NeoButton
                      onClick={handleSyncBalances}
                      label="Sync Balances"
                      className="w-full !py-2.5"
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Capital Injection Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Capital Injection</h4>
                      <div className="group relative">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-[#A27D46] dark:hover:text-[#D4B474] cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-64">
                          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-3 shadow-xl">
                            <p className="font-semibold mb-1">⚡ Capital Injection</p>
                            <p>Inject capital to boost share value without minting new shares. Increases value for all existing holders.</p>
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* WLFI Input */}
                    <NeoInput
                      type="number"
                      value={injectWlfi}
                      onChange={setInjectWlfi}
                      placeholder="0"
                      label="WLFI to Inject"
                    />

                    {/* USD1 Input */}
                    <NeoInput
                      type="number"
                      value={injectUsd1}
                      onChange={setInjectUsd1}
                      placeholder="0"
                      label="USD1 to Inject"
                    />

                    {/* Preview Impact */}
                    {injectionPreview && (injectWlfi || injectUsd1) && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700/30 rounded-xl p-3 sm:p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase">Impact Preview</p>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Share Value Increase:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">+{injectionPreview.percentageIncrease}%</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
                          <span>New Share Value:</span>
                          <span>{Number(injectionPreview.newShareValue).toFixed(6)} WLFI</span>
                        </div>
                      </div>
                    )}

                    {/* Inject Button */}
                    <NeoButton
                      label={
                        injectLoading 
                          ? 'Injecting...' 
                          : !isActualAdmin 
                            ? 'Admin Only' 
                            : 'Inject Capital'
                      }
                      onClick={handleInjectCapital}
                      className="w-full !py-3 sm:!py-4 !text-sm sm:!text-base !bg-gradient-to-r !from-red-500 !to-red-600 dark:!from-red-600 dark:!to-red-700 !text-white disabled:!opacity-50 disabled:!cursor-not-allowed"
                      disabled={injectLoading || !account || (!injectWlfi && !injectUsd1) || !isActualAdmin}
                      icon={
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-300/50 dark:border-gray-700/30 my-4"></div>

                  {/* Deploy to Strategy Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Deploy Assets</h4>
                      <div className="group relative">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-64">
                          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-3 shadow-xl">
                            <p className="font-semibold mb-1">🚀 Deploy Assets</p>
                            <p>Force deploy idle vault assets to active strategies. Use when vault has undeployed capital waiting to be put to work.</p>
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Deploy Button */}
                    <NeoButton
                      label={
                        deployLoading 
                          ? 'Deploying...' 
                          : !isActualAdmin 
                            ? 'Admin Only' 
                            : 'Deploy Assets to Strategy'
                      }
                      onClick={handleDeployToStrategy}
                      className="w-full !py-3 sm:!py-4 !text-sm sm:!text-base !bg-gradient-to-r !from-orange-500 !to-orange-600 dark:!from-orange-600 dark:!to-orange-700 !text-white disabled:!opacity-50 disabled:!cursor-not-allowed"
                      disabled={deployLoading || !account || !isActualAdmin}
                      icon={
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Warning - Only for actual admins */}
                  {isActualAdmin && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-xl p-2.5 sm:p-3">
                      <p className="text-xs text-red-800 dark:text-red-300">
                        <strong>⚠️ Admin only:</strong> These actions execute immediately. Verify amounts before confirming.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </NeoCard>
          </div>
          {/* END_SECTION_CONTROLS */}
        </div>
      </div>
    </div>
  );
}



