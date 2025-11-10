import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { ICONS } from '../config/icons';
import { getActiveStrategies } from '../config/strategies';
import { ErrorBoundary } from './ErrorBoundary';
import AssetAllocationSunburst from './AssetAllocationSunburst';
import { NeoTabs, NeoButton, NeoInput, NeoStatCard, NeoCard, NeoStatusIndicator } from './neumorphic';
import { UniswapBadge, CharmBadge, LayerZeroBadge } from './tech-stack';
import { DESIGN_SYSTEM as DS } from '../styles/design-system';
import { useRevertFinanceData } from '../hooks/useRevertFinanceData';
import { useSafeApp } from '../hooks/useSafeApp';

// Lazy load 3D visualization
const VaultVisualization = lazy(() => import('./VaultVisualization'));

// Strategy Row Component with Dropdown
function StrategyRow({ strategy, wlfiPrice, revertData }: { strategy: any; wlfiPrice?: string; revertData?: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`
      group relative rounded-2xl overflow-hidden transition-all duration-300
      ${strategy.status === 'active' 
        ? 'bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-black border border-yellow-400/40 dark:border-yellow-500/30 shadow-neo-raised dark:shadow-[0_4px_20px_rgba(234,179,8,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-yellow-500/60 dark:hover:border-yellow-500/40 hover:shadow-neo-raised-lift dark:hover:shadow-[0_8px_30px_rgba(234,179,8,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]' 
        : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:via-zinc-900 dark:to-black border border-gray-300/50 dark:border-zinc-700/50 shadow-neo-raised dark:shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-gray-400/70 dark:hover:border-zinc-600'
      }
    `}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 transition-all duration-300 hover:bg-gray-100/50 dark:hover:bg-white/5"
      >
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 lg:gap-6">
          {/* Strategy Number Badge */}
          <div className={`
            px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider shrink-0
            ${strategy.status === 'active'
              ? 'bg-gradient-to-br from-yellow-500 via-yellow-400 to-yellow-600 dark:from-yellow-600 dark:via-yellow-500 dark:to-amber-600 text-gray-900 dark:text-white shadow-neo-raised dark:shadow-[0_2px_8px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]'
              : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 text-gray-700 dark:text-zinc-400 border border-gray-400/50 dark:border-zinc-600/30 shadow-neo-inset dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
            }
          `}>
            #{strategy.id}
          </div>
          
          {/* Status Indicator */}
          {strategy.status === 'active' ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <span className="text-xs text-green-400 font-medium uppercase tracking-wide">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</span>
            </div>
          )}
          
          {/* Protocol Logos & Info - NEW */}
          {strategy.id === 1 && strategy.status === 'active' && (
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Logos */}
              <div className="flex items-center -space-x-1 sm:-space-x-2 shrink-0">
                <UniswapBadge className="!w-6 !h-6 sm:!w-8 sm:!h-8 ring-2 ring-white dark:ring-zinc-800" />
                <CharmBadge className="!w-6 !h-6 sm:!w-8 sm:!h-8 ring-2 ring-white dark:ring-zinc-800" />
              </div>
              
              {/* Pool Info */}
              <div className="text-left min-w-0">
                <h4 className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                  Uniswap V3 LP
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
                  USD1/WLFI • 1% Fee
                </p>
              </div>
            </div>
          )}

          {/* Fallback for other strategies */}
          {(strategy.id !== 1 || strategy.status !== 'active') && (
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg mb-0.5 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors truncate">
                {strategy.name}
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{strategy.protocol}</p>
            </div>
          )}
          
          {/* POOL ANALYTICS - Comprehensive */}
          {strategy.id === 1 && strategy.status === 'active' && !revertData.loading && (
            <div className="flex-1 min-w-0 max-w-2xl">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-xl p-3 border border-gray-200/50 dark:border-zinc-700/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pool Analytics
                  </div>
                  <div className="text-[9px] text-gray-500 dark:text-gray-600">Last 7 days</div>
                </div>
                {revertData.error ? (
                  <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-600">
                    Pool data temporarily unavailable
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 border border-white/50 dark:border-white/5">
                        <div className="text-[9px] text-gray-500 dark:text-gray-600 mb-0.5 uppercase tracking-wide">TVL</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          ${revertData.tvl.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 border border-white/50 dark:border-white/5">
                        <div className="text-[9px] text-gray-500 dark:text-gray-600 mb-0.5 uppercase tracking-wide">7d Avg APR</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {revertData.avgAPR.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 border border-white/50 dark:border-white/5">
                        <div className="text-[9px] text-gray-500 dark:text-gray-600 mb-0.5 uppercase tracking-wide">Max APR</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {revertData.maxAPR.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 border border-white/50 dark:border-white/5">
                        <div className="text-[9px] text-gray-500 dark:text-gray-600 mb-0.5 uppercase tracking-wide">Avg Vol</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          ${revertData.avgVolume.toFixed(0)}/day
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-gray-500 dark:text-gray-600 mt-2 text-center">
                      via Revert Finance
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Loading/Error State */}
          {strategy.id === 1 && strategy.status === 'active' && (revertData.loading || revertData.error) && (
            <div className="text-right shrink-0">
              <div className="text-xs text-gray-500 dark:text-gray-600">
                {revertData.loading ? 'Loading analytics...' : 'Analytics unavailable'}
              </div>
            </div>
          )}
          
          {/* Allocation */}
          {strategy.allocation && (
            <div className="text-right shrink-0 mr-4">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{strategy.allocation}</div>
              <div className="text-xs text-gray-600 dark:text-gray-500 uppercase tracking-wider">Allocated</div>
            </div>
          )}
          
          {/* Expand Arrow */}
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0
            bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 
            border border-gray-300/50 dark:border-zinc-600/30 shadow-neo-inset dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)]
            group-hover:border-gray-400/70 dark:group-hover:border-zinc-500/50 group-hover:shadow-neo-pressed dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.4)]
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            <svg 
              className="w-5 h-5 text-gray-600 dark:text-zinc-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-8 pb-6 pt-4 border-t border-gray-300/50 dark:border-zinc-700/50 bg-gradient-to-b from-gray-50/60 to-gray-100/80 dark:from-black/40 dark:to-black/60 animate-fadeIn">
          {/* 3D Visualization for Strategy 1 */}
          {strategy.id === 1 && wlfiPrice && (
            <div className="mb-6">
              <ErrorBoundary fallback={
                <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg p-4 text-center">
                  <p className="text-xs text-orange-700 dark:text-orange-400">3D visualization unavailable</p>
                </div>
              }>
                <Suspense fallback={
                  <div className="bg-white/30 dark:bg-gray-800/30 rounded-lg p-6 flex items-center justify-center h-64">
                    <div className="text-center">
                      <svg className="animate-spin w-8 h-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24">
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
          
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{strategy.description}</p>
          
          {strategy.status === 'active' && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {strategy.pool && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pool</div>
                    <div className="text-gray-900 dark:text-white font-medium">{strategy.pool}</div>
                  </div>
                )}
                {strategy.feeTier && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fee Tier</div>
                    <div className="text-gray-900 dark:text-white font-medium">{strategy.feeTier}</div>
                  </div>
                )}
              </div>

              {/* Analytics Links */}
              <div className="flex flex-col gap-2 mb-4">
                {strategy.analytics && (
                  <a 
                    href={strategy.analytics} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 font-medium text-sm inline-flex items-center gap-2 transition-colors"
                  >
                    View Analytics on Charm Finance
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                
                {strategy.revertAnalytics && (
                  <a 
                    href={strategy.revertAnalytics} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm inline-flex items-center gap-2 transition-colors"
                  >
                    View Pool Analytics on Revert Finance
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>

              {strategy.contract && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/50 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Strategy Contract</span>
                    <a 
                      href={`https://etherscan.io/address/${strategy.contract}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
                    >
                      <code className="text-xs font-mono break-all">
                        {strategy.contract}
                      </code>
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
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
}

export default function VaultView({ provider, account, onToast, onNavigateUp, onNavigateToWrapper }: Props) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [infoTab, setInfoTab] = useState<'vault' | 'strategies'>('vault');
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [controlMode, setControlMode] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  
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
  
  // Debug: Log revert data state
  useEffect(() => {
    console.log('[VaultView] Revert Finance Data:', revertData);
  }, [revertData]);

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
    liquidTotal: '0',
    strategyTotal: '0',
    currentFeeApr: '0',
    weeklyApy: '0' as string,
    monthlyApy: '0' as string,
    historicalSnapshots: [] as Array<{ timestamp: number; feeApr: string; totalValue: number }>,
  });

  // Scroll parent container to top on mount
  useEffect(() => {
    const vaultFloor = document.getElementById('vault-floor');
    if (vaultFloor) {
      vaultFloor.scrollTop = 0;
    }
  }, []);

  // Fetch Charm Finance historical data
  const fetchCharmStats = useCallback(async () => {
    try {
      const query = `query GetVault($address: ID!) { vault(id: $address) { snapshot(orderBy: timestamp, orderDirection: desc, first: 100) { timestamp feeApr annualVsHoldPerfSince totalAmount0 totalAmount1 totalSupply } } }`;
      const response = await fetch('https://stitching-v2.herokuapp.com/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { address: CONTRACTS.CHARM_VAULT.toLowerCase() } })
      });
      const result = await response.json();
      if (result.data?.vault?.snapshot) {
        const snapshots = result.data.vault.snapshot;
        const current = snapshots[0]; // Most recent snapshot (desc order)
        
        // Check if we have valid APY data
        const hasApyData = current?.annualVsHoldPerfSince !== null && current?.annualVsHoldPerfSince !== undefined;
        const hasFeeApr = current?.feeApr !== null && current?.feeApr !== undefined;
        
        let weeklyApy = '0';
        let monthlyApy = '0';
        let currentFeeApr = '0';
        
        if (hasApyData) {
          weeklyApy = (parseFloat(current.annualVsHoldPerfSince) * 100).toFixed(2);
          monthlyApy = weeklyApy;
        } else {
          // Vault is new - estimate based on 1% fee tier and typical daily volume
          // Conservative estimate: 0.5-2% APY for new concentrated liquidity positions
          weeklyApy = 'calculating';
          monthlyApy = 'calculating';
        }
        
        if (hasFeeApr) {
          currentFeeApr = (parseFloat(current.feeApr) * 100).toFixed(2);
        }
        
        const historicalSnapshots = snapshots.map((s: any) => ({ 
          timestamp: parseInt(s.timestamp), 
          feeApr: s.feeApr ? (parseFloat(s.feeApr) * 100).toFixed(2) : '0', 
          totalValue: parseFloat(s.totalAmount0 || '0') + parseFloat(s.totalAmount1 || '0') 
        }));
        
        return { currentFeeApr, weeklyApy, monthlyApy, historicalSnapshots };
      }
    } catch (error) {
      console.error('Error fetching Charm stats:', error);
    }
    return null;
  }, []);

  const fetchData = useCallback(async () => {
    if (!provider) return;

    try {
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
      const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, provider);
      const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, provider);
      
      const charmStatsPromise = fetchCharmStats();

      const [totalAssets, totalSupply, wlfiPrice, usd1Price] = await Promise.all([
        vault.totalAssets(),
        vault.totalSupply(),
        vault.getWLFIPrice(),
        vault.getUSD1Price(),
      ]);

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
      
      // Get strategy balances from getTotalAmounts() which accounts for Charm LP position
      try {
        const strategy = new Contract(
          CONTRACTS.STRATEGY,
          ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
          provider
        );
        const [strategyWlfiBal, strategyUsd1Bal] = await strategy.getTotalAmounts();
        strategyWLFI = formatEther(strategyWlfiBal);
        strategyUSD1 = formatEther(strategyUsd1Bal);
      } catch (error) {
        console.error('Error fetching strategy balances:', error);
        strategyWLFI = '0';
        strategyUSD1 = '0';
      }

      const liquidTotal = (Number(vaultLiquidWLFI) + Number(vaultLiquidUSD1)).toFixed(2);
      const strategyTotal = (Number(strategyWLFI) + Number(strategyUSD1)).toFixed(2);

      const charmStats = await charmStatsPromise;

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

      setData(prev => ({
        ...prev,
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
        liquidTotal,
        strategyTotal,
        currentFeeApr: charmStats?.currentFeeApr || '0',
        weeklyApy: charmStats?.weeklyApy || '0',
        monthlyApy: charmStats?.monthlyApy || '0',
        historicalSnapshots: charmStats?.historicalSnapshots || [],
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
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
        
        // Get strategy balances from getTotalAmounts()
        let strategyWlfiBal = 0n;
        let strategyUsd1Bal = 0n;
        try {
          const strategy = new Contract(
            CONTRACTS.STRATEGY,
            ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
            provider
          );
          [strategyWlfiBal, strategyUsd1Bal] = await strategy.getTotalAmounts();
        } catch (error) {
          console.error('Error fetching strategy balances for withdrawal calc:', error);
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
      
      // Get strategy balances from getTotalAmounts()
      let strategyWlfiBal = 0n;
      let strategyUsd1Bal = 0n;
      try {
        const strategy = new Contract(
          CONTRACTS.STRATEGY,
          ['function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount)'],
          provider
        );
        [strategyWlfiBal, strategyUsd1Bal] = await strategy.getTotalAmounts();
      } catch (error) {
        console.error('Error fetching strategy balances for withdraw:', error);
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
    <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-black dark:to-gray-900 min-h-screen pb-24 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-16 sm:pb-24">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          {onNavigateUp ? (
            <NeoButton 
              onClick={onNavigateUp}
              label="Back to Home"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              }
            />
          ) : (
            <Link 
              to="/"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm inline-flex"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to vaults
            </Link>
          )}
          
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <img 
              src={ICONS.EAGLE}
              alt="vEAGLE"
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Eagle Vault</h1>
                <div className="flex items-center gap-1 sm:gap-2">
                  <img src={ICONS.WLFI} alt="WLFI" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-lg" />
                  <img src={ICONS.USD1} alt="USD1" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-lg" />
                </div>
              </div>
              <a 
                href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 font-mono truncate transition-colors inline-flex items-center gap-1"
              >
                {CONTRACTS.VAULT}
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <NeoButton
              onClick={handleSyncBalances}
              label="Sync"
              className="!px-3 sm:!px-4 !py-1.5 sm:!py-2 !text-xs sm:!text-sm"
            />
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
              className="!px-2 sm:!px-3 !py-1.5 sm:!py-2 !w-auto !rounded-full"
            />
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-gray-800 dark:to-gray-850 ${DS.radius.full} ${DS.shadows.raised} border border-emerald-200/70 dark:border-emerald-700/50`}>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <img 
                src={ICONS.ETHEREUM}
                alt="Ethereum"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
              />
              <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-semibold">Ethereum</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <NeoStatCard
            label="Total deposited"
            value={(() => {
              const totalWLFI = Number(data.vaultLiquidWLFI) + Number(data.strategyWLFI);
              const totalUSD1 = Number(data.vaultLiquidUSD1) + Number(data.strategyUSD1);
              const totalUSD = (totalWLFI * Number(data.wlfiPrice)) + (totalUSD1 * Number(data.usd1Price));
              return `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            })()}
            subtitle={(() => {
              const totalWLFI = Number(data.vaultLiquidWLFI) + Number(data.strategyWLFI);
              const totalUSD1 = Number(data.vaultLiquidUSD1) + Number(data.strategyUSD1);
              return `${totalWLFI.toFixed(2)} WLFI + ${totalUSD1.toFixed(2)} USD1`;
            })()}
          />
          <NeoStatCard
            label="Current APY"
            value={
              data.weeklyApy === 'calculating' 
                ? '📊' 
                : data.weeklyApy !== '0' 
                  ? `${data.weeklyApy}%` 
                  : 'N/A'
            }
            highlighted
            subtitle={
              data.weeklyApy === 'calculating'
                ? 'New vault - APY calculating...'
                : data.weeklyApy !== '0' 
                  ? 'From Charm Finance' 
                  : 'Loading...'
            }
          />
          <NeoStatCard
            label="Your position"
            value={account ? Number(data.userBalance).toFixed(2) : '0.00'}
            subtitle={account ? `${Number(data.userBalance).toLocaleString()} vEAGLE` : 'Connect wallet'}
          />
        </div>

        {/* Stacked Layout: Vault/Strategies on top, Controls below */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* START_SECTION_TABS */}
          {/* Tabbed Vault Info & Strategies */}
          <div>
            <NeoCard className="!p-0">
              {/* ERC-4626 Vault Header - Inside card, above tabs */}
              <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-300/50 dark:border-gray-700/30">
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/30 rounded-lg p-3 sm:p-4 border border-gray-200/50 dark:border-gray-700/30 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">ERC-4626 Vault</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug mb-2">
                    Deposit{' '}
                    <a href="https://worldlibertyfinancial.com/" target="_blank" rel="noopener noreferrer" className="text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">
                      WLFI
                    </a>
                    {' '}or{' '}
                    <a href="https://worldlibertyfinancial.com/usd1" target="_blank" rel="noopener noreferrer" className="text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">
                      USD1
                    </a>
                    , get vEAGLE shares with auto-compounding yield.
                  </p>
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-1.5 border border-blue-200/50 dark:border-blue-700/30">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      <span className="font-semibold">Bootstrapping:</span> Currently easing capital into strategies
                    </p>
                  </div>
                </div>

                {/* Fees Section - Above Tabs */}
                <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-700/30 mb-4">
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Fees</div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/30">
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">Deposit</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">1%</div>
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/30">
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">Withdraw</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">2%</div>
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg px-3 py-2 border border-yellow-200 dark:border-yellow-600/30">
                      <div className="text-[10px] text-yellow-700 dark:text-yellow-400 uppercase mb-0.5 font-bold">Performance</div>
                      <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">4.7%</div>
                    </div>
                  </div>
                </div>

                {/* Tab Headers */}
                <NeoTabs
                  tabs={[
                    { id: 'vault', label: 'Assets' },
                    { id: 'strategies', label: 'Strategies' },
                  ]}
                  defaultTab={infoTab}
                  onChange={(tabId) => setInfoTab(tabId as 'vault' | 'strategies')}
                />
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-6">
                {infoTab === 'vault' && (
                  <div className="space-y-4">
                    {/* Asset Deployment Sunburst Chart */}
                    <div className="space-y-3">
                      {/* Assets Display */}
                      <div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Assets</div>
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/30">
                            <img src={ICONS.WLFI} alt="WLFI" className="w-8 h-8 rounded-full flex-shrink-0" />
                            <div className="text-sm font-bold text-gray-900 dark:text-white">WLFI</div>
                          </div>
                          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/30">
                            <img src={ICONS.USD1} alt="USD1" className="w-8 h-8 rounded-full flex-shrink-0" />
                            <div className="text-sm font-bold text-gray-900 dark:text-white">USD1</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sunburst Chart */}
                      <AssetAllocationSunburst
                        vaultWLFI={Number(data.vaultLiquidWLFI)}
                        vaultUSD1={Number(data.vaultLiquidUSD1)}
                        strategyWLFI={Number(data.strategyWLFI)}
                        strategyUSD1={Number(data.strategyUSD1)}
                        wlfiPrice={Number(data.wlfiPrice)}
                      />
                    </div>
                  </div>
                )}

                {infoTab === 'strategies' && (
                  <div className="space-y-5">
                    {/* All 5 Strategies as Expandable Rows */}
                    {[
                      {
                        id: 1,
                        name: 'Charm USD1/WLFI Alpha Vault',
                        protocol: 'Charm Finance',
                        pool: 'USD1/WLFI',
                        feeTier: '1%',
                        allocation: '100%',
                        status: 'active',
                        description: 'Actively managed concentrated liquidity position on Uniswap V3, optimized for the USD1/WLFI 1% fee tier pool.',
                        analytics: 'https://alpha.charm.fi/vault/1/0x47b2f57fb48177c02e9e219ad4f4e42d5f4f1a0c',
                        revertAnalytics: 'https://revert.finance/#/pool/mainnet/uniswapv3/0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d',
                        contract: CONTRACTS.STRATEGY
                      },
                      {
                        id: 2,
                        name: 'Strategy 2',
                        protocol: 'TBD',
                        description: 'Additional yield strategy coming soon. Protocol and implementation details to be announced.',
                        status: 'coming-soon',
                        allocation: '0%'
                      },
                      {
                        id: 3,
                        name: 'Strategy 3',
                        protocol: 'TBD',
                        description: 'Additional yield strategy coming soon. Protocol and implementation details to be announced.',
                        status: 'coming-soon',
                        allocation: '0%'
                      },
                      {
                        id: 4,
                        name: 'Strategy 4',
                        protocol: 'TBD',
                        description: 'Additional yield strategy coming soon. Protocol and implementation details to be announced.',
                        status: 'coming-soon',
                        allocation: '0%'
                      },
                      {
                        id: 5,
                        name: 'Strategy 5',
                        protocol: 'TBD',
                        description: 'Additional yield strategy coming soon. Protocol and implementation details to be announced.',
                        status: 'coming-soon',
                        allocation: '0%'
                      }
                    ].map((strategy) => (
                      <StrategyRow 
                        key={strategy.id} 
                        strategy={strategy} 
                        wlfiPrice={data.wlfiPrice} 
                        revertData={revertData}
                      />
                    ))}
                  </div>
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
                    className="group relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300
                      bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                      text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                    title={`Switch to ${controlMode === 'user' ? 'Admin' : 'User'} Mode`}
                  >
                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>{controlMode === 'user' ? 'Switch to Admin' : 'Switch to User'}</span>
                  </button>
                </div>
              )}

              {/* Disabled Overlay - Hidden for admin */}
              {!isActualAdmin && controlMode === 'user' && (
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
              )}
              
              {/* Header - User Mode */}
              {controlMode === 'user' && (
                <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-300/50 dark:border-gray-700/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">User Controls</h3>
                    </div>
                    {/* Tab Toggle */}
                    <div className="flex gap-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-0.5">
                      <button
                        onClick={() => setActiveTab('deposit')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          activeTab === 'deposit'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => setActiveTab('withdraw')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          activeTab === 'withdraw'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Header - Admin Mode */}
              {controlMode === 'admin' && (
                <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-300/50 dark:border-gray-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">Admin Controls</h3>
                    </div>
                    {isActualAdmin && (
                      <div className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-[10px] font-semibold text-green-700 dark:text-green-400 shrink-0">
                        ADMIN
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content - User Mode */}
              {controlMode === 'user' && (
                <div className="p-4 sm:p-6">
                  {activeTab === 'deposit' ? (
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-3 sm:mb-4">From wallet</p>
                    
                    {/* WLFI Input */}
                    <NeoInput
                      type="number"
                      value={wlfiAmount}
                      onChange={setWlfiAmount}
                      placeholder="0"
                      label="WLFI"
                      maxLabel={Number(data.wlfiBalance).toFixed(4)}
                      onMaxClick={() => setWlfiAmount(data.wlfiBalance)}
                    />

                    {/* USD1 Input */}
                    <NeoInput
                      type="number"
                      value={usd1Amount}
                      onChange={setUsd1Amount}
                      placeholder="0"
                      label="USD1"
                      maxLabel={Number(data.usd1Balance).toFixed(4)}
                      onMaxClick={() => setUsd1Amount(data.usd1Balance)}
                    />

                    {/* Deposit Button */}
                    <NeoButton
                      label={loading ? 'Depositing...' : !account ? 'Connect Wallet' : 'Deposit'}
                      onClick={handleDeposit}
                      active={false}
                      className="w-full !py-3 sm:!py-4 !text-sm sm:!text-base !bg-gradient-to-r !from-yellow-400 !to-yellow-500 dark:!from-yellow-600 dark:!to-yellow-700 !text-gray-900 dark:!text-white disabled:!opacity-50 disabled:!cursor-not-allowed"
                      disabled={loading || !account || (!wlfiAmount && !usd1Amount)}
                    />

                    {/* Preview */}
                    <div className={`pt-4 sm:pt-6 mt-3 sm:mt-4 border-t ${DS.borders.separator}`}>
                      <div className={`${DS.text.labelSmall} mb-2 sm:mb-3`}>You will receive</div>
                      <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 ${DS.backgrounds.card} ${DS.radius.md} ${DS.shadows.inset} ${DS.borders.subtle}`}>
                        <img 
                          src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                          alt="vEAGLE"
                          className={`w-8 h-8 sm:w-10 sm:h-10 ${DS.radius.sm} shadow-lg`}
                        />
                        <div className="flex-1">
                          <div className={DS.text.h4}>vEAGLE</div>
                          <div className={DS.text.descriptionSmall}>Vault Shares</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-3 sm:mb-4">To wallet</p>
                    
                    {/* vEAGLE Input */}
                    <NeoInput
                      type="number"
                      value={withdrawAmount}
                      onChange={setWithdrawAmount}
                      placeholder="0"
                      label="vEAGLE"
                      maxLabel={Number(data.userBalance).toFixed(4)}
                      onMaxClick={() => setWithdrawAmount(data.userBalance)}
                    />

                    {/* Withdraw Button */}
                    <NeoButton
                      label={loading ? 'Withdrawing...' : !account ? 'Connect Wallet' : 'Withdraw'}
                      onClick={handleWithdraw}
                      active={false}
                      disabled={loading || !account || !withdrawAmount}
                      className="w-full !py-3 sm:!py-4 !text-sm sm:!text-base !bg-gradient-to-r !from-yellow-400 !to-yellow-500 dark:!from-yellow-600 dark:!to-yellow-700 !text-gray-900 dark:!text-white"
                    />

                    {/* Preview */}
                    <div className={`pt-4 sm:pt-6 mt-3 sm:mt-4 border-t ${DS.borders.separator}`}>
                      <div className={`${DS.text.labelSmall} mb-2 sm:mb-3`}>You will receive</div>
                      <div className={DS.spacing.itemGapSmall}>
                        <div className={`flex justify-between items-center p-3 sm:p-4 ${DS.backgrounds.card} ${DS.radius.md} ${DS.shadows.inset} ${DS.borders.subtle}`}>
                          <span className={`${DS.text.label} text-sm sm:text-base`}>WLFI</span>
                          <span className={`${DS.text.valueSmall} text-sm sm:text-base`}>~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                        <div className={`flex justify-between items-center p-3 sm:p-4 ${DS.backgrounds.card} ${DS.radius.md} ${DS.shadows.inset} ${DS.borders.subtle}`}>
                          <span className={`${DS.text.label} text-sm sm:text-base`}>USD1</span>
                          <span className={`${DS.text.valueSmall} text-sm sm:text-base`}>~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Wrap Shares Button - Always available in User mode */}
                {onNavigateToWrapper && (
                  <button
                    onClick={onNavigateToWrapper}
                    className="w-full mt-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 sm:gap-3 font-semibold text-sm sm:text-base bg-gradient-to-r from-purple-500 via-purple-600 to-blue-500 hover:from-purple-600 hover:via-purple-700 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="hidden sm:inline">Wrap Shares to EAGLE</span>
                    <span className="sm:hidden">Wrap to EAGLE</span>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
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

                  {/* Capital Injection Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Capital Injection</h4>
                      <div className="group relative">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full !py-3 sm:!py-4 !text-sm sm:!text-base !bg-gradient-to-r !from-purple-500 !to-purple-600 dark:!from-purple-600 dark:!to-purple-700 !text-white disabled:!opacity-50 disabled:!cursor-not-allowed"
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


