import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BrowserProvider } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { NeoButton, NeoCard, NeoStatCard } from '../components/neumorphic';
import { ICONS } from '../config/icons';

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onNavigateUp?: () => void;
}

export default function Analytics({ provider, account, onNavigateUp }: Props) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    currentFeeApr: null as string | null,
    weeklyApy: null as string | null,
    monthlyApy: null as string | null,
    inceptionApy: null as string | null,
    netApy: null as string | null,
    historicalSnapshots: [] as Array<{ timestamp: number; feeApr: string; totalValue: number }>,
  });

  // Fetch Charm Finance historical data
  const fetchCharmStats = useCallback(async () => {
    try {
      setLoading(true);
      const query = `query GetVault($address: ID!) { vault(id: $address) { snapshot(orderBy: timestamp, orderDirection: asc, first: 1000) { timestamp feeApr annualVsHoldPerfSince totalAmount0 totalAmount1 totalSupply } } }`;
      const response = await fetch('https://stitching-v2.herokuapp.com/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { address: CONTRACTS.CHARM_VAULT.toLowerCase() } })
      });
      const result = await response.json();
      
      if (result.data?.vault?.snapshot && result.data.vault.snapshot.length > 0) {
        const snapshots = result.data.vault.snapshot;
        const current = snapshots[snapshots.length - 1];
        
        // Use ONLY real data from Charm's API
        const currentFeeApr = current?.feeApr ? (parseFloat(current.feeApr) * 100).toFixed(2) : null;
        const annualVsHoldPerf = current?.annualVsHoldPerfSince ? (parseFloat(current.annualVsHoldPerfSince) * 100).toFixed(2) : null;
        
        // Calculate time-weighted APYs from historical data
        const now = Date.now() / 1000;
        const oneWeekAgo = now - (7 * 24 * 60 * 60);
        const oneMonthAgo = now - (30 * 24 * 60 * 60);
        
        const weeklySnapshots = snapshots.filter((s: any) => parseInt(s.timestamp) >= oneWeekAgo);
        const monthlySnapshots = snapshots.filter((s: any) => parseInt(s.timestamp) >= oneMonthAgo);
        
        const weeklyApy = weeklySnapshots.length > 0 
          ? (weeklySnapshots.reduce((sum: number, s: any) => sum + parseFloat(s.annualVsHoldPerfSince || '0'), 0) / weeklySnapshots.length * 100).toFixed(2)
          : null;
          
        const monthlyApy = monthlySnapshots.length > 0
          ? (monthlySnapshots.reduce((sum: number, s: any) => sum + parseFloat(s.annualVsHoldPerfSince || '0'), 0) / monthlySnapshots.length * 100).toFixed(2)
          : null;
        
        // Inception APY is the average since inception
        const inceptionApy = snapshots.length > 0
          ? (snapshots.reduce((sum: number, s: any) => sum + parseFloat(s.annualVsHoldPerfSince || '0'), 0) / snapshots.length * 100).toFixed(2)
          : null;
        
        // Net APY accounts for Eagle's fees (conservative estimate)
        const netApy = weeklyApy ? Math.max(0, parseFloat(weeklyApy) * 0.923).toFixed(2) : null; // 7.7% reduction
        
        const historicalSnapshots = snapshots.map((s: any) => ({
          timestamp: parseInt(s.timestamp),
          feeApr: (parseFloat(s.feeApr || '0') * 100).toFixed(2),
          totalValue: parseFloat(s.totalAmount0 || '0') + parseFloat(s.totalAmount1 || '0')
        }));

        setStats({
          currentFeeApr,
          weeklyApy,
          monthlyApy,
          inceptionApy,
          netApy,
          historicalSnapshots,
        });
      }
    } catch (error) {
      console.error('Error fetching Charm stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (provider) {
      fetchCharmStats();
    }
  }, [provider, fetchCharmStats]);

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
            <p className="text-sm text-gray-600">Yield performance and earnings data</p>
          </div>
          <NeoButton
            onClick={fetchCharmStats}
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

        {/* APY Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <NeoStatCard
            label="Weekly APY"
            value={stats.weeklyApy ? `${stats.weeklyApy}%` : 'N/A'}
            subtitle={stats.weeklyApy ? 'Real-time data' : 'No data yet'}
          />
          <NeoStatCard
            label="Monthly APY"
            value={stats.monthlyApy ? `${stats.monthlyApy}%` : 'N/A'}
            subtitle={stats.monthlyApy ? 'Real-time data' : 'No data yet'}
          />
          <NeoStatCard
            label="Inception APY"
            value={stats.inceptionApy ? `${stats.inceptionApy}%` : 'N/A'}
            subtitle={stats.inceptionApy ? 'Since deployment' : 'No data yet'}
          />
          <NeoStatCard
            label="Net APY"
            value={stats.netApy ? `${stats.netApy}%` : 'N/A'}
            highlighted
            subtitle="After fees"
          />
        </div>

        {/* Cumulative Earnings Chart */}
        <NeoCard className="mb-8">
          <div className="p-6">
            <h3 className="text-gray-900 font-bold text-xl mb-4">Cumulative Earnings</h3>
            <div className="bg-white/30 border border-gray-300 rounded-xl p-6 h-64">
              {stats.historicalSnapshots.length > 0 ? (
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="earnings-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ca8a04" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#eab308" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Area under curve */}
                  <polygon
                    points={`0,30 ${stats.historicalSnapshots.map((_, i) => {
                      const x = (i / (stats.historicalSnapshots.length - 1)) * 100;
                      const y = 30 - (parseFloat(stats.historicalSnapshots[i].feeApr) / 5) * 30;
                      return `${x},${y}`;
                    }).join(' ')} 100,30`}
                    fill="url(#area-gradient)"
                  />
                  
                  {/* Line */}
                  <polyline
                    points={stats.historicalSnapshots.map((snap, i) => {
                      const x = (i / (stats.historicalSnapshots.length - 1)) * 100;
                      const y = 30 - (parseFloat(snap.feeApr) / 5) * 30;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="url(#earnings-gradient)"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600">
                    {loading ? 'Loading earnings data...' : 'No data available yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </NeoCard>

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
                <h4 className="text-gray-700 font-semibold mb-4">Strategy Information</h4>
                <div className="space-y-3">
                  <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">Active Strategy</div>
                    <p className="text-gray-900 font-bold">Charm USD1/WLFI Alpha Vault</p>
                    <p className="text-xs text-gray-600 mt-1">Uniswap V3 Concentrated Liquidity</p>
                  </div>
                  
                  <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">Pool Composition</div>
                    <p className="text-gray-900 font-bold">USD1/WLFI</p>
                    <p className="text-xs text-gray-600 mt-1">1% Fee Tier (10000)</p>
                  </div>
                  
                  <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">Rebalancing</div>
                    <p className="text-gray-900 font-bold">Automatic</p>
                    <p className="text-xs text-gray-600 mt-1">Matches Charm's ratio before deposit</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Source */}
            <div className="mt-6 pt-6 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Data Source:</span> Charm Finance Subgraph
              </p>
              <a 
                href={`https://alpha.charm.fi/vault/${CONTRACTS.CHARM_VAULT}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-amber-700 hover:text-amber-800 font-medium mt-2 inline-flex items-center gap-1"
              >
                View on Charm Finance
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </NeoCard>

        {/* Contract Addresses */}
        <NeoCard className="mt-8">
          <div className="p-6">
            <h3 className="text-gray-900 font-bold text-xl mb-6">Contract Addresses</h3>
            
            <div className="space-y-4">
              {/* Uniswap V3 Pool */}
              <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">
                  Uniswap V3 LP 1% Fee Tier USD1/WLFI
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-gray-900 font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg flex-1 break-all">
                    {CONTRACTS.UNISWAP_V3_POOL}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(CONTRACTS.UNISWAP_V3_POOL)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <a
                    href={`https://etherscan.io/address/${CONTRACTS.UNISWAP_V3_POOL}`}
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

              {/* Charm Vault */}
              <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">
                  Charm Vault Contract
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-gray-900 font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg flex-1 break-all">
                    {CONTRACTS.CHARM_VAULT}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(CONTRACTS.CHARM_VAULT)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <a
                    href={`https://etherscan.io/address/${CONTRACTS.CHARM_VAULT}`}
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

              {/* Strategy Contract */}
              <div className="bg-white/50 shadow-neo-inset rounded-xl p-4">
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">
                  Strategy Contract
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-gray-900 font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg flex-1 break-all">
                    {CONTRACTS.STRATEGY}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(CONTRACTS.STRATEGY)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <a
                    href={`https://etherscan.io/address/${CONTRACTS.STRATEGY}`}
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
            </div>
          </div>
        </NeoCard>
      </div>
    </div>
  );
}

