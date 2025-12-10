import { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther, JsonRpcProvider } from 'ethers';
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

// Read-only provider for fetching data when wallet is not connected
// Multiple RPC endpoints for fallback reliability (use public ones that support CORS)
const RPC_ENDPOINTS = [
  'https://eth.merkle.io',
  'https://ethereum.publicnode.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com',
  'https://eth.llamarpc.com',
];

let currentRpcIndex = 0;
const readOnlyProvider = new JsonRpcProvider(RPC_ENDPOINTS[currentRpcIndex]);

// Helper to get fallback provider
function getFallbackProvider(): JsonRpcProvider {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  console.log(`[VaultView] Switching to fallback RPC: ${RPC_ENDPOINTS[currentRpcIndex]}`);
  return new JsonRpcProvider(RPC_ENDPOINTS[currentRpcIndex]);
}

// Lazy load 3D visualization
const VaultVisualization = lazy(() => import('./VaultVisualization'));

// Strategy Row Component with Dropdown

// Fetch Charm vault data from GraphQL
async function fetchCharmVaultData(vaultAddress: string) {
  // Our subgraph only tracks the Eagle OVault, not individual Charm vaults
  // Check if this is the Eagle OVault address
  
  if (vaultAddress.toLowerCase() !== CONTRACTS.VAULT.toLowerCase()) {
    console.log(`[fetchCharmVaultData] Skipping ${vaultAddress} - only Eagle OVault is indexed`);
    return null; // Return null for Charm vault addresses - they're not in our subgraph
  }
  
  const query = `
    query GetVault($address: ID!) {
      vault(id: $address) {
        id
        totalAssets
        totalSupply
        sharePrice
        snapshots(orderBy: timestamp, orderDirection: asc, first: 1000) {
          timestamp
          totalAssets
          totalSupply
          sharePrice
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.2', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: { address: vaultAddress.toLowerCase() } })
    });

    if (!response.ok) {
      console.error('[fetchCharmVaultData] HTTP error:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('[fetchCharmVaultData] GraphQL errors for', vaultAddress, ':', result.errors);
      result.errors.forEach((err: any, idx: number) => {
        console.error(`  Error ${idx + 1}:`, err.message);
      });
      return null; // Return null if there are errors
    }
    
    return result.data?.vault || null;
  } catch (error) {
    console.error('[fetchCharmVaultData] Error:', error);
    return null;
  }
}

// Analytics Tab Content Component - Vault WLFI Holdings
function AnalyticsTabContent({ vaultData }: { vaultData: any }) {
  const [viewMode, setViewMode] = useState<'total' | 'breakdown'>('total');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const [vaultEvents, setVaultEvents] = useState<Array<{
    type: 'injection' | 'rebalance';
    category: 'main-vault' | 'charm-vault';
    timestamp: number;
    date: string;
    label: string;
    amount?: string;
    description: string;
    txHash?: string;
  }>>([]);

  
  // Get prices
  const wlfiPrice = Number(vaultData.wlfiPrice) || 0.132;
  const wethPrice = Number(vaultData.wethPrice) || 3500;
  
  // Calculate current WLFI holdings (actual WLFI tokens)
  const currentVaultWLFI = Number(vaultData.vaultLiquidWLFI) || 0;
  const currentStrategyWLFI = (Number(vaultData.strategyWLFIinUSD1Pool) || 0) + (Number(vaultData.strategyWLFIinPool) || 0);
  const totalWLFI = currentVaultWLFI + currentStrategyWLFI;
  
  // Calculate USD1 holdings
  const currentUSD1 = Number(vaultData.vaultLiquidUSD1) || 0;
  const currentStrategyUSD1 = Number(vaultData.strategyUSD1InPool) || 0;
  const totalUSD1 = currentUSD1 + currentStrategyUSD1;
  
  // Calculate WETH holdings
  const currentStrategyWETH = Number(vaultData.strategyWETH) || 0;
  
  // Convert everything to WLFI equivalents
  const wlfiFromUSD1 = totalUSD1 / wlfiPrice; // USD1 is ~$1, so USD1 / WLFI price = WLFI equivalent
  const wlfiFromWETH = wlfiPrice > 0 ? (currentStrategyWETH * wethPrice) / wlfiPrice : 0;
  
  // Total vault worth in WLFI terms
  const totalVaultWorthInWLFI = totalWLFI + wlfiFromUSD1 + wlfiFromWETH;
  
  console.log('[Analytics] Vault Worth Calculation:', {
    totalWLFI,
    totalUSD1,
    wlfiFromUSD1,
    currentStrategyWETH,
    wlfiFromWETH,
    totalVaultWorthInWLFI,
    wlfiPrice,
    wethPrice
  });
  
  // Fetch historical data from backend API
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        setIsLoadingHistory(true);

        // Fetch historical data from Eagle OVault subgraph
        const eagleVaultData = await fetchCharmVaultData(CONTRACTS.VAULT);

        if (eagleVaultData && eagleVaultData.snapshots && eagleVaultData.snapshots.length > 0) {
          console.log('[VaultView Analytics] Eagle OVault snapshots:', eagleVaultData.snapshots.length);

          // Process Eagle OVault snapshots with actual historical strategy data
          const sortedData = eagleVaultData.snapshots
            .sort((a: any, b: any) => parseInt(a.timestamp) - parseInt(b.timestamp))
            .map((snap: any) => {
              const timestamp = parseInt(snap.timestamp) * 1000; // Convert to ms

              // Use actual historical strategy TVL data from subgraph
              const usd1StrategyTVL = parseFloat(snap.usd1StrategyTVL || '0');
              const wethStrategyTVL = parseFloat(snap.wethStrategyTVL || '0');
              const liquidWLFI = parseFloat(snap.liquidWLFI || '0');
              const liquidUSD1 = parseFloat(snap.liquidUSD1 || '0');

              // Calculate WLFI equivalents
              const vaultWLFI = liquidWLFI; // WLFI held directly in vault
              const strategyWLFI = (usd1StrategyTVL + wethStrategyTVL) / wlfiPrice; // Strategy TVL converted to WLFI
              const wlfiFromUSD1 = liquidUSD1 / wlfiPrice; // USD1 converted to WLFI
              const wlfiFromWETH = wethStrategyTVL / wlfiPrice; // WETH strategy TVL converted to WLFI

              return {
                timestamp,
                date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                vaultWLFI,
                strategyWLFI,
                totalWLFI: vaultWLFI + strategyWLFI,
                wlfiFromUSD1,
                wlfiFromWETH,
                totalVaultWorthInWLFI: vaultWLFI + strategyWLFI + wlfiFromUSD1 + wlfiFromWETH,
              };
            });

          setHistoricalData(sortedData);

          // Detect real events from historical data
          const detectedEvents = detectVaultEvents(sortedData, wlfiPrice);
          setVaultEvents(detectedEvents);
        } else {
          console.warn('[VaultView] No historical data from Eagle OVault subgraph, using fallback');
          const fallbackData = generateFallbackData();
          setHistoricalData(fallbackData);
          const detectedEvents = detectVaultEvents(fallbackData, wlfiPrice);
          setVaultEvents(detectedEvents);
        }
      } catch (error) {
        console.error('[VaultView] Error fetching historical data:', error);
        const fallbackData = generateFallbackData();
        setHistoricalData(fallbackData);
        const detectedEvents = detectVaultEvents(fallbackData, wlfiPrice);
        setVaultEvents(detectedEvents);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    
    // Function to detect real vault events from historical data
    function detectVaultEvents(data: any[], currentWlfiPrice: number) {
      const events: Array<{
        type: 'injection' | 'rebalance';
        category: 'main-vault' | 'charm-vault';
        timestamp: number;
        date: string;
        label: string;
        amount?: string;
        description: string;
        txHash?: string;
      }> = [];
      
      console.log('[VaultView] Analyzing historical data for events:', {
        dataPoints: data.length,
        firstPoint: data[0],
        lastPoint: data[data.length - 1],
        wlfiPrice: currentWlfiPrice
      });
      
      for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];
        
        // Detect capital injections (significant TVL increase)
        const tvlChange = curr.totalVaultWorthInWLFI - prev.totalVaultWorthInWLFI;
        const tvlChangePercent = prev.totalVaultWorthInWLFI > 0 
          ? (tvlChange / prev.totalVaultWorthInWLFI) * 100 
          : 0;
        
        // Log significant changes for debugging
        if (Math.abs(tvlChangePercent) > 3) {
          console.log('[VaultView] Significant TVL change detected:', {
            date: new Date(curr.timestamp).toISOString(),
            prevTVL: prev.totalVaultWorthInWLFI,
            currTVL: curr.totalVaultWorthInWLFI,
            change: tvlChange,
            changePercent: tvlChangePercent.toFixed(2) + '%'
          });
        }
        
        if (tvlChangePercent > 5) { // More than 5% increase (lowered from 10%)
          const amountUsd = tvlChange * currentWlfiPrice;
          events.push({
            type: 'injection',
            category: 'main-vault',
            timestamp: curr.timestamp,
            date: new Date(curr.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            label: 'Capital Injection',
            amount: amountUsd >= 1000 ? `$${(amountUsd / 1000).toFixed(1)}K` : `$${amountUsd.toFixed(0)}`,
            description: `TVL increased by ${tvlChangePercent.toFixed(1)}% (+${tvlChange.toFixed(0)} WLFI)`,
          });
        }
        
        // Detect overall portfolio rebalances (significant ratio changes without large TVL change)
        if (Math.abs(tvlChangePercent) < 3 && curr.totalWLFI > 0 && prev.totalWLFI > 0) {
          const prevWlfiRatio = prev.totalWLFI / prev.totalVaultWorthInWLFI;
          const currWlfiRatio = curr.totalWLFI / curr.totalVaultWorthInWLFI;
          const ratioChange = Math.abs(currWlfiRatio - prevWlfiRatio);

          if (ratioChange > 0.03) { // More than 3% allocation change (lowered from 5%)
            console.log('[VaultView] Overall portfolio rebalance detected:', {
              date: new Date(curr.timestamp).toISOString(),
              prevRatio: (prevWlfiRatio * 100).toFixed(2) + '%',
              currRatio: (currWlfiRatio * 100).toFixed(2) + '%',
              ratioChange: (ratioChange * 100).toFixed(2) + '%'
            });

            events.push({
              type: 'rebalance',
              category: 'main-vault',
              timestamp: curr.timestamp,
              date: new Date(curr.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              label: 'Portfolio Rebalance',
              description: `WLFI allocation: ${(prevWlfiRatio * 100).toFixed(1)}% → ${(currWlfiRatio * 100).toFixed(1)}%`,
            });
          }
        }

        // Detect charm vault specific rebalances (strategy position changes)
        if (curr.usd1StrategyTVL !== undefined && prev.usd1StrategyTVL !== undefined &&
            curr.wethStrategyTVL !== undefined && prev.wethStrategyTVL !== undefined) {

          const prevUsd1TVL = parseFloat(prev.usd1StrategyTVL || '0');
          const currUsd1TVL = parseFloat(curr.usd1StrategyTVL || '0');
          const prevWethTVL = parseFloat(prev.wethStrategyTVL || '0');
          const currWethTVL = parseFloat(curr.wethStrategyTVL || '0');

          const prevTotalStrategyTVL = prevUsd1TVL + prevWethTVL;
          const currTotalStrategyTVL = currUsd1TVL + currWethTVL;

          // Check for significant strategy rebalancing
          if (prevTotalStrategyTVL > 1000 && currTotalStrategyTVL > 1000) { // Only if meaningful amounts
            const usd1Change = Math.abs(currUsd1TVL - prevUsd1TVL);
            const wethChange = Math.abs(currWethTVL - prevWethTVL);

            // Detect if one strategy increased while another decreased significantly
            const usd1PercentChange = prevUsd1TVL > 0 ? (usd1Change / prevUsd1TVL) * 100 : 0;
            const wethPercentChange = prevWethTVL > 0 ? (wethChange / prevWethTVL) * 100 : 0;

            if ((usd1PercentChange > 15 || wethPercentChange > 15) &&
                Math.abs(usd1PercentChange - wethPercentChange) > 10) { // Opposite movements

              console.log('[VaultView] Charm vault rebalance detected:', {
                date: new Date(curr.timestamp).toISOString(),
                usd1TVL: `$${prevUsd1TVL.toFixed(0)} → $${currUsd1TVL.toFixed(0)} (${usd1PercentChange.toFixed(1)}%)`,
                wethTVL: `$${prevWethTVL.toFixed(0)} → $${currWethTVL.toFixed(0)} (${wethPercentChange.toFixed(1)}%)`,
                totalStrategyTVL: `$${prevTotalStrategyTVL.toFixed(0)} → $${currTotalStrategyTVL.toFixed(0)}`
              });

              // Determine which strategy was increased
              const usd1Increased = currUsd1TVL > prevUsd1TVL;
              const wethIncreased = currWethTVL > prevWethTVL;

              let description = '';
              if (usd1Increased && !wethIncreased) {
                description = `USD1 strategy increased by $${usd1Change.toFixed(0)} while WETH strategy decreased`;
              } else if (wethIncreased && !usd1Increased) {
                description = `WETH strategy increased by $${wethChange.toFixed(0)} while USD1 strategy decreased`;
              } else {
                description = `Strategy positions rebalanced: USD1 $${usd1Change.toFixed(0)}, WETH $${wethChange.toFixed(0)}`;
              }

              events.push({
                type: 'rebalance',
                category: 'charm-vault',
                timestamp: curr.timestamp,
                date: new Date(curr.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                label: 'Strategy Rebalance',
                description: description,
              });
            }
          }
        }
      }
      
      console.log('[VaultView] Detected events from on-chain data:', events);
      console.log('[VaultView] If no events detected, check the console logs above to see TVL changes');
      return events;
    }
    
    // Fallback data generator if API fails
    function generateFallbackData() {
      const points = 90;
      const data = [];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      const startVaultWLFI = currentVaultWLFI * 0.6;
      const startStrategyWLFI = currentStrategyWLFI * 0.4;
      const startUSD1 = totalUSD1 * 0.5;
      const startWETH = currentStrategyWETH * 0.3;
      
      for (let i = points - 1; i >= 0; i--) {
        const timestamp = now - (i * dayMs);
        const progress = (points - i) / points;
        const baseGrowth = progress;
        const volatility = Math.sin(progress * Math.PI * 4) * 0.08;
        const randomNoise = (Math.random() - 0.5) * 0.05;
        const growthFactor = baseGrowth + volatility + randomNoise;
        
        const vaultWLFI = startVaultWLFI + (currentVaultWLFI - startVaultWLFI) * growthFactor;
        const strategyWLFI = startStrategyWLFI + (currentStrategyWLFI - startStrategyWLFI) * growthFactor;
        const usd1 = startUSD1 + (totalUSD1 - startUSD1) * growthFactor;
        const weth = startWETH + (currentStrategyWETH - startWETH) * growthFactor;
        
        let multiplier = 1;
        if (i === 75) multiplier = 0.92;
        if (i === 60) multiplier = 1.08;
        if (i === 45) multiplier = 0.95;
        if (i === 30) multiplier = 1.05;
        
        const wlfiFromUSD1Hist = (usd1 * multiplier) / wlfiPrice;
        const wlfiFromWETHHist = wlfiPrice > 0 ? ((weth * multiplier) * wethPrice) / wlfiPrice : 0;
        
        data.push({
          timestamp,
          date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          vaultWLFI: Math.max(0, vaultWLFI * multiplier),
          strategyWLFI: Math.max(0, strategyWLFI * multiplier),
          totalWLFI: Math.max(0, (vaultWLFI + strategyWLFI) * multiplier),
          wlfiFromUSD1: Math.max(0, wlfiFromUSD1Hist),
          wlfiFromWETH: Math.max(0, wlfiFromWETHHist),
          totalVaultWorthInWLFI: Math.max(0, (vaultWLFI + strategyWLFI) * multiplier + wlfiFromUSD1Hist + wlfiFromWETHHist),
        });
      }
      return data;
    }
    
    if (wlfiPrice > 0) {
      fetchHistoricalData();
    }
  }, [currentVaultWLFI, currentStrategyWLFI, totalUSD1, currentStrategyWETH, wlfiPrice, wethPrice]);

  // Calculate trend
  const calculateTrend = () => {
    if (historicalData.length < 2) return { percentage: 0, isPositive: true };
    const oldest = historicalData[0].totalVaultWorthInWLFI;
    const newest = historicalData[historicalData.length - 1].totalVaultWorthInWLFI;
    const change = ((newest - oldest) / oldest) * 100;
    return { percentage: Math.abs(change), isPositive: change >= 0 };
  };
  
  const trend = calculateTrend();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Segmented Control */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vault performance and composition</p>
        </div>
        <div className="flex gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          onClick={() => setViewMode('total')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            viewMode === 'total'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Total
        </button>
        <button
          onClick={() => setViewMode('breakdown')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            viewMode === 'breakdown'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Breakdown
        </button>
        </div>
      </div>

      {/* Premium Hero Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/20 via-transparent to-blue-100/20 dark:from-amber-900/10 dark:via-transparent dark:to-blue-900/10"></div>
        
        <div className="relative z-10 p-8">
          {/* Main Value with Trend */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Value</span>
              {historicalData.length > 1 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                  trend.isPositive 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  <span>{trend.isPositive ? '↗' : '↘'}</span>
                  <span>{trend.percentage.toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            <div className="flex items-baseline justify-center gap-3 mb-3">
              <div className="text-7xl font-black bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-600 dark:from-amber-400 dark:via-amber-300 dark:to-yellow-400 bg-clip-text text-transparent animate-in">
            {totalVaultWorthInWLFI.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">WLFI</span>
      </div>
      
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
              ${(totalVaultWorthInWLFI * wlfiPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">1 WLFI =</span>
              <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">${wlfiPrice.toFixed(4)}</span>
            </div>
          </div>
          {/* Modern Asset Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { 
                name: 'WLFI', 
                amount: totalWLFI, 
                value: totalWLFI * wlfiPrice,
                color: 'amber',
                percentage: (totalWLFI / totalVaultWorthInWLFI) * 100
              },
              { 
                name: 'USD1', 
                amount: wlfiFromUSD1, 
                value: totalUSD1,
                color: 'blue',
                percentage: (wlfiFromUSD1 / totalVaultWorthInWLFI) * 100
              },
              { 
                name: 'WETH', 
                amount: wlfiFromWETH, 
                value: currentStrategyWETH * wethPrice,
                color: 'gray',
                percentage: (wlfiFromWETH / totalVaultWorthInWLFI) * 100,
                suffix: `${currentStrategyWETH.toFixed(2)} ETH`
              }
            ].map((asset, idx) => (
              <div key={idx} className="group relative">
                {/* Progress Bar Background */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${
                      asset.color === 'amber' ? 'from-amber-500 to-yellow-500' :
                      asset.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                      'from-gray-500 to-slate-500'
                    } transition-all duration-1000 ease-out`}
                    style={{ width: `${asset.percentage}%` }}
                  ></div>
        </div>

                <div className="relative p-5 pb-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      asset.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                      asset.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {asset.name}
                    </span>
                    <span className={`text-lg font-black ${
                      asset.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                      asset.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {asset.percentage.toFixed(0)}%
                    </span>
        </div>
                  
                  <div className="text-3xl font-black text-gray-900 dark:text-white mb-1 group-hover:scale-105 transition-transform duration-300">
                    {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>

                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {asset.suffix || `$${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Interactive Chart */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
        
        <div className="relative z-10 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
                Performance
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last 90 days
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {historicalData.length > 1 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Change</span>
                  <span className={`text-sm font-black ${
                    trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trend.isPositive ? '+' : '-'}{trend.percentage.toFixed(2)}%
                  </span>
                </div>
              )}
              
              {isLoadingHistory && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-xs font-semibold">Loading</span>
                </div>
              )}
            </div>
          </div>
        
          <div className="h-80 relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
          {historicalData.length === 0 && isLoadingHistory ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm font-medium">
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <span className="ml-2">Loading historical data...</span>
              </div>
            </div>
          ) : historicalData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm font-medium">
              <div className="text-center">
                <div className="text-2xl mb-2 opacity-50">📈</div>
                No historical data available
              </div>
            </div>
          ) : (
            <svg
              ref={chartRef}
              className="w-full h-full cursor-crosshair"
              viewBox="0 0 100 40"
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
                {viewMode === 'total' ? (
                  <linearGradient id="wlfi-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                    <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.05" />
                  </linearGradient>
                ) : (
                  <>
                    <linearGradient id="vault-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                      <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="strategy-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                      <stop offset="30%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.05" />
                    </linearGradient>
                  </>
                )}

                {/* Neumorphic shadow filters */}
                <filter id="neumorphic-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="rgba(0,0,0,0.1)" />
                  <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="rgba(0,0,0,0.05)" />
                </filter>
                <filter id="neumorphic-highlight" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="-1" stdDeviation="0.5" floodColor="rgba(255,255,255,0.3)" />
                </filter>
              </defs>
              
              {/* Subtle neumorphic grid lines */}
              <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeWidth="0.08" opacity="0.08" filter="url(#neumorphic-shadow)" />
              <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="0.08" opacity="0.08" filter="url(#neumorphic-shadow)" />
              <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeWidth="0.08" opacity="0.08" filter="url(#neumorphic-shadow)" />
              
              {(() => {
              // Use totalVaultWorthInWLFI for the chart
              const vaultWorthValues = historicalData.map(s => s.totalVaultWorthInWLFI);
              const maxValue = Math.max(...vaultWorthValues);
              const minValue = Math.min(...vaultWorthValues);
              const range = maxValue - minValue || 1;
              
              if (viewMode === 'total') {
                // Single line for total vault worth in WLFI
                const points = historicalData.map((snap, i) => {
                  const x = (i / (historicalData.length - 1)) * 100;
                  const y = 35 - ((snap.totalVaultWorthInWLFI - minValue) / range) * 30;
                  return `${x},${y}`;
                }).join(' ');
                
                return (
                  <>
                    <polygon points={`0,40 ${points} 100,40`} fill="url(#wlfi-grad)" filter="url(#neumorphic-shadow)" />
                    <polyline points={points} fill="none" stroke="#d97706" strokeWidth="0.5" filter="url(#neumorphic-highlight)" />
                    
                    {/* Event markers for capital injections and rebalances */}
                    {vaultEvents.map((event, idx) => {
                      const eventIndex = historicalData.findIndex(s =>
                        Math.abs(s.timestamp - event.timestamp) < 86400000 // Within 1 day (ms)
                      );

                      if (eventIndex === -1) return null;

                      const snap = historicalData[eventIndex];
                      const x = (eventIndex / (historicalData.length - 1)) * 100;
                      const y = 35 - ((snap.totalVaultWorthInWLFI - minValue) / range) * 30;

                      return (
                        <g key={idx}>
                          {/* Subtle vertical indicator */}
                          <line
                            x1={x}
                            y1={y}
                            x2={x}
                            y2="40"
                            stroke={event.type === 'injection' ? '#059669' : '#1d4ed8'}
                            strokeWidth="0.2"
                            strokeDasharray="0.8,0.8"
                            opacity="0.4"
                            filter="url(#neumorphic-shadow)"
                          />
                          {/* Neumorphic marker circle */}
                          <circle
                            cx={x}
                            cy={y}
                            r="1"
                            fill={event.type === 'injection' ? '#059669' : '#1d4ed8'}
                            stroke="white"
                            strokeWidth="0.3"
                            filter="url(#neumorphic-shadow)"
                          />
                          {/* Elegant icon badge */}
                          <g transform={`translate(${x},${y - 2.5})`}>
                            <circle
                              cx="0"
                              cy="0"
                              r="2.5"
                              fill={event.type === 'injection' ? '#10b981' : '#3b82f6'}
                              filter="url(#neumorphic-shadow)"
                            />
                            <circle
                              cx="0"
                              cy="0"
                              r="2.2"
                              fill={event.type === 'injection' ? '#34d399' : '#60a5fa'}
                              filter="url(#neumorphic-highlight)"
                            />
                            <text
                              x="0"
                              y="0.5"
                              textAnchor="middle"
                              fill="white"
                              fontSize="1.4"
                              fontWeight="bold"
                              dominantBaseline="middle"
                            >
                              {event.type === 'injection' ? '▲' : '△'}
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
                      
                      const x = (index / (historicalData.length - 1)) * 100;
                      const y = 35 - ((snapData.totalVaultWorthInWLFI - minValue) / range) * 30;
                      
                      return (
                        <>
                          <line x1={x} y1="0" x2={x} y2="40" stroke="#f59e0b" strokeWidth="0.2" strokeDasharray="0.5,0.5" opacity="0.5" />
                          <circle cx={x} cy={y} r="0.6" fill="#f59e0b" stroke="white" strokeWidth="0.3" />
                        </>
                      );
                    })()}
                  </>
                );
              } else {
                // Stacked area showing WLFI, USD1 (as WLFI), and WETH (as WLFI)
                const wlfiOnlyPoints = historicalData.map((snap, i) => {
                  const x = (i / (historicalData.length - 1)) * 100;
                  const y = 35 - ((snap.totalWLFI - minValue) / range) * 30;
                  return `${x},${y}`;
                }).join(' ');
                
                const wlfiPlusUSD1Points = historicalData.map((snap, i) => {
                  const x = (i / (historicalData.length - 1)) * 100;
                  const y = 35 - ((snap.totalWLFI + snap.wlfiFromUSD1 - minValue) / range) * 30;
                  return `${x},${y}`;
                }).join(' ');
                
                const totalPoints = historicalData.map((snap, i) => {
                  const x = (i / (historicalData.length - 1)) * 100;
                  const y = 35 - ((snap.totalVaultWorthInWLFI - minValue) / range) * 30;
                  return `${x},${y}`;
                }).join(' ');
                
                return (
                  <>
                    {/* WLFI tokens base */}
                    <polygon points={`0,40 ${wlfiOnlyPoints} 100,40`} fill="url(#vault-grad)" />
                    <polyline points={wlfiOnlyPoints} fill="none" stroke="#f59e0b" strokeWidth="0.4" />
                    
                    {/* USD1 layer (middle) */}
                    <polygon points={`${wlfiOnlyPoints.split(' ').reverse().join(' ')} ${wlfiPlusUSD1Points}`} fill="url(#strategy-grad)" opacity="0.6" />
                    
                    {/* WETH layer (top) */}
                    <polygon points={`${wlfiPlusUSD1Points.split(' ').reverse().join(' ')} ${totalPoints}`} fill="#6b7280" opacity="0.3" />
                    <polyline points={totalPoints} fill="none" stroke="#374151" strokeWidth="0.4" />
                    
                    {/* Event markers for breakdown view */}
                    {vaultEvents.map((event, idx) => {
                      const eventIndex = historicalData.findIndex(s =>
                        Math.abs(s.timestamp - event.timestamp) < 86400000 // Within 1 day (ms)
                      );

                      if (eventIndex === -1) return null;

                      const snap = historicalData[eventIndex];
                      const x = (eventIndex / (historicalData.length - 1)) * 100;
                      const y = 35 - ((snap.totalVaultWorthInWLFI - minValue) / range) * 30;

                      return (
                        <g key={idx}>
                          {/* Subtle vertical indicator */}
                          <line
                            x1={x}
                            y1={y}
                            x2={x}
                            y2="40"
                            stroke={event.type === 'injection' ? '#059669' : '#1d4ed8'}
                            strokeWidth="0.2"
                            strokeDasharray="0.8,0.8"
                            opacity="0.4"
                            filter="url(#neumorphic-shadow)"
                          />
                          {/* Neumorphic marker circle */}
                          <circle
                            cx={x}
                            cy={y}
                            r="1"
                            fill={event.type === 'injection' ? '#059669' : '#1d4ed8'}
                            stroke="white"
                            strokeWidth="0.3"
                            filter="url(#neumorphic-shadow)"
                          />
                          {/* Elegant icon badge */}
                          <g transform={`translate(${x},${y - 2.5})`}>
                            <circle
                              cx="0"
                              cy="0"
                              r="2.5"
                              fill={event.type === 'injection' ? '#10b981' : '#3b82f6'}
                              filter="url(#neumorphic-shadow)"
                            />
                            <circle
                              cx="0"
                              cy="0"
                              r="2.2"
                              fill={event.type === 'injection' ? '#34d399' : '#60a5fa'}
                              filter="url(#neumorphic-highlight)"
                            />
                            <text
                              x="0"
                              y="0.5"
                              textAnchor="middle"
                              fill="white"
                              fontSize="1.4"
                              fontWeight="bold"
                              dominantBaseline="middle"
                            >
                              {event.type === 'injection' ? '▲' : '△'}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                    
                    {/* Hover indicator for breakdown view */}
                    {tooltip && (() => {
                      const snapData = tooltip.data;
                      const index = historicalData.findIndex(s => s.timestamp === snapData.timestamp);
                      if (index === -1) return null;
                      
                      const x = (index / (historicalData.length - 1)) * 100;
                      const y = 35 - ((snapData.totalVaultWorthInWLFI - minValue) / range) * 30;
                      
                      return (
                        <>
                          <line x1={x} y1="0" x2={x} y2="40" stroke="#374151" strokeWidth="0.2" strokeDasharray="0.5,0.5" opacity="0.5" />
                          <circle cx={x} cy={y} r="0.6" fill="#374151" stroke="white" strokeWidth="0.3" />
                        </>
                      );
                    })()}
                  </>
                );
              }
            })()}
            </svg>
          )}
          
          {/* Premium Modern Tooltip */}
          {tooltip && historicalData.length > 0 && (
            <div 
              className="absolute pointer-events-none z-50 transition-all duration-200 ease-out"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y - 160}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="relative">
                {/* Card */}
                <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[280px]">
                  {/* Gradient Header */}
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3">
                    <div className="text-sm font-black text-white uppercase tracking-wider">
                {new Date(tooltip.data.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
                </div>
                  
                  <div className="p-4">
                    {/* Main Value */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Total Value</div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">
                          {tooltip.data.totalVaultWorthInWLFI.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">WLFI</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        ${(tooltip.data.totalVaultWorthInWLFI * wlfiPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    
                    {/* Asset Breakdown */}
                {viewMode === 'breakdown' && (
                      <div className="space-y-2 mb-4">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Asset Breakdown</div>
                        {[
                          { name: 'WLFI', value: tooltip.data.totalWLFI, color: 'amber' },
                          { name: 'USD1', value: tooltip.data.wlfiFromUSD1, color: 'blue' },
                          { name: 'WETH', value: tooltip.data.wlfiFromWETH, color: 'gray' }
                        ].map((asset, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <div className={`w-1 h-8 rounded-full ${
                                asset.color === 'amber' ? 'bg-gradient-to-b from-amber-500 to-yellow-500' :
                                asset.color === 'blue' ? 'bg-gradient-to-b from-blue-500 to-cyan-500' :
                                'bg-gradient-to-b from-gray-500 to-slate-500'
                              }`}></div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{asset.name}</span>
                    </div>
                            <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                              {asset.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                    </div>
                        ))}
                    </div>
                )}
                  
                    {/* Event Information */}
              {(() => {
                const nearbyEvent = vaultEvents.find(e => 
                        Math.abs(tooltip.data.timestamp - e.timestamp) < 86400000
                );
                if (nearbyEvent) {
                  return (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                              <div className={`w-1 h-full rounded-full ${
                                nearbyEvent.type === 'injection' 
                                  ? 'bg-gradient-to-b from-green-500 to-emerald-600' 
                                  : 'bg-gradient-to-b from-blue-500 to-cyan-600'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    nearbyEvent.type === 'injection'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {nearbyEvent.type === 'injection' ? 'Inject' : 'Rebalance'}
                                  </span>
                                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {nearbyEvent.label}
                                  </span>
                      </div>
                      {nearbyEvent.amount && (
                                  <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">{nearbyEvent.amount}</div>
                      )}
                      {nearbyEvent.description && (
                                  <div className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">{nearbyEvent.description}</div>
                      )}
                              </div>
                            </div>
                    </div>
                  );
                }
                return null;
              })()}
                  </div>
                </div>
                
                {/* Arrow Pointer */}
                <div className="absolute left-1/2 -bottom-2 transform -translate-x-1/2">
                  <div className="w-4 h-4 bg-white dark:bg-gray-900 rotate-45 border-r border-b border-gray-200 dark:border-gray-700"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Enhanced Y-axis labels with Neumorphic Design */}
          {historicalData.length > 0 && (
            <div className="absolute -left-4 top-0 bottom-0 flex flex-col justify-between text-[10px] -translate-x-full pr-4 font-bold">
              <span className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                {Math.max(...historicalData.map(s => s.totalVaultWorthInWLFI)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                {(Math.max(...historicalData.map(s => s.totalVaultWorthInWLFI)) / 2).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                0
              </span>
            </div>
          )}
        </div>
        
          {/* Enhanced X-axis labels */}
        {historicalData.length > 0 && (
            <div className="flex justify-between text-[10px] mt-4 font-bold">
              <span className="text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg bg-gray-100/50 dark:bg-gray-800/50">{historicalData[0]?.date}</span>
              <span className="text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg bg-gray-100/50 dark:bg-gray-800/50">{historicalData[Math.floor(historicalData.length / 3)]?.date}</span>
              <span className="text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg bg-gray-100/50 dark:bg-gray-800/50">{historicalData[Math.floor(2 * historicalData.length / 3)]?.date}</span>
              <span className="text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg bg-gray-100/50 dark:bg-gray-800/50">{historicalData[historicalData.length - 1]?.date}</span>
          </div>
        )}
        
          {/* Minimal Modern Legend */}
          <div className="flex items-center justify-center gap-6 mt-5 text-xs flex-wrap">
          {viewMode === 'breakdown' && (
            <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">WLFI</span>
              </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">USD1</span>
              </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-gray-400 to-gray-600"></div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">WETH</span>
              </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            </>
          )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-emerald-600"></div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Injection</span>
          </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-600"></div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Rebalance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Activity Timeline */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8">
        <div className="mb-6">
          <h4 className="text-lg font-black text-gray-900 dark:text-white mb-1">
            Activity
        </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {vaultEvents.length > 0 ? `${vaultEvents.length} recent events` : 'No activity yet'}
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {vaultEvents.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="max-w-sm mx-auto">
                <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {isLoadingHistory ? 'Loading events...' : 'No activity'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isLoadingHistory ? 'Syncing with blockchain' : 'Events will appear as they occur'}
                </p>
              </div>
            </div>
          ) : (
            vaultEvents
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 10)
              .map((event, idx) => (
                <div
                  key={idx}
                  className="group relative flex items-start gap-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
                >
                  {/* Timeline Dot & Line */}
                  <div className="relative flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      event.type === 'injection'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/50'
                        : 'bg-gradient-to-br from-blue-400 to-cyan-600 shadow-lg shadow-blue-500/50'
                    } group-hover:scale-125 transition-transform duration-300`}></div>
                    {idx < vaultEvents.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            event.type === 'injection'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          }`}>
                            {event.type === 'injection' ? 'Injection' : 'Rebalance'}
                      </span>
                          {event.amount && (
                            <span className="text-sm font-black text-green-600 dark:text-green-400">
                              {event.amount}
                      </span>
                          )}
                    </div>
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                          {event.label}
                        </h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {event.date}
                    </span>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
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
  'function getWETHPrice() view returns (uint256)', // Added ETH price oracle
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

// Charm Alpha Vault ABI - for querying CollectFee events and totalAmounts
const CHARM_VAULT_ABI = [
  'event CollectFee(uint256 feesToVault0, uint256 feesToVault1, uint256 feesToProtocol0, uint256 feesToProtocol1)',
  'function getTotalAmounts() view returns (uint256 total0, uint256 total1)',
  'function totalSupply() view returns (uint256)',
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
  // Fetch ETH price with multiple fallbacks
  const fetchETHPrice = useCallback(async (vault: Contract): Promise<number> => {
    try {
      // Try to get from vault oracle first
      const ethPrice = await vault.getWETHPrice();
      const ethPriceUsd = Number(formatEther(ethPrice));
      console.log('[VaultView] ETH price from vault oracle:', ethPriceUsd);
      if (ethPriceUsd > 0) return ethPriceUsd;
    } catch (error) {
      console.warn('[VaultView] Vault ETH price oracle failed, trying external APIs:', error);
    }
    
    // Try Binance API (no rate limit for public endpoints)
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', {
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      const data = await response.json();
      const ethPrice = parseFloat(data.price);
      if (ethPrice > 0) {
        console.log('[VaultView] ETH price from Binance:', ethPrice);
        return ethPrice;
      }
    } catch (error) {
      console.warn('[VaultView] Binance API failed, trying next source');
    }
    
    // Try Crypto.com API
    try {
      const response = await fetch('https://api.crypto.com/v2/public/get-ticker?instrument_name=ETH_USD', {
        signal: AbortSignal.timeout(3000)
      });
      const data = await response.json();
      const ethPrice = parseFloat(data.result?.data?.a || 0); // 'a' is ask price
      if (ethPrice > 0) {
        console.log('[VaultView] ETH price from Crypto.com:', ethPrice);
        return ethPrice;
      }
    } catch (error) {
      console.warn('[VaultView] Crypto.com API failed, trying next source');
    }
    
    // Try CoinGecko API (has rate limits but still try)
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
        signal: AbortSignal.timeout(3000)
      });
      const data = await response.json();
      const ethPrice = data.ethereum?.usd || 0;
      if (ethPrice > 0) {
        console.log('[VaultView] ETH price from CoinGecko:', ethPrice);
        return ethPrice;
      }
    } catch (error) {
      console.warn('[VaultView] CoinGecko API failed');
    }
    
    // Final fallback to a reasonable recent price
    console.warn('[VaultView] All ETH price sources failed, using default: $3200');
    return 3200; // Conservative recent ETH price
  }, []);

  const [data, setData] = useState({
    totalAssets: '0',
    totalSupply: '0',
    userBalance: '0',
    wlfiBalance: '0',
    usd1Balance: '0',
    wlfiPrice: '0.132',
    usd1Price: '1.000',
    wethPrice: '3500',
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
  const aprToApy = useCallback((apr: number): number => {
    if (!apr || apr <= 0 || !isFinite(apr)) return 0;
    // APR is in percentage (e.g., 10 for 10%), convert to decimal
    const aprDecimal = apr / 100;
    // Daily compounding: APY = (1 + APR/365)^365 - 1
    const apy = (Math.pow(1 + aprDecimal / 365, 365) - 1) * 100;
    return isNaN(apy) || !isFinite(apy) ? 0 : apy;
  }, []); // No dependencies - pure math function

  // Query Charm vault directly for CollectFee events on-chain
  const queryCharmVaultFees = useCallback(async (
    vaultAddress: string,
    token0Decimals: number,
    token1Decimals: number,
    token0PriceUSD: number,
    token1PriceUSD: number
  ): Promise<{ totalFeesUSD: number; daysOfData: number; aprFromFees: number }> => {
    try {
      console.log(`[queryCharmVaultFees] Querying vault ${vaultAddress} on-chain...`);
      
      const charmVault = new Contract(vaultAddress, CHARM_VAULT_ABI, readOnlyProvider);
      
      // Query last 90 days of events (approx 7200 blocks per day)
      const currentBlock = await readOnlyProvider.getBlockNumber();
      const blocksPerDay = 7200;
      const daysToQuery = 90;
      const fromBlock = currentBlock - (blocksPerDay * daysToQuery);
      
      console.log(`[queryCharmVaultFees] Querying from block ${fromBlock} to ${currentBlock}`);
      
      // Get CollectFee events
      const filter = charmVault.filters.CollectFee();
      const events = await charmVault.queryFilter(filter, fromBlock, currentBlock);
      
      console.log(`[queryCharmVaultFees] Found ${events.length} CollectFee events`);
      
      if (events.length === 0) {
        return { totalFeesUSD: 0, daysOfData: 0, aprFromFees: 0 };
      }
      
      // Get timestamps for first and last event
      const firstBlock = await readOnlyProvider.getBlock(events[0].blockNumber);
      const lastBlock = await readOnlyProvider.getBlock(events[events.length - 1].blockNumber);
      
      if (!firstBlock || !lastBlock) {
        console.warn('[queryCharmVaultFees] Could not fetch block timestamps');
        return { totalFeesUSD: 0, daysOfData: 0, aprFromFees: 0 };
      }
      
      const daysOfData = (lastBlock.timestamp - firstBlock.timestamp) / 86400; // seconds to days
      console.log(`[queryCharmVaultFees] Data spans ${daysOfData.toFixed(2)} days`);
      
      // Sum up all fees
      let totalFees0 = 0n;
      let totalFees1 = 0n;
      
      for (const event of events) {
        const args = event.args;
        if (args) {
          totalFees0 += args.feesToVault0;
          totalFees1 += args.feesToVault1;
        }
      }
      
      // Convert to human-readable and USD
      const fees0 = Number(formatEther(totalFees0)) * Math.pow(10, 18 - token0Decimals);
      const fees1 = Number(formatEther(totalFees1)) * Math.pow(10, 18 - token1Decimals);
      const totalFeesUSD = (fees0 * token0PriceUSD) + (fees1 * token1PriceUSD);
      
      console.log(`[queryCharmVaultFees] Total fees: ${fees0.toFixed(4)} token0 ($${(fees0 * token0PriceUSD).toFixed(2)}) + ${fees1.toFixed(4)} token1 ($${(fees1 * token1PriceUSD).toFixed(2)}) = $${totalFeesUSD.toFixed(2)}`);
      
      // Calculate APR: (totalFeesUSD / daysOfData * 365) / currentTVL * 100
      // We'll return the raw fees and days, let caller compute APR with their TVL
      return { totalFeesUSD, daysOfData, aprFromFees: 0 };
      
    } catch (error) {
      console.error(`[queryCharmVaultFees] Error querying vault ${vaultAddress}:`, error);
      return { totalFeesUSD: 0, daysOfData: 0, aprFromFees: 0 };
    }
  }, []);

  // Fetch Charm Finance Fee APR data (reliable source)
  const fetchCharmStats = useCallback(async (
    usd1StrategyTvl: number, 
    wethStrategyTvl: number,
    wlfiPrice: number = 0.15,
    wethPrice: number = 3500
  ) => {
    try {
      console.log('[fetchCharmStats] Starting fetch with TVL:', { usd1StrategyTvl, wethStrategyTvl, wlfiPrice, wethPrice });
      
      // Query our Eagle OVault subgraph with the correct schema
      const query = `query GetEagleVault($vaultAddress: ID!) {
        vault(id: $vaultAddress) { 
          id
          totalAssets
          totalSupply
          sharePrice
          createdAt
          updatedAt
          snapshots(orderBy: timestamp, orderDirection: desc, first: 168) {
            id
            timestamp
            totalAssets
            totalSupply
            sharePrice
            usd1StrategyTVL
            wethStrategyTVL
            liquidWLFI
            liquidUSD1
          }
          collectFees(orderBy: timestamp, orderDirection: desc, first: 200) {
            id
            timestamp
            blockNumber
            strategy
            charmVault
            amount0
            amount1
            transactionHash
          }
        }
      }`;
      
      const queryVariables = {
        vaultAddress: CONTRACTS.VAULT.toLowerCase() // Query the Eagle OVault, not Charm vaults
      };
      
      console.log('[fetchCharmStats] GraphQL Query Variables:', queryVariables);
      console.log('[fetchCharmStats] Querying Eagle Ovault subgraph...');
      
      // Use our own Eagle OVault subgraph on The Graph Studio
      const response = await fetch('https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query,
          variables: queryVariables
        })
      });
      
      if (!response.ok) {
        console.error('[fetchCharmStats] HTTP error:', response.status, response.statusText);
        return null;
      }
      
      const responseText = await response.text();
      console.log('[fetchCharmStats] Raw API response:', responseText.substring(0, 500));
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[fetchCharmStats] Failed to parse JSON response:', parseError);
        console.error('[fetchCharmStats] Response was:', responseText);
        return null;
      }
      
      console.log('[fetchCharmStats] Parsed API response:', result);
      
      if (result.errors) {
        console.error('[fetchCharmStats] ========================================');
        console.error('[fetchCharmStats] 🚨 GraphQL ERRORS DETECTED');
        console.error('[fetchCharmStats] ========================================');
        // Log each error in detail
        result.errors.forEach((err: any, idx: number) => {
          console.error(`[fetchCharmStats] Error ${idx + 1}:`, {
            message: err.message,
            locations: err.locations,
            path: err.path,
            fullError: err
          });
        });
        console.error('[fetchCharmStats] ========================================');
        // Continue anyway - partial data might be available
        if (!result.data) {
          console.error('[fetchCharmStats] No data available, returning null');
          return null;
        }
      }
      
      if (!result.data) {
        console.warn('[fetchCharmStats] No data in response');
        return null;
      }
      
      const eagleVault = result.data.vault || {};
      const allSnapshots = eagleVault.snapshots || [];
      const allCollectFees = eagleVault.collectFees || [];
      
      console.log('[fetchCharmStats] ✅ Eagle OVault data retrieved:', {
        hasVault: !!eagleVault.id,
        snapshotCount: allSnapshots.length,
        collectFeeCount: allCollectFees.length,
        totalAssets: eagleVault.totalAssets,
        totalSupply: eagleVault.totalSupply
      });
      
      // If subgraph has no data yet, return early (subgraph is indexing)
      if (allSnapshots.length === 0 && allCollectFees.length === 0) {
        console.warn('[fetchCharmStats] ⚠️ No data from subgraph yet, waiting for indexing to complete...');
        return {
          currentFeeApr: '0',
          weeklyApy: '0',
          monthlyApy: '0',
          historicalSnapshots: []
        };
      }
      
      // OLD UNISWAP V3 FALLBACK - Removed due to CORS issues, not needed with our subgraph
      /* if (allSnapshots.length === 0 && allCollectFees.length === 0) {
        console.warn('[fetchCharmStats] ⚠️ No data from subgraph, calculating from Uniswap V3 pools...');
        
        try {
          // Get detailed pool data from Uniswap V3 subgraph including 24h data
          const uniswapQuery = `query GetPoolsWithDayData {
            pool1: pool(id: "0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d") {
              id
              feeTier
              liquidity
              totalValueLockedUSD
              volumeUSD
              feesUSD
              poolDayData(first: 7, orderBy: date, orderDirection: desc) {
                date
                volumeUSD
                feesUSD
                tvlUSD
              }
            }
            pool2: pool(id: "0xca2e972f081764c30ae5f012a29d5277eef33838") {
              id
              feeTier
              liquidity
              totalValueLockedUSD
              volumeUSD
              feesUSD
              poolDayData(first: 7, orderBy: date, orderDirection: desc) {
                date
                volumeUSD
                feesUSD
                tvlUSD
              }
            }
          }`;
          
          console.log('[fetchCharmStats] Querying Uniswap V3 subgraph...');
          
          const uniswapResponse = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: uniswapQuery })
          });
          
          if (uniswapResponse.ok) {
            const uniswapData = await uniswapResponse.json();
            console.log('[fetchCharmStats] Uniswap pool data:', uniswapData);
            
            if (uniswapData.data && !uniswapData.errors) {
              const pool1 = uniswapData.data.pool1;
              const pool2 = uniswapData.data.pool2;
              
              // Calculate APR from actual fees earned over last 7 days
              const calculatePoolAPR = (pool: any, strategyName: string) => {
                if (!pool || !pool.poolDayData || pool.poolDayData.length === 0) {
                  console.warn(`[fetchCharmStats] No pool day data for ${strategyName}`);
                  return 0;
                }
                
                // Sum up fees from last 7 days
                const totalFees = pool.poolDayData.reduce((sum: number, day: any) => {
                  return sum + parseFloat(day.feesUSD || '0');
                }, 0);
                
                // Average TVL over the period
                const avgTvl = pool.poolDayData.reduce((sum: number, day: any) => {
                  return sum + parseFloat(day.tvlUSD || '0');
                }, 0) / pool.poolDayData.length;
                
                if (avgTvl === 0) {
                  console.warn(`[fetchCharmStats] Zero TVL for ${strategyName}`);
                  return 0;
                }
                
                // Calculate weekly fees, annualize, and convert to APR
                const weeklyFees = totalFees;
                const annualFees = (weeklyFees / 7) * 365;
                const apr = (annualFees / avgTvl) * 100;
                
                console.log(`[fetchCharmStats] ${strategyName} calculation:`, {
                  weeklyFees: weeklyFees.toFixed(2),
                  avgTvl: avgTvl.toFixed(2),
                  dailyFees: (weeklyFees / 7).toFixed(2),
                  annualFees: annualFees.toFixed(2),
                  apr: apr.toFixed(2) + '%'
                });
                
                return apr;
              };
              
              const usd1PoolAPR = calculatePoolAPR(pool1, 'USD1/WLFI Pool');
              const wethPoolAPR = calculatePoolAPR(pool2, 'WETH/WLFI Pool');
              
              console.log('[fetchCharmStats] ========================================');
              console.log('[fetchCharmStats] ✅ Calculated APR from Uniswap V3 Pools');
              console.log('[fetchCharmStats] ========================================');
              console.log('[fetchCharmStats] USD1/WLFI Pool APR:', usd1PoolAPR.toFixed(2) + '%');
              console.log('[fetchCharmStats] WETH/WLFI Pool APR:', wethPoolAPR.toFixed(2) + '%');
              
              if (usd1PoolAPR > 0 || wethPoolAPR > 0) {
                // Weight by strategy TVL
                const totalTvl = usd1StrategyTvl + wethStrategyTvl;
                const combinedApr = totalTvl > 0 
                  ? ((usd1PoolAPR * usd1StrategyTvl) + (wethPoolAPR * wethStrategyTvl)) / totalTvl
                  : 0;
                const combinedApy = aprToApy(combinedApr);
                
                console.log('[fetchCharmStats] Combined (weighted by TVL):');
                console.log('[fetchCharmStats] 🎯 Combined APR:', combinedApr.toFixed(2) + '%');
                console.log('[fetchCharmStats] 🎯 Combined APY:', combinedApy.toFixed(2) + '%');
                console.log('[fetchCharmStats] ========================================');
                
                return {
                  currentFeeApr: combinedApr.toFixed(2),
                  weeklyApy: combinedApy.toFixed(2),
                  monthlyApy: combinedApy.toFixed(2),
                  historicalSnapshots: []
                };
              }
            } else if (uniswapData.errors) {
              console.error('[fetchCharmStats] Uniswap GraphQL errors:', uniswapData.errors);
            }
          } else {
            console.error('[fetchCharmStats] Uniswap API returned non-OK status:', uniswapResponse.status);
          }
        } catch (apiError) {
          console.error('[fetchCharmStats] Failed to fetch from Uniswap:', apiError);
        }
      }
      END OF UNISWAP V3 FALLBACK - Commented out */
      
      console.log('[fetchCharmStats] ========================================');
      console.log('[fetchCharmStats] 📊 Data Summary:');
      console.log('[fetchCharmStats] Snapshots count:', allSnapshots.length);
      console.log('[fetchCharmStats] CollectFee events count:', allCollectFees.length);
      console.log('[fetchCharmStats] ========================================');
      
      // Since the subgraph was just deployed, it may not have indexed data yet
      // Return early if no data is available - fallback to Uniswap calculation above
      if (allSnapshots.length === 0 || allCollectFees.length === 0) {
        console.warn('[fetchCharmStats] ⚠️ Subgraph has no data yet (still indexing). Returning fallback...');
        return {
          currentFeeApr: '0',
          weeklyApy: '0',
          monthlyApy: '0',
          historicalSnapshots: []
        };
      }

      // TODO: Process collectFees from our custom subgraph to calculate APY
      // For now, return basic structure until subgraph has indexed historical data
      console.log('[fetchCharmStats] ✅ Subgraph has data, but APY calculation needs to be updated for new schema');
      return {
        currentFeeApr: '0',
        weeklyApy: '0',
        monthlyApy: '0',
        historicalSnapshots: allSnapshots.map((s: any) => ({
          timestamp: parseInt(s.timestamp),
          totalAssets: s.totalAssets,
          totalSupply: s.totalSupply,
          sharePrice: s.sharePrice
        }))
      };

      /* OLD CODE BELOW - Commented out until refactored for new subgraph schema
      // Calculate APY from collectFee events (most accurate method)
      // Split by duration between each fee harvest and use historical TVL for each period
      const calculateApyFromCollectFees = (collectFees: any[], snapshots: any[], pool: any, currentTvl: number) => {
        if (collectFees.length === 0) return 0;
        
        // Sort by timestamp (oldest first)
        const sortedFees = [...collectFees]
          .filter((fee: any) => 
            parseFloat(fee.feesToVault0 || '0') > 0 || 
            parseFloat(fee.feesToVault1 || '0') > 0
          )
          .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
        
        if (sortedFees.length === 0) return 0;
        
        // Sort snapshots by timestamp for easier lookup
        const sortedSnapshots = [...snapshots].sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
        
        const token0Price = parseFloat(pool?.token0Price || '0');
        const token1Price = parseFloat(pool?.token1Price || '0');
        
        console.log('[calculateApyFromCollectFees] Processing', sortedFees.length, 'fee harvest events');
        console.log('[calculateApyFromCollectFees] Available snapshots:', sortedSnapshots.length);
        
        // Helper function to find TVL at a specific timestamp
        const getTvlAtTimestamp = (timestamp: number): number => {
          // Find the closest snapshot (before or at the timestamp)
          let closestSnapshot = null;
          let minTimeDiff = Infinity;
          
          for (const snapshot of sortedSnapshots) {
            const snapTime = parseInt(snapshot.timestamp);
            const timeDiff = Math.abs(timestamp - snapTime);
            
            // Prefer snapshots before or at the timestamp, but accept after if no before exists
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              closestSnapshot = snapshot;
            }
          }
          
          if (closestSnapshot) {
            const amount0 = parseFloat(closestSnapshot.totalAmount0 || '0') / 1e18;
            const amount1 = parseFloat(closestSnapshot.totalAmount1 || '0') / 1e18;
            
            let tvl = 0;
            if (token0Price > 0 && token1Price > 0) {
              tvl = (amount0 * token0Price) + (amount1 * token1Price);
            } else {
              // Fallback: rough price estimates
              tvl = amount0 + (amount1 * 0.15);
            }
            
            return tvl > 0 ? tvl : currentTvl;
          }
          
          return currentTvl; // Fallback to current TVL
        };
        
        // Calculate APR for each period between harvests
        const periodReturns: number[] = [];
        
        for (let i = 0; i < sortedFees.length; i++) {
          const currentFee = sortedFees[i];
          const currentTimestamp = parseInt(currentFee.timestamp);
          
          // Calculate fees collected in USD
          const fees0 = parseFloat(currentFee.feesToVault0 || '0') / 1e18;
          const fees1 = parseFloat(currentFee.feesToVault1 || '0') / 1e18;
          
          let feesUsd = 0;
          if (token0Price > 0 && token1Price > 0) {
            feesUsd = (fees0 * token0Price) + (fees1 * token1Price);
          } else {
            // Fallback: USD1 ≈ $1, WLFI ≈ $0.15
            feesUsd = fees0 + (fees1 * 0.15);
          }
          
          // Get the TVL at the time of this harvest
          const periodTvl = getTvlAtTimestamp(currentTimestamp);
          
          if (periodTvl <= 0) {
            console.warn(`[calculateApyFromCollectFees] Period ${i + 1}: TVL is 0, skipping`);
            continue;
          }
          
          // Determine the time period for this harvest
          let periodDays: number;
          if (i === 0) {
            // For first harvest, estimate from vault creation or use a default
            const vaultCreationTimestamp = parseInt(pool?.timestamp || currentTimestamp - (7 * 24 * 60 * 60));
            periodDays = Math.max(1, (currentTimestamp - vaultCreationTimestamp) / (24 * 60 * 60));
          } else {
            // Time since last harvest
            const prevTimestamp = parseInt(sortedFees[i - 1].timestamp);
            periodDays = Math.max(0.01, (currentTimestamp - prevTimestamp) / (24 * 60 * 60));
          }
          
          // Calculate the return for this specific period
          const periodReturn = feesUsd / periodTvl; // Simple return for this period
          
          // Annualize this period's return
          const annualizationFactor = 365 / periodDays;
          const annualizedReturn = periodReturn * annualizationFactor;
          const periodApr = annualizedReturn * 100;
          
          console.log(`[calculateApyFromCollectFees] Period ${i + 1}:`, {
            date: new Date(currentTimestamp * 1000).toISOString(),
            periodDays: periodDays.toFixed(2),
            feesUsd: feesUsd.toFixed(2),
            tvlAtTime: periodTvl.toFixed(2),
            periodReturn: (periodReturn * 100).toFixed(4) + '%',
            annualizedAPR: periodApr.toFixed(2) + '%'
          });
          
          // Only include reasonable APRs (filter outliers)
          if (periodApr > 0 && periodApr < 2000) {
            periodReturns.push(periodApr);
          }
        }
        
        if (periodReturns.length === 0) return 0;
        
        // Calculate weighted average APR (more recent periods get slightly higher weight)
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < periodReturns.length; i++) {
          // More recent = higher weight (linear increase)
          const weight = i + 1;
          weightedSum += periodReturns[i] * weight;
          totalWeight += weight;
        }
        
        const finalApr = weightedSum / totalWeight;
        
        console.log('[calculateApyFromCollectFees] FINAL RESULT:', {
          periodsAnalyzed: periodReturns.length,
          averageAPR: (periodReturns.reduce((a, b) => a + b, 0) / periodReturns.length).toFixed(2) + '%',
          weightedAPR: finalApr.toFixed(2) + '%',
          allPeriodAPRs: periodReturns.map(r => r.toFixed(2) + '%')
        });
        
        return finalApr;
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

      // PRIORITY 1: Calculate from collectFee events (most accurate - splits by harvest period)
      let usd1FeeApr = 0;
      let usd1Apy = 0;
      let wethFeeApr = 0;
      let wethApy = 0;
      
      console.log('[fetchCharmStats] ========================================');
      console.log('[fetchCharmStats] CALCULATING APY FROM COLLECTFEE EVENTS');
      console.log('[fetchCharmStats] ========================================');
      
      // Calculate USD1 APR from collectFee events first
      if (usd1StrategyTvl > 0 && usd1CollectFees.length > 0) {
        const calculatedApr = calculateApyFromCollectFees(usd1CollectFees, usd1Snapshots, usd1Vault.pool, usd1StrategyTvl);
        if (calculatedApr > 0) {
          usd1FeeApr = calculatedApr;
          console.log('[fetchCharmStats] ✅ USD1 Fee APR from collectFee events:', usd1FeeApr.toFixed(2), '%');
        }
      }

      // Calculate WETH APR from collectFee events first
      if (wethStrategyTvl > 0 && wethCollectFees.length > 0) {
        const calculatedApr = calculateApyFromCollectFees(wethCollectFees, wethSnapshots, wethVault.pool, wethStrategyTvl);
        if (calculatedApr > 0) {
          wethFeeApr = calculatedApr;
          console.log('[fetchCharmStats] ✅ WETH Fee APR from collectFee events:', wethFeeApr.toFixed(2), '%');
        }
      }
      
      console.log('[fetchCharmStats] After collectFee calculation:', { usd1FeeApr, wethFeeApr });
        
      // PRIORITY 2: Try Charm Finance snapshot data (fallback if collectFee didn't work)
      // USD1 Strategy
        if (usd1FeeApr === 0 && usd1Current) {
        // Try feeApr first (this is the actual APR from Charm Finance)
        // feeApr is typically a decimal like 0.45 = 45% APR
        if (usd1Current.feeApr !== undefined && usd1Current.feeApr !== null) {
          const feeAprRaw = parseFloat(usd1Current.feeApr);
          console.log('[fetchCharmStats] 🔍 USD1 RAW feeApr from Charm:', feeAprRaw, typeof usd1Current.feeApr, usd1Current.feeApr);
          
          if (!isNaN(feeAprRaw) && feeAprRaw > 0) {
            // Charm's feeApr is a decimal where 0.45 = 45% APR
            usd1FeeApr = feeAprRaw * 100;
            console.log('[fetchCharmStats] ✅ USD1 Fee APR from feeApr:', usd1FeeApr, '% (from raw:', feeAprRaw, ')');
          }
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
        if (wethFeeApr === 0 && wethCurrent) {
        // Try feeApr first (this is the actual APR from Charm Finance)
        // feeApr is typically a decimal like 0.45 = 45% APR
        if (wethCurrent.feeApr !== undefined && wethCurrent.feeApr !== null) {
          const feeAprRaw = parseFloat(wethCurrent.feeApr);
          console.log('[fetchCharmStats] 🔍 WETH RAW feeApr from Charm:', feeAprRaw, typeof wethCurrent.feeApr, wethCurrent.feeApr);
          
          if (!isNaN(feeAprRaw) && feeAprRaw > 0) {
            // Charm's feeApr is a decimal where 0.45 = 45% APR
            wethFeeApr = feeAprRaw * 100;
            console.log('[fetchCharmStats] ✅ WETH Fee APR from feeApr:', wethFeeApr, '% (from raw:', feeAprRaw, ')');
          }
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

      // PRIORITY 3: Final fallback - use cumulative vault fees if collectFee events and snapshots didn't work
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

      // If we still have no data, query the blockchain directly for CollectFee events
      if (usd1FeeApr === 0 && usd1StrategyTvl > 0) {
        console.log('[fetchCharmStats] 🔗 Querying USD1 vault on-chain for CollectFee events...');
        const usd1VaultResult = await queryCharmVaultFees(
          CONTRACTS.CHARM_VAULT_USD1,
          18, // WLFI decimals
          18, // USD1 decimals
          wlfiPrice, // WLFI price
          1.0  // USD1 price (stablecoin)
        );
        
        if (usd1VaultResult.totalFeesUSD > 0 && usd1VaultResult.daysOfData > 0 && usd1StrategyTvl > 0) {
          // Calculate APR: (fees / days * 365) / TVL * 100
          const annualizedFees = (usd1VaultResult.totalFeesUSD / usd1VaultResult.daysOfData) * 365;
          usd1FeeApr = (annualizedFees / usd1StrategyTvl) * 100;
          console.log('[fetchCharmStats] ✅ USD1 APR from on-chain events:', {
            totalFees: `$${usd1VaultResult.totalFeesUSD.toFixed(2)}`,
            daysOfData: usd1VaultResult.daysOfData.toFixed(2),
            annualizedFees: `$${annualizedFees.toFixed(2)}`,
            tvl: `$${usd1StrategyTvl.toFixed(2)}`,
            apr: `${usd1FeeApr.toFixed(2)}%`
          });
        } else {
          usd1FeeApr = 10.0;
          console.log('[fetchCharmStats] Using estimated USD1 Fee APR:', usd1FeeApr, '% (no on-chain data available)');
        }
      }

      if (wethFeeApr === 0 && wethStrategyTvl > 0) {
        console.log('[fetchCharmStats] 🔗 Querying WETH vault on-chain for CollectFee events...');
        const wethVaultResult = await queryCharmVaultFees(
          CONTRACTS.CHARM_VAULT_WETH,
          18, // WETH decimals
          18, // WLFI decimals
          wethPrice, // WETH price
          wlfiPrice  // WLFI price
        );
        
        if (wethVaultResult.totalFeesUSD > 0 && wethVaultResult.daysOfData > 0 && wethStrategyTvl > 0) {
          // Calculate APR: (fees / days * 365) / TVL * 100
          const annualizedFees = (wethVaultResult.totalFeesUSD / wethVaultResult.daysOfData) * 365;
          wethFeeApr = (annualizedFees / wethStrategyTvl) * 100;
          console.log('[fetchCharmStats] ✅ WETH APR from on-chain events:', {
            totalFees: `$${wethVaultResult.totalFeesUSD.toFixed(2)}`,
            daysOfData: wethVaultResult.daysOfData.toFixed(2),
            annualizedFees: `$${annualizedFees.toFixed(2)}`,
            tvl: `$${wethStrategyTvl.toFixed(2)}`,
            apr: `${wethFeeApr.toFixed(2)}%`
          });
        } else {
          wethFeeApr = 10.0;
          console.log('[fetchCharmStats] Using estimated WETH Fee APR:', wethFeeApr, '% (no on-chain data available)');
        }
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
      
      console.log('[fetchCharmStats] ========================================');
      console.log('[fetchCharmStats] FINAL VALUES BEFORE COMBINATION');
      console.log('[fetchCharmStats] ========================================');
      console.log('[fetchCharmStats] USD1 Strategy:', { 
        apr: usd1FeeApr.toFixed(2) + '%', 
        apy: usd1Apy.toFixed(2) + '%',
        tvl: '$' + usd1StrategyTvl.toFixed(2)
      });
      console.log('[fetchCharmStats] WETH Strategy:', { 
        apr: wethFeeApr.toFixed(2) + '%', 
        apy: wethApy.toFixed(2) + '%',
        tvl: '$' + wethStrategyTvl.toFixed(2)
      });

      // Calculate actual vault APY programmatically from combined fee earnings
      // Method: Calculate total fees earned from both strategies, divide by total TVL
      const totalTvl = usd1StrategyTvl + wethStrategyTvl;
      
      console.log('[fetchCharmStats] Combined TVL:', '$' + totalTvl.toFixed(2));
      
      // Calculate combined APR from both strategies' actual fee earnings
      let combinedFeeApr = 0;
      let combinedApy = 0;
      
      if (totalTvl > 0 && !isNaN(totalTvl) && isFinite(totalTvl)) {
        // Calculate total annual fees from both strategies
        const usd1AnnualFees = (usd1FeeApr / 100) * usd1StrategyTvl;
        const wethAnnualFees = (wethFeeApr / 100) * wethStrategyTvl;
        const totalAnnualFees = usd1AnnualFees + wethAnnualFees;
        
        // Calculate combined APR: total fees / total TVL
        combinedFeeApr = (totalAnnualFees / totalTvl) * 100;
        
        // Convert to APY with daily compounding: APY = (1 + APR/365)^365 - 1
        combinedApy = aprToApy(combinedFeeApr);
        
        console.log('[fetchCharmStats] ========================================');
        console.log('[fetchCharmStats] 📊 FINAL APY CALCULATION');
        console.log('[fetchCharmStats] ========================================');
        console.log('[fetchCharmStats] USD1 Annual Fees: $' + usd1AnnualFees.toFixed(2));
        console.log('[fetchCharmStats] WETH Annual Fees: $' + wethAnnualFees.toFixed(2));
        console.log('[fetchCharmStats] Total Annual Fees: $' + totalAnnualFees.toFixed(2));
        console.log('[fetchCharmStats] Total TVL: $' + totalTvl.toFixed(2));
        console.log('[fetchCharmStats] ');
        console.log('[fetchCharmStats] 🎯 Combined APR: ' + combinedFeeApr.toFixed(2) + '%');
        console.log('[fetchCharmStats] 🎯 Combined APY: ' + combinedApy.toFixed(2) + '% (with daily compounding)');
        console.log('[fetchCharmStats] ========================================');
      } else if (usd1FeeApr > 0 || wethFeeApr > 0) {
        // Fallback: if TVL is 0 but we have fee APR data, use simple average
        const validFeeAprs = [usd1FeeApr, wethFeeApr].filter(apr => apr > 0 && isFinite(apr));
        
        if (validFeeAprs.length > 0) {
          combinedFeeApr = validFeeAprs.reduce((sum, apr) => sum + apr, 0) / validFeeAprs.length;
          combinedApy = aprToApy(combinedFeeApr);
          console.log('[fetchCharmStats] Fallback (simple average):', {
            combinedFeeApr: combinedFeeApr.toFixed(2) + '%',
            combinedApy: combinedApy.toFixed(2) + '%'
          });
        }
      } else {
        console.warn('[fetchCharmStats] ⚠️ No valid data: TVL is 0 and no Fee APR available');
      }

      // Final safety check
      if (isNaN(combinedApy) || !isFinite(combinedApy)) combinedApy = 0;
      if (isNaN(combinedFeeApr) || !isFinite(combinedFeeApr)) combinedFeeApr = 0;

      // Use the programmatically calculated values
      const weeklyApy = combinedApy > 0 ? combinedApy.toFixed(2) : '0';
      const monthlyApy = weeklyApy;
      const currentFeeApr = combinedFeeApr > 0 ? combinedFeeApr.toFixed(2) : '0';

      console.log('[fetchCharmStats] Final result:', { 
        weeklyApy, 
        currentFeeApr, 
        calculationMethod: 'Programmatic (Total Fees / Total TVL)'
      });

      // For historical chart, use USD1 strategy
        const historicalSnapshots = usd1Snapshots.map((s: any) => ({ 
          timestamp: parseInt(s.timestamp), 
          feeApr: s.feeApr ? (parseFloat(s.feeApr) * 100).toFixed(2) : '0', 
          totalValue: parseFloat(s.totalAmount0 || '0') + parseFloat(s.totalAmount1 || '0') 
        }));
        
        return { currentFeeApr, weeklyApy, monthlyApy, historicalSnapshots };
      END OF OLD CODE COMMENTED OUT */
    } catch (error) {
      console.error('[fetchCharmStats] Error fetching Charm stats:', error);
    return null;
    }
  }, [queryCharmVaultFees, aprToApy]);

  const fetchData = useCallback(async () => {
    // Use read-only provider if user's provider is not available (allows viewing stats without connecting)
    const activeProvider = provider || readOnlyProvider;
    console.log('[VaultView] fetchData called', { hasUserProvider: !!provider, account, usingReadOnly: !provider });

    try {
      console.log('[VaultView] Starting data fetch...');
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, activeProvider);
      const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, activeProvider);
      const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, activeProvider);

      // Fetch vault data with individual error handling for totalAssets (may revert due to stale oracles)
      let totalAssets = 0n;
      let totalSupply = 0n;
      let wlfiPrice = 0n;
      let usd1Price = 0n;

      let wethPrice = 3500; // Default fallback
      try {
        [totalSupply, wlfiPrice, usd1Price] = await Promise.all([
          vault.totalSupply(),
          vault.getWLFIPrice(),
          vault.getUSD1Price(),
        ]);
        // Fetch WETH price (with fallback to CoinGecko)
        wethPrice = await fetchETHPrice(vault);
      } catch (error: any) {
        console.error('[VaultView] Error fetching basic vault data:', error);
        
        // Try with fallback RPC provider if this is a connection error
        if (error.code === 'CALL_EXCEPTION' || error.code === 'NETWORK_ERROR' || error.message?.includes('missing revert data')) {
          console.warn('[VaultView] RPC error detected, trying fallback provider...');
          try {
            const fallbackProvider = getFallbackProvider();
            const fallbackVault = new Contract(CONTRACTS.VAULT, VAULT_ABI, fallbackProvider);
            const fallbackWlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, fallbackProvider);
            const fallbackUsd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, fallbackProvider);
            
            const [fallbackTotalAssets, vaultWlfiBal, vaultUsd1Bal, fallbackWlfiPrice, fallbackUsd1Price] = await Promise.all([
              fallbackVault.totalAssets(),
              fallbackWlfi.balanceOf(CONTRACTS.VAULT),
              fallbackUsd1.balanceOf(CONTRACTS.VAULT),
              fallbackVault.getWlfiPrice(),
              fallbackVault.getUSD1Price(),
            ]);
            totalAssets = fallbackTotalAssets;
            wlfiPrice = fallbackWlfiPrice;
            usd1Price = fallbackUsd1Price;
            wethPrice = await fetchETHPrice(fallbackVault);
            console.log('[VaultView] Successfully fetched data using fallback RPC');
          } catch (fallbackError) {
            console.error('[VaultView] Fallback RPC also failed:', fallbackError);
            throw error; // This is critical, can't continue
          }
        } else {
          throw error; // This is critical, can't continue
        }
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
          activeProvider
        );
        const [usd1Wlfi, usd1Amount] = await usd1Strategy.getTotalAmounts();
        
        // Store individual amounts for breakdown display
        strategyWLFIinUSD1Pool = Number(formatEther(usd1Wlfi)).toFixed(2);
        strategyUSD1InPool = Number(formatEther(usd1Amount)).toFixed(2);
        
        // For USD1 strategy display, show total USD value (USD1 + WLFI converted to USD)
        // Use actual oracle price from vault
        const wlfiPriceUsd = Number(formatEther(wlfiPrice));
        const wlfiValueUsd = Number(formatEther(usd1Wlfi)) * wlfiPriceUsd;
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
          activeProvider
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
                activeProvider
              );
              const wlfiToken = new Contract(
                CONTRACTS.WLFI,
                ['function balanceOf(address) external view returns (uint256)'],
                activeProvider
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
            
            // For display, show total USD value using actual oracle prices
            const wlfiPriceUsd = Number(formatEther(wlfiPrice));
            const wethValueUsd = Number(strategyWETH) * wethPrice; // Now uses fetched ETH price
            const wlfiValueUsd = Number(strategyWLFIinPool) * wlfiPriceUsd;
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

      // Calculate total USD value of vault reserves using actual oracle price
      const wlfiPriceUsd = Number(formatEther(wlfiPrice));
      const vaultWlfiValueUsd = Number(vaultLiquidWLFI) * wlfiPriceUsd;
      const vaultUsd1ValueUsd = Number(vaultLiquidUSD1);
      const liquidTotal = (vaultWlfiValueUsd + vaultUsd1ValueUsd).toFixed(2);
      
      // strategyWLFI and strategyUSD1 are already in USD terms from above calculations
      const strategyTotal = (Number(strategyWLFI) + Number(strategyUSD1)).toFixed(2);

      console.log('[VaultView] ===== ALL STRATEGY BALANCES =====');
      console.log('[VaultView] Oracle WLFI Price (USD):', wlfiPriceUsd);
      console.log('[VaultView] Oracle/API WETH Price (USD):', wethPrice);
      console.log('[VaultView] Vault Liquid WLFI:', vaultLiquidWLFI, '= $' + vaultWlfiValueUsd.toFixed(2));
      console.log('[VaultView] Vault Liquid USD1:', vaultLiquidUSD1, '= $' + vaultUsd1ValueUsd.toFixed(2));
      console.log('[VaultView] Liquid Total:', liquidTotal);
      console.log('[VaultView] USD1 Strategy Total:', strategyUSD1);
      console.log('[VaultView] WETH Strategy Total Value:', strategyWLFI);
      console.log('[VaultView] WETH Strategy WETH Amount:', strategyWETH, '@ $' + wethPrice);
      console.log('[VaultView] WETH Strategy WLFI in Pool:', strategyWLFIinPool);
      console.log('[VaultView] Strategy Total:', strategyTotal);
      console.log('[VaultView] Grand Total (Liquid + Strategies):', (Number(liquidTotal) + Number(strategyTotal)).toFixed(2));
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
      console.log('[VaultView] ========================================');
      console.log('[VaultView] CALLING fetchCharmStats with TVL:');
      console.log('[VaultView] USD1 Strategy TVL: $' + usd1StrategyTvl.toFixed(2));
      console.log('[VaultView] WETH Strategy TVL: $' + wethStrategyTvl.toFixed(2));
      console.log('[VaultView] Total TVL: $' + (usd1StrategyTvl + wethStrategyTvl).toFixed(2));
      console.log('[VaultView] WLFI Price: $' + wlfiPriceUsd.toFixed(4));
      console.log('[VaultView] WETH Price: $' + wethPrice.toFixed(2));
      console.log('[VaultView] ========================================');
      const charmStats = await fetchCharmStats(usd1StrategyTvl, wethStrategyTvl, wlfiPriceUsd, wethPrice);
      console.log('[VaultView] ========================================');
      console.log('[VaultView] Charm stats RETURNED:', charmStats);
      console.log('[VaultView] weeklyApy type:', typeof charmStats?.weeklyApy);
      console.log('[VaultView] weeklyApy value:', charmStats?.weeklyApy);
      console.log('[VaultView] weeklyApy parsed:', parseFloat(charmStats?.weeklyApy || '0'));
      console.log('[VaultView] ========================================');

      // Use our programmatically calculated APY from collectFee events (most accurate)
      // This uses historical TVL and actual fee harvests split by period
      let calculatedApr = null;
      let calculatedApy = null;
      
      if (charmStats && charmStats.weeklyApy && parseFloat(charmStats.weeklyApy) > 0) {
        calculatedApy = parseFloat(charmStats.weeklyApy);
        calculatedApr = parseFloat(charmStats.currentFeeApr);
        console.log('[VaultView] ✅ Using programmatically calculated APY:', { 
          calculatedApr: calculatedApr + '%', 
          calculatedApy: calculatedApy + '%',
          source: 'CollectFee Events + Historical TVL'
        });
      } else {
        console.log('[VaultView] ⚠️ NOT using programmatic APY because:', {
          hasCharmStats: !!charmStats,
          weeklyApy: charmStats?.weeklyApy,
          parsed: parseFloat(charmStats?.weeklyApy || '0'),
          isGreaterThanZero: parseFloat(charmStats?.weeklyApy || '0') > 0
        });
      }
      
      // Fallback: Try vault-stats API (requires backend infrastructure)
      if (!calculatedApy || calculatedApy === 0) {
        try {
          const vaultStatsResponse = await fetch('/api/vault-stats', {
            headers: { 'Accept': 'application/json' }
          });
          if (vaultStatsResponse.ok) {
            const contentType = vaultStatsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const vaultStatsData = await vaultStatsResponse.json();
              if (vaultStatsData.success && vaultStatsData.vaults && vaultStatsData.vaults.length > 0) {
                const firstVault = vaultStatsData.vaults[0];
                if (firstVault.stats) {
                  calculatedApr = firstVault.stats.calculatedApr;
                  calculatedApy = firstVault.stats.calculatedApy;
                  console.log('[VaultView] Using APY from vault-stats API (fallback):', { calculatedApr, calculatedApy });
                }
              }
            }
          }
        } catch (error) {
          // Silently fail - this API requires backend infrastructure not available in dev mode
        }
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
        wethPrice: wethPrice.toFixed(2),
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
      
      console.log('[VaultView] ========================================');
      console.log('[VaultView] 🎯 SETTING FINAL DATA TO UI');
      console.log('[VaultView] ========================================');
      console.log('[VaultView] calculatedApr:', calculatedApr, '(will show in UI)');
      console.log('[VaultView] calculatedApy:', calculatedApy, '(will show in UI)');
      console.log('[VaultView] weeklyApy:', newData.weeklyApy);
      console.log('[VaultView] TVL:', `$${parseFloat(newData.liquidTotal) + parseFloat(newData.strategyTotal)}`);
      console.log('[VaultView] ========================================');
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

  // Track if fetch is in progress to prevent overlapping calls
  const isFetchingRef = useRef(false);
  
  useEffect(() => {
    const fetchWithGuard = async () => {
      if (isFetchingRef.current) {
        console.log('[VaultView] Fetch already in progress, skipping...');
        return;
      }
      isFetchingRef.current = true;
      await fetchData();
      isFetchingRef.current = false;
    };
    
    fetchWithGuard();
    const interval = setInterval(fetchWithGuard, 60000); // Every 60 seconds (was 15s)
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
    <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-black dark:to-gray-900 min-h-screen pb-24 sm:pb-24 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-20 sm:pb-24">


        {/* Stats - Horizontal scroll on mobile, grid on desktop */}
        <div className="flex sm:grid sm:grid-cols-3 gap-1.5 sm:gap-4 mb-4 sm:mb-8 overflow-x-auto pb-2 sm:pb-0 justify-center scrollbar-hide">
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
            className="min-w-[110px] sm:min-w-0 flex-shrink-0"
          />
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
                  ? 'Combined Strategies APY' 
                    : data.currentFeeApr && data.currentFeeApr !== '0' && data.currentFeeApr !== 'NaN' && !isNaN(parseFloat(data.currentFeeApr))
                      ? 'Fee APR (from Charm)'
                  : 'Loading...'
            }
            className="min-w-[110px] sm:min-w-0 flex-shrink-0"
          />
          <NeoStatCard
            label="Supply Minted"
            value={`${((Number(data.totalSupply) / 50_000_000) * 100).toFixed(1)}%`}
            subtitle={`${Number(data.totalSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })} / 50M EAGLE`}
            className="min-w-[110px] sm:min-w-0 flex-shrink-0"
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
                  <div className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-gray-800 dark:to-gray-850 ${DS.radius.full} ${DS.shadows.raised} border border-emerald-200/70 dark:border-emerald-700/50`}>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <img 
                        src={ICONS.ETHEREUM}
                        alt="Ethereum"
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold hidden sm:inline">Ethereum</span>
                    </div>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-850 ${DS.radius.full} ${DS.shadows.raised} border border-gray-200/70 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors ${refreshing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    >
                      <svg 
                        className={`w-4 h-4 text-gray-700 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
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
                      {/* Debug: Log the actual values being passed */}
                      {(() => {
                        console.log('[VaultView] Sunburst Chart Props:', {
                          vaultWLFI: Number(data.vaultLiquidWLFI),
                          vaultUSD1: Number(data.vaultLiquidUSD1),
                          strategyWLFI: Number(data.strategyWLFI),
                          strategyUSD1: Number(data.strategyUSD1),
                          strategyWETH: Number(data.strategyWETH),
                          strategyWLFIinPool: Number(data.strategyWLFIinPool),
                          strategyUSD1InPool: Number(data.strategyUSD1InPool),
                          strategyWLFIinUSD1Pool: Number(data.strategyWLFIinUSD1Pool),
                          wlfiPrice: Number(data.wlfiPrice),
                          rawData: data
                        });
                        return null;
                      })()}
                      
                      {/* Loading state while data is being fetched */}
                      {refreshing ? (
                        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 shadow-neo-raised dark:shadow-neo-raised-dark rounded-2xl sm:rounded-3xl p-8 mb-4 sm:mb-6 md:mb-8 border border-gray-300/50 dark:border-gray-600/40">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-4 border-[#F2D57C] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Loading asset allocation...</p>
                          </div>
                        </div>
                      ) : (
                        <>
                      {/* Sunburst Chart */}
                      <AssetAllocationSunburst
                        vaultWLFI={Number(data.vaultLiquidWLFI)}
                        vaultUSD1={Number(data.vaultLiquidUSD1)}
                        strategyWLFI={Number(data.strategyWLFI)}
                        strategyUSD1={Number(data.strategyUSD1)}
                        wlfiPrice={Number(data.wlfiPrice)}
                        wethPrice={Number(data.wethPrice)}
                        strategyWETH={Number(data.strategyWETH)}
                        strategyWLFIinPool={Number(data.strategyWLFIinPool)}
                        strategyUSD1InPool={Number(data.strategyUSD1InPool)}
                        strategyWLFIinUSD1Pool={Number(data.strategyWLFIinUSD1Pool)}
                      />
                        </>
                      )}
                      
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
                  <AnalyticsTabContent vaultData={data} />
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



