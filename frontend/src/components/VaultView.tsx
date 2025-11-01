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

// Lazy load 3D visualization
const VaultVisualization = lazy(() => import('./VaultVisualization'));

// Strategy Row Component with Dropdown
function StrategyRow({ strategy, wlfiPrice }: { strategy: any; wlfiPrice?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`
      group relative rounded-2xl overflow-hidden transition-all duration-300
      ${strategy.status === 'active' 
        ? 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-yellow-500/30 shadow-[0_4px_20px_rgba(234,179,8,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-yellow-500/40 hover:shadow-[0_8px_30px_rgba(234,179,8,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]' 
        : 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-zinc-700/50 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-zinc-600'
      }
    `}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-8 py-5 transition-all duration-300 hover:bg-white/5"
      >
        <div className="flex items-center gap-6">
          {/* Strategy Number - Metallic Badge */}
          <div className={`
            px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider
            ${strategy.status === 'active'
              ? 'bg-gradient-to-br from-yellow-600 via-yellow-500 to-amber-600 text-white shadow-[0_2px_8px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]'
              : 'bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 text-zinc-400 border border-zinc-600/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
            }
          `}>
            #{strategy.id}
          </div>
          
          {/* Status Indicator - Minimal Dot */}
          {strategy.status === 'active' ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <span className="text-xs text-green-400 font-medium uppercase tracking-wide">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</span>
            </div>
          )}
          
          {/* Strategy Name & Protocol - More Space */}
          <div className="flex-1 text-left">
            <h4 className="text-white font-semibold text-lg mb-0.5 group-hover:text-yellow-400 transition-colors">
              {strategy.name}
            </h4>
            <p className="text-sm text-gray-400">{strategy.protocol}</p>
          </div>
          
          {/* Allocation - Elegant Percentage */}
          {strategy.allocation && (
            <div className="text-right mr-4">
              <div className="text-2xl font-bold text-yellow-400">{strategy.allocation}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Allocated</div>
            </div>
          )}
          
          {/* Expand Arrow - Metallic Button */}
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
            bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 
            border border-zinc-600/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)]
            group-hover:border-zinc-500/50 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.4)]
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            <svg 
              className="w-5 h-5 text-zinc-400 group-hover:text-yellow-400 transition-colors"
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
        <div className="px-8 pb-6 pt-4 border-t border-zinc-700/50 bg-gradient-to-b from-black/40 to-black/60 animate-fadeIn">
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

              {strategy.analytics && (
                <a 
                  href={strategy.analytics} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 font-medium text-sm inline-flex items-center gap-2 transition-colors mb-4"
                >
                  View Analytics on Charm Finance
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

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
                      <code className="text-xs font-mono">
                        {strategy.contract.slice(0, 6)}...{strategy.contract.slice(-4)}
                      </code>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  const [infoTab, setInfoTab] = useState<'about' | 'strategies' | 'info'>('about');
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

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
    weeklyApy: '0',
    monthlyApy: '0',
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
      const query = `query GetVault($address: ID!) { vault(id: $address) { snapshot(orderBy: timestamp, orderDirection: asc, first: 1000) { timestamp feeApr annualVsHoldPerfSince totalAmount0 totalAmount1 totalSupply } } }`;
      const response = await fetch('https://stitching-v2.herokuapp.com/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { address: CONTRACTS.CHARM_VAULT.toLowerCase() } })
      });
      const result = await response.json();
      if (result.data?.vault?.snapshot) {
        const snapshots = result.data.vault.snapshot;
        const current = snapshots[snapshots.length - 1];
        const weeklyApy = current?.annualVsHoldPerfSince ? (parseFloat(current.annualVsHoldPerfSince) * 100).toFixed(2) : '0';
        const monthlyApy = weeklyApy;
        const currentFeeApr = current?.feeApr ? (parseFloat(current.feeApr) * 100).toFixed(2) : '0';
        const historicalSnapshots = snapshots.map((s: any) => ({ timestamp: parseInt(s.timestamp), feeApr: (parseFloat(s.feeApr || '0') * 100).toFixed(2), totalValue: parseFloat(s.totalAmount0 || '0') + parseFloat(s.totalAmount1 || '0') }));
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

      const [vaultWlfiBal, vaultUsd1Bal, strategyWlfiBal, strategyUsd1Bal] = await Promise.all([
        wlfi.balanceOf(CONTRACTS.VAULT),
        usd1.balanceOf(CONTRACTS.VAULT),
        wlfi.balanceOf(CONTRACTS.STRATEGY), // Strategy contract holds the tokens
        usd1.balanceOf(CONTRACTS.STRATEGY), // Strategy contract holds the tokens
      ]);
      
      vaultLiquidWLFI = formatEther(vaultWlfiBal);
      vaultLiquidUSD1 = formatEther(vaultUsd1Bal);
      strategyWLFI = formatEther(strategyWlfiBal);
      strategyUSD1 = formatEther(strategyUsd1Bal);

      const liquidTotal = (Number(vaultLiquidWLFI) + Number(vaultLiquidUSD1)).toFixed(2);
      const strategyTotal = (Number(strategyWLFI) + Number(strategyUSD1)).toFixed(2);

      const charmStats = await charmStatsPromise;

      if (account) {
        const [vEagle, wlfiBal, usd1Bal, maxRedeem] = await Promise.all([
          vault.balanceOf(account),
          wlfi.balanceOf(account),
          usd1.balanceOf(account),
          vault.maxRedeem(account),
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
        const allowance = await wlfi.allowance(account, CONTRACTS.VAULT);
        if (allowance < wlfiAmt) {
          const tx = await wlfi.approve(CONTRACTS.VAULT, wlfiAmt);
          await tx.wait();
        }
      }

      if (usd1Amt > 0n) {
        const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, signer);
        const allowance = await usd1.allowance(account, CONTRACTS.VAULT);
        if (allowance < usd1Amt) {
          const tx = await usd1.approve(CONTRACTS.VAULT, usd1Amt);
          await tx.wait();
        }
      }

      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const tx = await vault.depositDual(wlfiAmt, usd1Amt, account);
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
        
        const [totalSupply, vaultWlfiBal, vaultUsd1Bal, strategyWlfiBal, strategyUsd1Bal] = await Promise.all([
          vault.totalSupply(),
          wlfi.balanceOf(CONTRACTS.VAULT),
          usd1.balanceOf(CONTRACTS.VAULT),
          wlfi.balanceOf(CONTRACTS.STRATEGY),
          usd1.balanceOf(CONTRACTS.STRATEGY),
        ]);
        
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
      
      // Get strategy balances too for total calculation
      const [strategyWlfiBal, strategyUsd1Bal] = await Promise.all([
        wlfi.balanceOf(CONTRACTS.STRATEGY),
        usd1.balanceOf(CONTRACTS.STRATEGY),
      ]);
      
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

  return (
    <div className="bg-neo-bg dark:bg-black min-h-screen pb-24 transition-colors">
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-24">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-4 mb-6">
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
          
          {onNavigateToWrapper && (
            <button
              onClick={onNavigateToWrapper}
              className="px-6 py-3 rounded-full flex items-center gap-2 font-semibold bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>Wrap Shares</span>
            </button>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <img 
            src={ICONS.EAGLE}
            alt="vEAGLE"
            className="w-16 h-16 rounded-2xl"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Eagle Vault</h1>
              <div className="flex items-center gap-2">
                <img src={ICONS.WLFI} alt="WLFI" className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-lg" />
                <img src={ICONS.USD1} alt="USD1" className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-lg" />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{CONTRACTS.VAULT}</p>
          </div>
          <div className="flex items-center gap-2">
            <NeoButton
              onClick={handleSyncBalances}
              label="Sync Vault"
              className="!px-4 !py-2 !text-sm"
            />
            <NeoButton
              onClick={handleRefresh}
              disabled={refreshing}
              label=""
              icon={
                <svg 
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              className="!px-3 !py-2 !w-auto !rounded-full"
            />
            <div className={`flex items-center gap-2 px-4 py-2 ${DS.backgrounds.card} ${DS.shadows.raised} ${DS.radius.full} ${DS.borders.subtle}`}>
              <img 
                src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy"
                alt="vEAGLE"
                className="w-5 h-5"
              />
              <span className={`text-sm ${DS.text.label}`}>vEAGLE</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-gray-800 dark:to-gray-850 ${DS.radius.full} ${DS.shadows.raised} border border-emerald-200/70 dark:border-emerald-700/50`}>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <img 
                src={ICONS.ETHEREUM}
                alt="Ethereum"
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm text-gray-800 dark:text-gray-200 font-semibold">Ethereum</span>
            </div>
          </div>
        </div>

        {/* Asset Deployment Sunburst Chart */}
        <AssetAllocationSunburst
          vaultWLFI={Number(data.vaultLiquidWLFI)}
          vaultUSD1={Number(data.vaultLiquidUSD1)}
          strategyWLFI={Number(data.strategyWLFI)}
          strategyUSD1={Number(data.strategyUSD1)}
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
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
            value={data.weeklyApy !== '0' ? `${data.weeklyApy}%` : 'N/A'}
            highlighted
            subtitle={data.weeklyApy !== '0' ? 'From Charm Finance' : 'Loading...'}
          />
          <NeoStatCard
            label="Your position"
            value={account ? Number(data.userBalance).toFixed(2) : '0.00'}
            subtitle={account ? `${Number(data.userBalance).toLocaleString()} vEAGLE` : 'Connect wallet'}
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Deposit/Withdraw */}
          <div className="lg:col-span-1">
            <NeoCard className="!p-0 overflow-hidden">
              {/* Tabs */}
              <div className="p-2">
                <NeoTabs
                  tabs={[
                    { id: 'deposit', label: 'Deposit' },
                    { id: 'withdraw', label: 'Withdraw' },
                  ]}
                  defaultTab={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as 'deposit' | 'withdraw')}
                />
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'deposit' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-4">From wallet</p>
                    
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
                      className="w-full !py-4 !bg-gradient-to-r !from-yellow-400 !to-yellow-500 dark:!from-yellow-600 dark:!to-yellow-700 !text-gray-900 dark:!text-white disabled:!opacity-50 disabled:!cursor-not-allowed"
                      disabled={loading || !account || (!wlfiAmount && !usd1Amount)}
                    />

                    {/* Preview */}
                    <div className={`pt-6 mt-4 border-t ${DS.borders.separator}`}>
                      <div className={`${DS.text.labelSmall} mb-3`}>You will receive</div>
                      <div className={`flex items-center gap-3 p-4 ${DS.backgrounds.card} ${DS.radius.md} ${DS.shadows.inset} ${DS.borders.subtle}`}>
                        <img 
                          src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                          alt="vEAGLE"
                          className={`w-10 h-10 ${DS.radius.sm} shadow-lg`}
                        />
                        <div className="flex-1">
                          <div className={DS.text.h4}>vEAGLE</div>
                          <div className={DS.text.descriptionSmall}>Vault Shares</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-4">To wallet</p>
                    
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
                      className="w-full !py-4 !bg-gradient-to-r !from-yellow-400 !to-yellow-500 dark:!from-yellow-600 dark:!to-yellow-700 !text-gray-900 dark:!text-white"
                    />

                    {/* Preview */}
                    <div className={`pt-6 mt-4 border-t ${DS.borders.separator}`}>
                      <div className={`${DS.text.labelSmall} mb-3`}>You will receive</div>
                      <div className={DS.spacing.itemGapSmall}>
                        <div className={`flex justify-between items-center p-4 ${DS.backgrounds.card} ${DS.radius.md} ${DS.shadows.inset} ${DS.borders.subtle}`}>
                          <span className={DS.text.label}>WLFI</span>
                          <span className={DS.text.valueSmall}>~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                        <div className={`flex justify-between items-center p-4 ${DS.backgrounds.card} ${DS.radius.md} ${DS.shadows.inset} ${DS.borders.subtle}`}>
                          <span className={DS.text.label}>USD1</span>
                          <span className={DS.text.valueSmall}>~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </NeoCard>
          </div>

          {/* Right - Info Tabs */}
          <div className="lg:col-span-2">
            <NeoCard className="!p-0">
              {/* Tab Headers */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-300/50 dark:border-gray-700/30">
                <NeoTabs
                  tabs={[
                    { id: 'about', label: 'Vault' },
                    { id: 'strategies', label: 'Strategies' },
                  ]}
                  defaultTab={infoTab}
                  onChange={(tabId) => setInfoTab(tabId as 'about' | 'strategies' | 'info')}
                />
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {infoTab === 'about' && (
                  <div className="space-y-6">
                    {/* Vault Description */}
                    <div>
                      <h3 className={`${DS.text.h3} mb-3`}>ERC-4626 Tokenized Vault</h3>
                      <p className={`${DS.text.body} leading-relaxed`}>
                        A standardized vault accepting{' '}
                        <a href="https://worldlibertyfinancial.com/" target="_blank" rel="noopener noreferrer" className={`${DS.text.highlightBold} hover:text-yellow-800 dark:hover:text-yellow-300 ${DS.transitions.fast}`}>
                          WLFI
                        </a>
                        {' '}and{' '}
                        <a href="https://worldlibertyfinancial.com/usd1" target="_blank" rel="noopener noreferrer" className={`${DS.text.highlightBold} hover:text-yellow-800 dark:hover:text-yellow-300 ${DS.transitions.fast}`}>
                          USD1
                        </a>
                        , issuing vEAGLE shares that represent proportional ownership and automatically compound yields.
                      </p>
                        </div>
                        
                    {/* Bootstrapping Notice */}
                    <div className={`${DS.backgrounds.info} ${DS.borders.info} ${DS.radius.md} ${DS.spacing.cardPadding} ${DS.shadows.raised}`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 bg-blue-500 dark:bg-blue-600 ${DS.radius.full} flex items-center justify-center mt-0.5`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-blue-900 dark:text-blue-200 font-bold mb-2 text-lg">Bootstrapping Phase</h4>
                          <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                            We are currently in the bootstrapping phase and have temporarily disabled deposits and withdrawals. 
                            We are carefully easing capital into strategies as a safety precaution to ensure optimal performance and security. 
                            Thank you for your patience.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Fee Structure */}
                    <div>
                      <h4 className={`${DS.text.h4} mb-4`}>Fee Structure</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className={`${DS.backgrounds.card} ${DS.shadows.raised} ${DS.radius.md} p-6 ${DS.borders.subtle} ${DS.shadows.raisedHover} ${DS.transitions.default}`}>
                          <div className={`${DS.text.labelSmall} mb-3`}>Deposit</div>
                          <div className={DS.text.valueMedium}>1%</div>
                        </div>
                        <div className={`${DS.backgrounds.card} ${DS.shadows.raised} ${DS.radius.md} p-6 ${DS.borders.subtle} ${DS.shadows.raisedHover} ${DS.transitions.default}`}>
                          <div className={`${DS.text.labelSmall} mb-3`}>Withdrawal</div>
                          <div className={DS.text.valueMedium}>2%</div>
                        </div>
                        <div className={`${DS.backgrounds.highlight} ${DS.shadows.raised} ${DS.radius.md} p-6 ${DS.borders.highlight} ${DS.shadows.raisedHover} ${DS.transitions.default}`}>
                          <div className="text-xs text-gray-700 dark:text-yellow-200 font-bold uppercase tracking-wider mb-3">Performance</div>
                          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">4.7%</div>
                          <div className="text-xs text-gray-600 dark:text-yellow-200/70 mt-2">On profits only</div>
                        </div>
                        </div>
                      </div>

                    {/* Vault Assets */}
                    <div>
                      <h4 className={`${DS.text.h4} mb-4`}>Accepted Assets</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`${DS.backgrounds.card} ${DS.shadows.raised} ${DS.radius.md} ${DS.spacing.cardPadding} ${DS.borders.subtle} ${DS.shadows.raisedHover} ${DS.transitions.default}`}>
                          <div className="flex items-center gap-4">
                            <img src={ICONS.WLFI} alt="WLFI" className={`w-14 h-14 ${DS.radius.full} border-2 border-white dark:border-gray-600 shadow-lg flex-shrink-0`} />
                            <div className="flex-1">
                              <div className={`${DS.text.h4} mb-1`}>WLFI</div>
                              <div className={`${DS.text.highlight} font-bold text-lg`}>${data.wlfiPrice}</div>
                              <div className={DS.text.descriptionSmall}>World Liberty Financial</div>
                            </div>
                          </div>
                      </div>
                        <div className={`${DS.backgrounds.card} ${DS.shadows.raised} ${DS.radius.md} ${DS.spacing.cardPadding} ${DS.borders.subtle} ${DS.shadows.raisedHover} ${DS.transitions.default}`}>
                          <div className="flex items-center gap-4">
                            <img src={ICONS.USD1} alt="USD1" className={`w-14 h-14 ${DS.radius.full} border-2 border-white dark:border-gray-600 shadow-lg flex-shrink-0`} />
                            <div className="flex-1">
                              <div className={`${DS.text.h4} mb-1`}>USD1</div>
                              <div className={`${DS.text.highlight} font-bold text-lg`}>${data.usd1Price}</div>
                              <div className={DS.text.descriptionSmall}>Stablecoin</div>
                            </div>
                          </div>
                    </div>
                  </div>
                    </div>

                    {/* Vault Contract */}
                    <div>
                      <h4 className={`${DS.text.h4} mb-4`}>Vault Contract</h4>
                      <div className={`${DS.backgrounds.card} ${DS.shadows.raised} ${DS.radius.md} ${DS.spacing.cardPadding} ${DS.borders.subtle} ${DS.shadows.raisedHover} ${DS.transitions.default}`}>
                            <a 
                              href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                              target="_blank"
                              rel="noopener noreferrer"
                          className="flex justify-between items-center group"
                        >
                          <span className={`${DS.text.label} font-bold`}>ERC-4626 Vault</span>
                          <div className={`flex items-center gap-2 ${DS.text.highlight} hover:text-yellow-700 dark:hover:text-yellow-300 ${DS.transitions.fast}`}>
                            <code className="text-sm font-mono font-semibold">
                              {CONTRACTS.VAULT.slice(0, 6)}...{CONTRACTS.VAULT.slice(-4)}
                            </code>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                          </div>
                            </a>
                          </div>
                        </div>
                          </div>
                )}

                {infoTab === 'strategies' && (
                  <div className="space-y-8">
                    {/* All 5 Strategies as Expandable Rows */}
                    <div className="space-y-5">
                      {[
                        {
                          id: 1,
                          name: 'Charm USD1/WLFI Alpha Vault',
                          protocol: 'Charm Finance',
                          pool: 'USD1/WLFI',
                          feeTier: '0.3%',
                          allocation: '100%',
                          status: 'active',
                          description: 'Actively managed concentrated liquidity position on Uniswap V3, optimized for the USD1/WLFI 0.3% fee tier pool.',
                          analytics: 'https://alpha.charm.fi/vault/1/0x47b2f57fb48177c02e9e219ad4f4e42d5f4f1a0c',
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
                        <StrategyRow key={strategy.id} strategy={strategy} wlfiPrice={data.wlfiPrice} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </NeoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
