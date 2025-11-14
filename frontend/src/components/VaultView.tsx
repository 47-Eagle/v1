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
import { ComposerPanel } from './ComposerPanel';

// Lazy load 3D visualization
const VaultVisualization = lazy(() => import('./VaultVisualization'));

// Strategy Row Component with Dropdown
function StrategyRow({ strategy, wlfiPrice, revertData }: { strategy: any; wlfiPrice?: string; revertData?: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Debug: Log strategy data for #2
  if (strategy.id === 2) {
    console.log('[StrategyRow #2] ===== RECEIVED PROPS =====');
    console.log('[StrategyRow #2] deployed:', strategy.deployed);
    console.log('[StrategyRow #2] wethAmount:', strategy.wethAmount);
    console.log('[StrategyRow #2] wethAmount type:', typeof strategy.wethAmount);
    console.log('[StrategyRow #2] hasWethAmount:', !!strategy.wethAmount);
    console.log('[StrategyRow #2] wethAmountValue:', Number(strategy.wethAmount));
    console.log('[StrategyRow #2] ===========================');
  }

  return (
    <div className={`
      group relative rounded-2xl overflow-hidden transition-all duration-300
      ${strategy.status === 'active' 
        ? 'bg-white/5 dark:bg-white/5 border border-gray-200/10 dark:border-gray-700/20 hover:bg-white/8 dark:hover:bg-white/8 hover:border-amber-400/20' 
        : 'bg-white/3 dark:bg-white/3 border border-gray-200/5 dark:border-gray-700/10 opacity-40'
      }
    `}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 sm:px-6 py-4 sm:py-5 transition-all duration-300"
      >
        <div className="flex items-start justify-between w-full gap-4">
          {/* Left: Strategy Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              {/* Strategy Number */}
              <div className={`
                text-lg sm:text-xl font-bold shrink-0 transition-colors duration-300
                ${strategy.status === 'active'
                  ? 'text-amber-400 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-600'
                }
              `}>
                #{strategy.id}
              </div>
              
              {/* Strategy Name */}
              {strategy.status === 'active' && (
                <h4 className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg truncate">
                  {strategy.name}
                </h4>
              )}
              
              {strategy.status !== 'active' && (
                <h4 className="text-gray-700 dark:text-gray-400 font-semibold text-base sm:text-lg truncate">
                  {strategy.name}
                </h4>
              )}
            </div>
            
            {/* Protocol Info */}
            {strategy.status === 'active' && (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">Protocol</div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>Charm Finance</span>
                  {strategy.feeTier && (
                    <>
                      <span>•</span>
                      <span>{strategy.feeTier}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400">4.7% Perf</span>
                </div>
              </div>
            )}
            
            {strategy.status !== 'active' && (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">Protocol</div>
                <p className="text-xs text-gray-600 dark:text-gray-500">{strategy.protocol}</p>
              </div>
            )}
          </div>
          
          {/* Right: Allocation + Expand */}
          <div className="flex items-start gap-4 sm:gap-6 shrink-0">
            {/* Allocation */}
            {strategy.allocation && strategy.status === 'active' && (
              <div className="text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">
                  Allocation
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 dark:text-amber-400 leading-none">
                  {strategy.allocation}
                </div>
              </div>
            )}
            
            {/* Expand Icon */}
            <div className={`
              transition-all duration-300 mt-6
              ${strategy.status === 'active' ? 'text-gray-400 group-hover:text-amber-400' : 'text-gray-600'}
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
          px-5 sm:px-6 pb-5 sm:pb-6 pt-5 border-t animate-fadeIn
          ${strategy.status === 'active'
            ? 'border-gray-200/5 dark:border-gray-700/10'
            : 'border-gray-200/3 dark:border-gray-700/5'
          }
        `}>
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
                      <svg className="animate-spin w-8 h-8 mx-auto mb-2 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24">
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
          
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{strategy.description}</p>
          
          {strategy.status === 'active' && (
            <>

              {strategy.contract && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Contract Address */}
                  <div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1.5">Contract</div>
                    <a 
                      href={`https://etherscan.io/address/${strategy.contract}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 font-mono transition-colors block"
                    >
                      {strategy.contract.slice(0, 6)}...{strategy.contract.slice(-4)}
                    </a>
                  </div>

                  {/* Charm Vault */}
                  {strategy.charmVault && (
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1.5">Charm Vault</div>
                      <a 
                        href={`https://etherscan.io/address/${strategy.charmVault}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 font-mono transition-colors block"
                      >
                        {strategy.charmVault.slice(0, 6)}...{strategy.charmVault.slice(-4)}
                      </a>
                    </div>
                  )}

                  {/* Deployed Amount */}
                  {strategy.deployed !== undefined && (
                    <div className="sm:col-span-2 pt-3 border-t border-gray-200/5 dark:border-gray-700/10">
                      <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1.5">Deployed</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${Number(strategy.deployed).toFixed(0)}
                      </div>
                      {/* Show token breakdown */}
                      {strategy.usd1Amount && Number(strategy.usd1Amount) > 0 ? (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {strategy.usd1Amount} USD1 • {strategy.wlfiAmount} WLFI
                        </div>
                      ) : strategy.wethAmount && Number(strategy.wethAmount) > 0 ? (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {strategy.wethAmount} WETH + WLFI
                        </div>
                      ) : null}
                    </div>
                  )}
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
      
      const charmStatsPromise = fetchCharmStats();

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
          const [totalShares, [totalWeth, totalWlfi]] = await Promise.all([
            charmVault.totalSupply(),
            charmVault.getTotalAmounts()
          ]);
          
          // Calculate strategy's proportional share
          const strategyWethAmount = (totalWeth * strategyShares) / totalShares;
          const strategyWlfiAmount = (totalWlfi * strategyShares) / totalShares;
          
          strategyWETH = Number(formatEther(strategyWethAmount)).toFixed(4);
          strategyWLFIinPool = Number(formatEther(strategyWlfiAmount)).toFixed(2);
          
      console.log('[VaultView] ===== WETH STRATEGY DATA =====');
      console.log('[VaultView] WETH amount:', strategyWETH);
      console.log('[VaultView] WLFI in pool amount:', strategyWLFIinPool);
      console.log('[VaultView] Shares:', formatEther(strategyShares));
      console.log('[VaultView] ============================');
          
          // For display, show total USD value (WETH worth ~$3500, WLFI worth ~$0.132)
          const wethValueUsd = Number(strategyWETH) * 3500;
          const wlfiValueUsd = Number(strategyWLFIinPool) * 0.132;
          strategyWLFI = (wethValueUsd + wlfiValueUsd).toFixed(2);
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
      };
      
      console.log('[VaultView] Setting new data:', {
        ...newData,
        strategyWETH_check: strategyWETH, // Explicit check
        strategyWLFI_check: strategyWLFI,
        strategyUSD1_check: strategyUSD1
      });
      setData(newData);
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
                className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono truncate transition-colors inline-flex items-center gap-1"
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
                        Deposit <span className="text-amber-600 dark:text-amber-400 font-semibold">WLFI</span> or <span className="text-amber-600 dark:text-amber-400 font-semibold">USD1</span> for auto-compounding yield
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-1.5 border border-blue-200/50 dark:border-blue-700/30 shrink-0">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-800 dark:text-blue-300 hidden sm:block">
                      <span className="font-semibold">Bootstrapping:</span> Easing capital
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-300 sm:hidden font-semibold">
                      Bootstrapping
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab Headers */}
              <div className="px-4 sm:px-6 pt-4 pb-2">
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
                        strategyWETH={Number(data.strategyWETH)}
                        strategyWLFIinPool={Number(data.strategyWLFIinPool)}
                        strategyUSD1InPool={Number(data.strategyUSD1InPool)}
                        strategyWLFIinUSD1Pool={Number(data.strategyWLFIinUSD1Pool)}
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
                        allocation: '50%',
                        status: 'active',
                        description: 'Actively managed concentrated liquidity position on Uniswap V3, optimized for the USD1/WLFI 1% fee tier pool.',
                        analytics: 'https://alpha.charm.fi/vault/1/0x47b2f57fb48177c02e9e219ad4f4e42d5f4f1a0c',
                        revertAnalytics: 'https://revert.finance/#/pool/mainnet/uniswapv3/0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d',
                        contract: '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f',
                        charmVault: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
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
                        allocation: '50%',
                        status: 'active',
                        description: 'Actively managed concentrated liquidity position on Uniswap V3, optimized for the WETH/WLFI 1% fee tier pool. Features 24-hour oracle support for stable operations.',
                        analytics: 'https://alpha.charm.fi/vault/1/0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
                        contract: '0x5c525Af4153B1c43f9C06c31D32a84637c617FfE',
                        charmVault: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
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

                  {/* Capital Injection Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Capital Injection</h4>
                      <div className="group relative">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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


