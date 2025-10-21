import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import { ICONS } from '../config/icons';
import { getActiveStrategies } from '../config/strategies';
import { ErrorBoundary } from './ErrorBoundary';
import AssetAllocationSunburst from './AssetAllocationSunburst';

// Lazy load 3D visualization
const VaultVisualization = lazy(() => import('./VaultVisualization'));

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function depositDual(uint256 wlfiAmount, uint256 usd1Amount, address receiver) returns (uint256)',
  'function withdrawDual(uint256 shares, address receiver) returns (uint256, uint256)',
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
}

export default function VaultView({ provider, account, onToast, onNavigateUp }: Props) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [infoTab, setInfoTab] = useState<'about' | 'strategies' | 'info'>('about');
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

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
    vaultLiquidWLFI: '0',
    vaultLiquidUSD1: '0',
    strategyWLFI: '0',
    strategyUSD1: '0',
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
        wlfi.balanceOf(CONTRACTS.CHARM_VAULT),
        usd1.balanceOf(CONTRACTS.CHARM_VAULT),
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Memoize calculated values
  const calculatedMetrics = useMemo(() => {
    const totalAssetsNum = Number(data.totalAssets);
    const totalSupplyNum = Number(data.totalSupply);
    const liquidTotalNum = Number(data.liquidTotal);
    const strategyTotalNum = Number(data.strategyTotal);
    
    const liquidPercent = totalAssetsNum > 0 ? ((liquidTotalNum / totalAssetsNum) * 100).toFixed(1) : '0';
    const deployedPercent = totalAssetsNum > 0 ? ((strategyTotalNum / totalAssetsNum) * 100).toFixed(1) : '0';
    const sharePrice = totalSupplyNum > 0 ? (totalAssetsNum / totalSupplyNum) : 1;
    const netApy = (Number(data.monthlyApy) * 0.953).toFixed(2); // After 4.7% fee

    return { liquidPercent, deployedPercent, sharePrice, netApy };
  }, [data.totalAssets, data.totalSupply, data.liquidTotal, data.strategyTotal, data.monthlyApy]);

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
          wlfi.balanceOf(CONTRACTS.CHARM_VAULT),
          usd1.balanceOf(CONTRACTS.CHARM_VAULT),
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
      const assets = Number(formatEther(totalAssets));
      
      // Get strategy balances too for total calculation
      const [strategyWlfiBal, strategyUsd1Bal] = await Promise.all([
        wlfi.balanceOf(CONTRACTS.CHARM_VAULT),
        usd1.balanceOf(CONTRACTS.CHARM_VAULT),
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

      // Try to simulate first to see what contract will actually do
      try {
        console.log('🧪 Testing with contract simulation...');
        const simulation = await vault.withdrawDual.staticCall(shares, account);
        console.log('Contract says it will send:');
        console.log('  WLFI:', formatEther(simulation[0]));
        console.log('  USD1:', formatEther(simulation[1]));
      } catch (simError: any) {
        console.error('❌ Simulation failed:', simError.message);
        onToast({ message: 'Contract simulation failed. The vault may have an accounting issue. Try a smaller amount.', type: 'error' });
        setLoading(false);
        return;
      }

      // Proceed with withdrawal
      onToast({ message: 'Withdrawing from vault...', type: 'info' });
      const tx = await vault.withdrawDual(shares, account);
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
    <div className="bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-12">
        {/* Back Button */}
        {onNavigateUp ? (
          <button 
            onClick={onNavigateUp}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-6 transition-colors text-sm inline-flex"
          >
            <svg className="w-4 h-4 -rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Back to Home
          </button>
        ) : (
          <Link 
            to="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-6 transition-colors text-sm inline-flex"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to vaults
          </Link>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <img 
            src={ICONS.EAGLE}
            alt="vEAGLE"
            className="w-16 h-16 rounded-2xl"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">Eagle Vault</h1>
            <p className="text-sm text-gray-500">{CONTRACTS.VAULT}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh balances"
            >
              <svg 
                className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-xs text-gray-400">vEAGLE</span>
            </div>
            <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-xs text-gray-400">Ethereum</span>
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
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Total deposited</div>
            <div className="text-3xl font-bold text-white mb-1">
              {Number(data.totalAssets).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-600">${Number(data.totalAssets).toFixed(2)}</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Historical APY</div>
            <div className="text-3xl font-bold text-white">22.22%</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Your position</div>
            <div className="text-3xl font-bold text-white">
              {account ? Number(data.userBalance).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-gray-600">
              {account ? `${Number(data.userBalance).toLocaleString()} vEAGLE` : 'Connect wallet'}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Deposit/Withdraw */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'deposit'
                      ? 'text-white bg-white/5 border-b-2 border-yellow-500'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'withdraw'
                      ? 'text-white bg-white/5 border-b-2 border-yellow-500'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'deposit' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">From wallet</p>
                    
                    {/* WLFI Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">WLFI</label>
                        <button
                          onClick={() => setWlfiAmount(data.wlfiBalance)}
                          className="text-xs text-gray-600 hover:text-yellow-500"
                        >
                          {Number(data.wlfiBalance).toFixed(4)}
                        </button>
                      </div>
                      <input
                        type="number"
                        value={wlfiAmount}
                        onChange={(e) => setWlfiAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>

                    {/* USD1 Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">USD1</label>
                        <button
                          onClick={() => setUsd1Amount(data.usd1Balance)}
                          className="text-xs text-gray-600 hover:text-yellow-500"
                        >
                          {Number(data.usd1Balance).toFixed(4)}
                        </button>
                      </div>
                      <input
                        type="number"
                        value={usd1Amount}
                        onChange={(e) => setUsd1Amount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>

                    {/* Deposit Button */}
                    <button
                      onClick={handleDeposit}
                      disabled={loading || !account || (!wlfiAmount && !usd1Amount)}
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold rounded-lg transition-colors"
                    >
                      {loading ? 'Depositing...' : !account ? 'Connect Wallet' : 'Deposit'}
                    </button>

                    {/* Preview */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-xs text-gray-500 mb-2">You will receive</div>
                      <div className="flex items-center gap-2">
                        <img 
                          src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                          alt="vEAGLE"
                          className="w-6 h-6"
                        />
                        <div>
                          <div className="text-white font-semibold">vEAGLE</div>
                          <div className="text-xs text-gray-500">Vault Shares</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">To wallet</p>
                    
                    {/* vEAGLE Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">vEAGLE</label>
                        <button
                          onClick={() => setWithdrawAmount(data.userBalance)}
                          className="text-xs text-gray-600 hover:text-yellow-500"
                        >
                          {Number(data.userBalance).toFixed(4)}
                        </button>
                      </div>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>

                    {/* Withdraw Button */}
                    <button
                      onClick={handleWithdraw}
                      disabled={loading || !account || !withdrawAmount}
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold rounded-lg transition-colors"
                    >
                      {loading ? 'Withdrawing...' : !account ? 'Connect Wallet' : 'Withdraw'}
                    </button>

                    {/* Preview */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-xs text-gray-500 mb-2">You will receive</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">WLFI</span>
                          <span className="text-white font-medium">~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">USD1</span>
                          <span className="text-white font-medium">~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Info Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Tab Headers */}
              <div className="border-b border-white/10 px-6">
                <div className="flex gap-6">
                  <button
                    onClick={() => setInfoTab('about')}
                    className={`py-4 text-sm font-medium transition-colors ${
                      infoTab === 'about'
                        ? 'text-white border-b-2 border-yellow-500'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    About
                  </button>
                  <button
                    onClick={() => setInfoTab('strategies')}
                    className={`py-4 text-sm font-medium transition-colors ${
                      infoTab === 'strategies'
                        ? 'text-white border-b-2 border-yellow-500'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Strategies
                  </button>
                  <button
                    onClick={() => setInfoTab('info')}
                    className={`py-4 text-sm font-medium transition-colors ${
                      infoTab === 'info'
                        ? 'text-white border-b-2 border-yellow-500'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Info
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {infoTab === 'about' && (
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-white font-semibold mb-3">Description</h3>
                      <p className="text-sm text-gray-400 leading-relaxed mb-6">
                        Deposit your{' '}
                        <a href="https://worldlibertyfinancial.com/" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
                          WLFI
                        </a>{' '}
                        and{' '}
                        <a href="https://worldlibertyfinancial.com/usd1" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
                          USD1
                        </a>{' '}
                        into Eagle's auto-compounding vault and start earning yield immediately.
                      </p>

                      <h3 className="text-white font-semibold mb-3">Fee Structure</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">Deposit Fee</span>
                            <span className="text-white font-semibold">1%</span>
                          </div>
                          <p className="text-xs text-gray-600">One-time fee on deposits</p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">Withdrawal Fee</span>
                            <span className="text-white font-semibold">2%</span>
                          </div>
                          <p className="text-xs text-gray-600">One-time fee on withdrawals</p>
                        </div>
                        
                        <div className="pt-2 border-t border-white/10">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">Performance Fee</span>
                            <span className="text-white font-semibold">4.7%</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Charged on profits earned only
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            • 3.7% to Eagle Vault
                            <br />
                            • 1% to Charm Finance (from Charm-generated fees)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-white font-semibold mb-3">APY</h3>
                      <div className="space-y-2 text-sm mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Weekly APY</span>
                          <span className="text-white">32.27%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Monthly APY</span>
                          <span className="text-white">22.22%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Inception APY</span>
                          <span className="text-white">117.91%</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10">
                          <span className="text-gray-300 font-medium">Net APY</span>
                          <span className="text-yellow-500 font-semibold">22.22%</span>
                        </div>
                      </div>

                      <h3 className="text-white font-semibold mb-3">Cumulative Earnings</h3>
                      <div className="bg-black/40 border border-white/10 rounded-lg p-4 h-32">
                        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="line" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
                            </linearGradient>
                          </defs>
                          <polyline
                            points="0,30 20,25 40,22 60,18 80,12 100,8"
                            fill="none"
                            stroke="url(#line)"
                            strokeWidth="1"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {infoTab === 'strategies' && (
                  <div className="space-y-6">
                    {/* 3D Interactive Visualization */}
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-3">Interactive 3D Liquidity Visualization</h3>
                      <ErrorBoundary fallback={
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
                          <p className="text-sm text-orange-400">3D visualization unavailable. Your browser may not support WebGL.</p>
                        </div>
                      }>
                        <Suspense fallback={
                          <div className="bg-black/20 border border-white/5 rounded-xl p-8 flex items-center justify-center h-96">
                            <div className="text-center">
                              <svg className="animate-spin w-12 h-12 mx-auto mb-4 text-yellow-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-sm text-gray-400">Loading 3D visualization...</p>
                            </div>
                          </div>
                        }>
                          <VaultVisualization currentPrice={Number(data.wlfiPrice)} />
                        </Suspense>
                      </ErrorBoundary>
                    </div>

                    {/* Active Strategy Details */}
                    {getActiveStrategies().map((strategy) => (
                      <div key={strategy.id}>
                        <h3 className="text-white font-semibold mb-4">{strategy.name}</h3>
                        <div className="bg-black/40 border border-white/10 rounded-lg p-6">
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Protocol</span>
                              <span className="text-white">{strategy.protocol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Type</span>
                              <span className="text-white capitalize">{strategy.type.replace('-', ' ')}</span>
                            </div>
                            {strategy.details?.pool && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Pool</span>
                                <span className="text-white">{strategy.details.pool}</span>
                              </div>
                            )}
                            {strategy.details?.feeTier && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Fee Tier</span>
                                <span className="text-white">{strategy.details.feeTier}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-400">Allocation</span>
                              <span className="text-white">{strategy.allocation}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status</span>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-emerald-400">Active</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <h4 className="text-white text-sm font-semibold mb-3">Strategy Description</h4>
                          <p className="text-sm text-gray-400 leading-relaxed">{strategy.description}</p>
                          
                          {strategy.links && (
                            <div className="flex gap-3 mt-4">
                              {strategy.links.analytics && (
                                <a href={strategy.links.analytics} target="_blank" rel="noopener noreferrer" 
                                   className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-all">
                                  View Analytics →
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {infoTab === 'info' && (
                  <div className="space-y-6">
                    {/* Smart Contracts */}
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Smart Contracts
                      </h3>
                      <div className="bg-black/20 border border-white/5 rounded-xl p-6 space-y-5">
                        {/* Eagle Vault */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Eagle Vault Contract (ERC-4626)</div>
                          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                            <code className="text-sm font-mono text-yellow-500">{CONTRACTS.VAULT}</code>
                            <a 
                              href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                              title="View on Etherscan"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>

                        {/* Strategy Contract */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Strategy Contract</div>
                          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                            <code className="text-sm font-mono text-yellow-500">{CONTRACTS.STRATEGY}</code>
                            <a 
                              href={`https://etherscan.io/address/${CONTRACTS.STRATEGY}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>

                        {/* Charm Vault */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Charm Finance Vault</div>
                          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                            <code className="text-sm font-mono text-yellow-500">{CONTRACTS.CHARM_VAULT}</code>
                            <a 
                              href={`https://etherscan.io/address/${CONTRACTS.CHARM_VAULT}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>

                        {/* Wrapper */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Vault Wrapper Contract</div>
                          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                            <code className="text-sm font-mono text-yellow-500">{CONTRACTS.WRAPPER}</code>
                            <a 
                              href={`https://etherscan.io/address/${CONTRACTS.WRAPPER}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>

                        {/* OFT */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">LayerZero OFT Contract</div>
                          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                            <code className="text-sm font-mono text-yellow-500">{CONTRACTS.OFT}</code>
                            <a 
                              href={`https://etherscan.io/address/${CONTRACTS.OFT}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Token Contracts */}
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Token Contracts
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* WLFI */}
                        <div className="bg-black/20 border border-white/5 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <img src={ICONS.WLFI} alt="WLFI" className="w-10 h-10 rounded-full" />
                            <div>
                              <div className="text-sm font-semibold text-white">WLFI</div>
                              <div className="text-xs text-gray-500">World Liberty Financial</div>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Price</span>
                              <span className="text-white font-mono">${data.wlfiPrice}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Contract</span>
                              <a 
                                href={`https://etherscan.io/token/${CONTRACTS.WLFI}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-500 hover:underline font-mono"
                              >
                                {CONTRACTS.WLFI.slice(0, 6)}...{CONTRACTS.WLFI.slice(-4)}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* USD1 */}
                        <div className="bg-black/20 border border-white/5 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <img src={ICONS.USD1} alt="USD1" className="w-10 h-10 rounded-full" />
                            <div>
                              <div className="text-sm font-semibold text-white">USD1</div>
                              <div className="text-xs text-gray-500">World Liberty Stablecoin</div>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Price</span>
                              <span className="text-white font-mono">${data.usd1Price}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Contract</span>
                              <a 
                                href={`https://etherscan.io/token/${CONTRACTS.USD1}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-500 hover:underline font-mono"
                              >
                                {CONTRACTS.USD1.slice(0, 6)}...{CONTRACTS.USD1.slice(-4)}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* WETH */}
                        <div className="bg-black/20 border border-white/5 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <img src={ICONS.ETHEREUM} alt="WETH" className="w-10 h-10 rounded-full" />
                            <div>
                              <div className="text-sm font-semibold text-white">WETH</div>
                              <div className="text-xs text-gray-500">Wrapped Ether</div>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Contract</span>
                              <a 
                                href={`https://etherscan.io/token/${CONTRACTS.WETH}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-500 hover:underline font-mono"
                              >
                                {CONTRACTS.WETH.slice(0, 6)}...{CONTRACTS.WETH.slice(-4)}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technical Details */}
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-4">Technical Details</h3>
                      <div className="bg-black/20 border border-white/5 rounded-xl p-6">
                        <div className="grid grid-cols-2 gap-6 text-sm">
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Vault Standard</span>
                              <span className="text-white font-semibold">ERC-4626</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Share Token</span>
                              <span className="text-white font-semibold">vEAGLE</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Supply</span>
                              <span className="text-white font-mono">{Number(data.totalSupply).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Network</span>
                              <span className="text-white font-semibold">Ethereum Mainnet</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Chain ID</span>
                              <span className="text-white font-mono">1</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Version</span>
                              <span className="text-white font-semibold">1.0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resources */}
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-4">Resources</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <a 
                          href="https://docs.47eagle.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-black/20 border border-white/5 hover:border-yellow-500/30 rounded-xl p-5 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white group-hover:text-yellow-500 transition-colors">Documentation</div>
                              <div className="text-xs text-gray-500">Learn about Eagle</div>
                            </div>
                          </div>
                        </a>
                        <a 
                          href="https://t.me/Eagle_community_47" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-black/20 border border-white/5 hover:border-yellow-500/30 rounded-xl p-5 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white group-hover:text-yellow-500 transition-colors">Community</div>
                              <div className="text-xs text-gray-500">Join Telegram</div>
                            </div>
                          </div>
                        </a>
                        <a 
                          href="https://x.com/teameagle47" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-black/20 border border-white/5 hover:border-yellow-500/30 rounded-xl p-5 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white group-hover:text-yellow-500 transition-colors">Twitter</div>
                              <div className="text-xs text-gray-500">Follow updates</div>
                            </div>
                          </div>
                        </a>
                        <a 
                          href={`https://alpha.charm.fi/vault/${CONTRACTS.CHARM_VAULT}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-black/20 border border-white/5 hover:border-yellow-500/30 rounded-xl p-5 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white group-hover:text-yellow-500 transition-colors">Charm Analytics</div>
                              <div className="text-xs text-gray-500">View on Charm.fi</div>
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
