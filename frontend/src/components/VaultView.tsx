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

      // Simulate to see what contract will actually send
      let contractWlfi = 0;
      let contractUsd1 = 0;
      
      try {
        console.log('🧪 Running contract simulation...');
        const simulation = await vault.withdrawDual.staticCall(shares, account);
        contractWlfi = Number(formatEther(simulation[0]));
        contractUsd1 = Number(formatEther(simulation[1]));
        
        console.log('✅ Simulation succeeded!');
        console.log('Contract will send:', contractWlfi.toFixed(4), 'WLFI +', contractUsd1.toFixed(4), 'USD1');
        
        // Final check: Does vault have what contract will try to send?
        if (vaultWlfi < contractWlfi) {
          console.log('❌ Vault has', vaultWlfi.toFixed(2), 'WLFI but contract needs', contractWlfi.toFixed(2));
          onToast({ message: `Vault only has ${vaultWlfi.toFixed(2)} WLFI but contract needs ${contractWlfi.toFixed(2)}`, type: 'error' });
          setLoading(false);
          return;
        }
        if (vaultUsd1 < contractUsd1) {
          console.log('❌ Vault has', vaultUsd1.toFixed(2), 'USD1 but contract needs', contractUsd1.toFixed(2));
          onToast({ message: `Vault only has ${vaultUsd1.toFixed(2)} USD1 but contract needs ${contractUsd1.toFixed(2)}`, type: 'error' });
          setLoading(false);
          return;
        }
        
        console.log('✅ Vault has enough for what contract will send!');
      } catch (simError: any) {
        console.error('❌ Simulation failed:', simError.message);
        console.error('Full error:', simError);
        onToast({ message: `Contract simulation failed: ${simError.reason || simError.message}`, type: 'error' });
        setLoading(false);
        return;
      }

      // Proceed with actual withdrawal
      console.log('📤 Sending transaction...');
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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Eagle Vault</h1>
              <div className="flex items-center gap-2">
                <img src={ICONS.WLFI} alt="WLFI" className="w-8 h-8 rounded-full border-2 border-white shadow-lg" />
                <img src={ICONS.USD1} alt="USD1" className="w-8 h-8 rounded-full border-2 border-white shadow-lg" />
              </div>
            </div>
            <p className="text-sm text-gray-600 font-mono">{CONTRACTS.VAULT}</p>
          </div>
          <div className="flex items-center gap-2">
            <NeoButton
              onClick={handleSyncBalances}
              label="Sync Vault"
              className="!px-4 !py-2 !text-sm !bg-yellow-400 !text-gray-900"
            />
            <NeoButton
              onClick={handleRefresh}
              disabled={refreshing}
              label=""
              icon={
                <svg 
                  className={`w-4 h-4 text-gray-700 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              className="!px-3 !py-2 !w-auto !rounded-full"
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-neo-bg shadow-neo-raised rounded-full">
              <img 
                src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy"
                alt="vEAGLE"
                className="w-5 h-5"
              />
              <span className="text-sm text-gray-800 font-semibold">vEAGLE</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full shadow-neo-raised border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <img 
                src={ICONS.ETHEREUM}
                alt="Ethereum"
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm text-gray-800 font-semibold">Ethereum</span>
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
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-4">From wallet</p>
                    
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
                      className="w-full !py-4 !bg-gradient-to-r !from-yellow-400 !to-yellow-500 !text-gray-900 disabled:!opacity-50 disabled:!cursor-not-allowed"
                      disabled={loading || !account || (!wlfiAmount && !usd1Amount)}
                    />

                    {/* Preview */}
                    <div className="pt-4 border-t border-gray-300">
                      <div className="text-xs text-gray-600 font-medium mb-3 uppercase tracking-wider">You will receive</div>
                      <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl shadow-neo-pressed">
                        <img 
                          src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                          alt="vEAGLE"
                          className="w-8 h-8"
                        />
                        <div>
                          <div className="text-gray-900 font-bold">vEAGLE</div>
                          <div className="text-xs text-gray-600">Vault Shares</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-4">To wallet</p>
                    
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
                      className="w-full !py-4 !bg-gradient-to-r !from-yellow-400 !to-yellow-500 !text-gray-900"
                    />

                    {/* Preview */}
                    <div className="pt-4 border-t border-gray-300">
                      <div className="text-xs text-gray-600 font-medium mb-3 uppercase tracking-wider">You will receive</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl shadow-neo-pressed">
                          <span className="text-gray-700 font-medium">WLFI</span>
                          <span className="text-gray-900 font-bold">~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl shadow-neo-pressed">
                          <span className="text-gray-700 font-medium">USD1</span>
                          <span className="text-gray-900 font-bold">~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
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
              <div className="px-6 pt-6 pb-3 border-b border-gray-200/50">
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
                  <div className="space-y-8">
                    {/* Vault Description */}
                    <div className="text-center max-w-2xl mx-auto">
                      <h3 className="text-gray-900 font-semibold text-lg mb-3">ERC-4626 Tokenized Vault</h3>
                      <p className="text-gray-600 leading-relaxed">
                        A standardized vault accepting{' '}
                        <a href="https://worldlibertyfinancial.com/" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                          WLFI
                        </a>
                        {' '}and{' '}
                        <a href="https://worldlibertyfinancial.com/usd1" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                          USD1
                        </a>
                        , issuing vEAGLE shares that represent proportional ownership and automatically compound yields.
                      </p>
                    </div>

                    {/* Fee Structure */}
                    <div className="max-w-2xl mx-auto">
                      <h4 className="text-gray-900 font-semibold mb-4 text-center">Fee Structure</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm shadow-neo-inset rounded-xl p-5 border border-gray-200/50 hover:shadow-neo-hover transition-all">
                          <div className="text-xs text-gray-600 font-medium mb-2">Deposit</div>
                          <div className="text-2xl font-bold text-gray-900">1%</div>
                        </div>
                        <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm shadow-neo-inset rounded-xl p-5 border border-gray-200/50 hover:shadow-neo-hover transition-all">
                          <div className="text-xs text-gray-600 font-medium mb-2">Withdrawal</div>
                          <div className="text-2xl font-bold text-gray-900">2%</div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/80 shadow-neo-inset rounded-xl p-5 border-2 border-yellow-400/70 hover:shadow-neo-hover transition-all">
                          <div className="text-xs text-gray-700 font-medium mb-2">Performance</div>
                          <div className="text-2xl font-bold text-yellow-700">4.7%</div>
                          <div className="text-xs text-gray-600 mt-2">On profits only</div>
                        </div>
                      </div>
                    </div>

                    {/* Vault Assets */}
                    <div className="max-w-xl mx-auto">
                      <h4 className="text-gray-900 font-semibold mb-4 text-center">Accepted Assets</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm shadow-neo-inset rounded-xl p-6 border border-gray-200/50 text-center">
                          <img src={ICONS.WLFI} alt="WLFI" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white shadow-lg" />
                          <div className="text-gray-900 font-semibold text-lg">WLFI</div>
                          <div className="text-sm text-yellow-600 font-medium">${data.wlfiPrice}</div>
                          <div className="text-xs text-gray-500 mt-1">World Liberty Financial</div>
                        </div>
                        <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm shadow-neo-inset rounded-xl p-6 border border-gray-200/50 text-center">
                          <img src={ICONS.USD1} alt="USD1" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white shadow-lg" />
                          <div className="text-gray-900 font-semibold text-lg">USD1</div>
                          <div className="text-sm text-yellow-600 font-medium">${data.usd1Price}</div>
                          <div className="text-xs text-gray-500 mt-1">Stablecoin</div>
                        </div>
                      </div>
                    </div>

                    {/* Vault Contract */}
                    <div className="max-w-2xl mx-auto">
                      <h4 className="text-gray-900 font-semibold mb-4 text-center">Vault Contract</h4>
                      <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm shadow-neo-inset rounded-xl p-6 border border-gray-200/50">
                        <a 
                          href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center group"
                        >
                          <span className="text-gray-700 text-sm">ERC-4626 Vault</span>
                          <div className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700 transition-colors">
                            <code className="text-xs font-mono">
                              {CONTRACTS.VAULT.slice(0, 6)}...{CONTRACTS.VAULT.slice(-4)}
                            </code>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </a>
                      </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="flex items-center justify-center gap-4 flex-wrap pt-4 border-t border-gray-200/50">
                      <UniswapBadge />
                      <CharmBadge />
                      <LayerZeroBadge />
                    </div>
                  </div>
                )}

                {infoTab === 'strategies' && (
                  <div className="space-y-8">
                    {/* Strategy Overview */}
                    <div className="text-center">
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-full border-2 border-yellow-400 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-gray-900 font-semibold">Active Strategies</span>
                        </div>
                        <div className="w-px h-4 bg-yellow-400"></div>
                        <span className="text-2xl font-bold text-yellow-700">1</span>
                        <span className="text-gray-600">of</span>
                        <span className="text-xl font-semibold text-gray-700">5</span>
                      </div>
                      <p className="text-gray-600 text-sm max-w-xl mx-auto">
                        Currently deploying capital to 1 active strategy. 4 additional strategies available for future allocation.
                      </p>
                    </div>

                    {/* 3D Interactive Visualization */}
                    <div>
                      <h3 className="text-gray-900 font-bold text-lg mb-4">Interactive 3D Liquidity Visualization</h3>
                      <ErrorBoundary fallback={
                        <div className="bg-orange-50 border-2 border-orange-300 shadow-neo-pressed rounded-xl p-6">
                          <p className="text-sm text-orange-700 font-medium">3D visualization unavailable. Your browser may not support WebGL.</p>
                        </div>
                      }>
                        <Suspense fallback={
                          <div className="bg-white/50 shadow-neo-pressed rounded-xl p-8 flex items-center justify-center h-96">
                            <div className="text-center">
                              <svg className="animate-spin w-12 h-12 mx-auto mb-4 text-yellow-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-sm text-gray-700 font-medium">Loading 3D visualization...</p>
                            </div>
                          </div>
                        }>
                          <VaultVisualization currentPrice={Number(data.wlfiPrice)} />
                        </Suspense>
                      </ErrorBoundary>
                    </div>

                    {/* Active Strategy Card */}
                    {getActiveStrategies().map((strategy, index) => (
                      <div key={strategy.id} className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm shadow-neo-inset rounded-2xl p-8 border border-gray-200/50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="px-3 py-1 bg-yellow-100 border border-yellow-400 rounded-lg">
                                <span className="text-xs font-semibold text-yellow-700">Strategy {index + 1}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-700 font-medium">Active</span>
                              </div>
                            </div>
                            <h3 className="text-gray-900 font-semibold text-xl mb-2">{strategy.name}</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">{strategy.description}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Protocol</div>
                            <div className="text-gray-900 font-medium">{strategy.protocol}</div>
                          </div>
                          {strategy.details?.pool && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Pool</div>
                              <div className="text-gray-900 font-medium">{strategy.details.pool}</div>
                            </div>
                          )}
                          {strategy.details?.feeTier && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Fee Tier</div>
                              <div className="text-gray-900 font-medium">{strategy.details.feeTier}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Allocation</div>
                            <div className="text-yellow-600 font-semibold">{strategy.allocation}%</div>
                          </div>
                        </div>

                        {strategy.links && strategy.links.analytics && (
                          <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                            <a 
                              href={strategy.links.analytics} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-yellow-600 hover:text-yellow-700 font-medium text-sm inline-flex items-center gap-2 transition-colors"
                            >
                              View Analytics on Charm Finance
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            
                            {/* Strategy Contract */}
                            <div className="bg-white/50 rounded-lg p-4 border border-gray-200/50">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600 font-medium">Strategy Contract</span>
                                <a 
                                  href={`https://etherscan.io/address/${CONTRACTS.STRATEGY}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700 transition-colors"
                                >
                                  <code className="text-xs font-mono">
                                    {CONTRACTS.STRATEGY.slice(0, 6)}...{CONTRACTS.STRATEGY.slice(-4)}
                                  </code>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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
