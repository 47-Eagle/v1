import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTRACTS } from '../config/contracts';

interface AnalyticsTabProps {
  vaultData: any;
}

type VaultSnapshotPoint = {
  timestamp: number; // seconds
  totalAssets: number; // WLFI-equivalent (human units)
};

export function AnalyticsTab({ vaultData }: AnalyticsTabProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<VaultSnapshotPoint[]>([]);

  // Get prices with fallbacks
  const wlfiPrice = Number(vaultData.wlfiPrice) || 0.153;
  const wethPrice = Number(vaultData.wethPrice) || 3500;
  
  // Calculate current holdings
  const totalWLFI = (Number(vaultData.vaultLiquidWLFI) || 0) + 
                    (Number(vaultData.strategyWLFIinUSD1Pool) || 0) + 
                    (Number(vaultData.strategyWLFIinPool) || 0);
  
  const totalUSD1 = (Number(vaultData.vaultLiquidUSD1) || 0) + 
                    (Number(vaultData.strategyUSD1InPool) || 0);
  
  const totalWETH = Number(vaultData.strategyWETH) || 0;
  
  // Convert to WLFI equivalent
  const wlfiFromUSD1 = wlfiPrice > 0 ? totalUSD1 / wlfiPrice : 0;
  const wlfiFromWETH = wlfiPrice > 0 ? (totalWETH * wethPrice) / wlfiPrice : 0;
  const totalValue = totalWLFI + wlfiFromUSD1 + wlfiFromWETH;
  const totalValueUSD = totalValue * wlfiPrice;

  // Strategy breakdown
  const strategyUSD1Value = Number(vaultData.strategyUSD1) || 0;
  const strategyWETHValue = (Number(vaultData.strategyWETH) || 0) * wethPrice + 
                            (Number(vaultData.strategyWLFIinPool) || 0) * wlfiPrice;
  const vaultReserves = (Number(vaultData.vaultLiquidUSD1) || 0) + 
                        (Number(vaultData.vaultLiquidWLFI) || 0) * wlfiPrice;

  // Auto-compounded fees (estimated from current fee APR + current strategy TVL)
  // This is an estimate of gross fees earned and reinvested by the strategies.
  const feeApr = (() => {
    const v = vaultData?.currentFeeApr ?? vaultData?.calculatedApr;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  const strategyTvlUsd = Math.max(0, strategyUSD1Value + strategyWETHValue);
  const fees30dUsd = strategyTvlUsd * (feeApr / 100) * (30 / 365);
  const fees7dUsd = strategyTvlUsd * (feeApr / 100) * (7 / 365);
  const fees30dWlfiEq = wlfiPrice > 0 ? fees30dUsd / wlfiPrice : 0;
  const fees7dWlfiEq = wlfiPrice > 0 ? fees7dUsd / wlfiPrice : 0;

  // Asset breakdown
  const assets = useMemo(() => {
    if (totalValue === 0) return [];
    return [
      { 
        name: 'WLFI', 
        amount: totalWLFI, 
        percentage: (totalWLFI / totalValue) * 100,
        color: '#F2D57C' // Gold
      },
      { 
        name: 'USD1', 
        amount: wlfiFromUSD1, 
        percentage: (wlfiFromUSD1 / totalValue) * 100,
        color: '#a8c0ff' // Crystal blue
      },
      { 
        name: 'WETH', 
        amount: wlfiFromWETH, 
        percentage: (wlfiFromWETH / totalValue) * 100,
        color: '#5e6d8a' // Slate accent
      }
    ].filter(a => a.percentage > 0);
  }, [totalWLFI, wlfiFromUSD1, wlfiFromWETH, totalValue]);

  // Fetch real historical snapshots (Charm vault snapshots → WLFI-equivalent)
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        const charmQuery = `
          query GetVault($address: ID!) {
            vault(id: $address) {
              id
              snapshot(orderBy: timestamp, orderDirection: asc, first: 1000) {
                timestamp
                totalAmount0
                totalAmount1
              }
            }
          }
        `;

        const [usd1Res, wethRes] = await Promise.all([
          fetch('https://stitching-v2.herokuapp.com/1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: charmQuery, variables: { address: CONTRACTS.CHARM_VAULT_USD1.toLowerCase() } }),
            signal: controller.signal,
          }),
          fetch('https://stitching-v2.herokuapp.com/1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: charmQuery, variables: { address: CONTRACTS.CHARM_VAULT_WETH.toLowerCase() } }),
            signal: controller.signal,
          })
        ]);
        clearTimeout(timeoutId);

        if (!usd1Res.ok) throw new Error(`Charm (USD1) HTTP ${usd1Res.status}`);
        if (!wethRes.ok) throw new Error(`Charm (WETH) HTTP ${wethRes.status}`);

        const [usd1Json, wethJson] = await Promise.all([usd1Res.json(), wethRes.json()]);
        if (usd1Json.errors?.length) throw new Error(usd1Json.errors?.[0]?.message || 'Charm (USD1) query failed');
        if (wethJson.errors?.length) throw new Error(wethJson.errors?.[0]?.message || 'Charm (WETH) query failed');

        const usd1Snaps: any[] = usd1Json.data?.vault?.snapshot || [];
        const wethSnaps: any[] = wethJson.data?.vault?.snapshot || [];

        const normalize = (snaps: any[]) =>
          snaps
            .map((s) => ({
              timestamp: Number(s.timestamp || 0),
              // 1e18 units
              amount0: s.totalAmount0 ? Number(String(s.totalAmount0)) / 1e18 : 0,
              amount1: s.totalAmount1 ? Number(String(s.totalAmount1)) / 1e18 : 0,
            }))
            .filter((p) => p.timestamp > 0)
            .sort((a, b) => a.timestamp - b.timestamp);

        const usd1 = normalize(usd1Snaps);
        const weth = normalize(wethSnaps);

        if (usd1.length === 0 && weth.length === 0) {
          throw new Error('No Charm snapshot history available yet');
        }

        const findClosest = (arr: Array<{ timestamp: number; amount0: number; amount1: number }>, target: number) => {
          if (arr.length === 0) return null;
          let best = arr[0];
          let bestDist = Math.abs(best.timestamp - target);
          for (let i = 1; i < arr.length; i++) {
            const d = Math.abs(arr[i].timestamp - target);
            if (d < bestDist) {
              best = arr[i];
              bestDist = d;
            }
          }
          return best;
        };

        // Add current liquid reserves (constant offset) so the series aligns with "WLFI Equivalent"
        const liquidWLFI = Number(vaultData.vaultLiquidWLFI) || 0;
        const liquidUSD1 = Number(vaultData.vaultLiquidUSD1) || 0;
        const reservesWLFI = wlfiPrice > 0 ? (liquidWLFI + liquidUSD1 / wlfiPrice) : 0;

        const nowSec = Math.floor(Date.now() / 1000);
        const startSec = nowSec - 29 * 24 * 60 * 60;

        const points: VaultSnapshotPoint[] = Array.from({ length: 30 }, (_, i) => {
          const targetTs = startSec + i * 24 * 60 * 60;
          const usd1Snap = findClosest(usd1, targetTs);
          const wethSnap = findClosest(weth, targetTs);

          // USD1 vault: amount0 = USD1, amount1 = WLFI
          const usd1WlfiEq =
            wlfiPrice > 0 && usd1Snap
              ? (usd1Snap.amount1 + usd1Snap.amount0 / wlfiPrice)
              : 0;

          // WETH vault: amount0 = WETH, amount1 = WLFI
          const wethWlfiEq =
            wlfiPrice > 0 && wethSnap
              ? (wethSnap.amount1 + (wethSnap.amount0 * wethPrice) / wlfiPrice)
              : 0;

          const totalWlfiEq = reservesWLFI + usd1WlfiEq + wethWlfiEq;
          return {
            timestamp: targetTs,
            totalAssets: Number.isFinite(totalWlfiEq) ? Math.max(0, totalWlfiEq) : 0,
          };
        });

        if (!cancelled) {
          setHistory(points);
        }
      } catch (e: any) {
        if (!cancelled) {
          setHistory([]);
          const msg =
            e?.name === 'AbortError'
              ? 'Timed out fetching historical data'
              : (e?.message || 'Failed to fetch historical data');
          setHistoryError(msg);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [vaultData.vaultLiquidWLFI, vaultData.vaultLiquidUSD1, wlfiPrice, wethPrice]);

  // Build chart data from real snapshots (last 30 days). If we don't have history,
  // we show "No data" rather than generating fake values.
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = nowSec - 29 * 24 * 60 * 60;

    // Only consider snapshots in-range, plus one day of buffer for "closest" selection
    const candidates = history.filter((p) => p.timestamp >= startSec - 24 * 60 * 60);
    if (candidates.length === 0) return [];

    const findClosest = (target: number) => {
      let best = candidates[0];
      let bestDist = Math.abs(best.timestamp - target);
      for (let i = 1; i < candidates.length; i++) {
        const d = Math.abs(candidates[i].timestamp - target);
        if (d < bestDist) {
          best = candidates[i];
          bestDist = d;
        }
      }
      return best;
    };

    return Array.from({ length: 30 }, (_, i) => {
      const targetTs = startSec + i * 24 * 60 * 60;
      const closest = findClosest(targetTs);
      return {
        day: i,
        // totalAssets is our "WLFI equivalent" in the vault’s base unit.
        value: Math.max(0, closest.totalAssets),
        date: new Date(targetTs * 1000),
      };
    });
  }, [history]);

  // Chart calculations
  const chartStats = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 1, range: 1 };
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max, range: max - min || 1 };
  }, [chartData]);

  // Generate smooth SVG path
  const chartPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const { min, range } = chartStats;
    // Keep the line away from the edges so "flat" series are still visible.
    const paddingTop = 12;
    const paddingBottom = 18;
    const chartHeight = 100 - paddingTop - paddingBottom;
    const points = chartData.map((d, i) => ({
      x: (i / (chartData.length - 1)) * 100,
      y: paddingTop + (1 - (d.value - min) / range) * chartHeight
    }));

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  }, [chartData, chartStats]);

  const formatNumber = (n: number) => {
    if (isNaN(n) || !isFinite(n)) return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatPercent = (n: number) => {
    if (isNaN(n) || !isFinite(n)) return '0';
    return n.toFixed(1);
  };

  const formatUSD = (n: number) => {
    if (isNaN(n) || !isFinite(n)) return '$0';
    return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Basalt design styles
  const basaltStyles = {
    panel: "bg-[#0a0a0b] border border-[#2a2a30]",
    panelHover: "hover:border-[#5e6d8a] transition-all duration-300",
    label: "text-[0.7rem] text-[#5e6d8a] uppercase tracking-[0.15em] font-medium",
    mono: "font-mono text-[#5e6d8a]",
    value: "text-white font-light",
    gold: "text-[#F2D57C]",
    crystalBlue: "text-[#a8c0ff]",
    divider: "border-[#2a2a30]",
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Neumorphic Container */}
      <div className="rounded-2xl overflow-hidden
        bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900
        shadow-[8px_8px_16px_rgba(0,0,0,0.4),-4px_-4px_12px_rgba(255,255,255,0.05)]
        border border-gray-700/30 p-1">
      <div className="space-y-[2px] bg-[#2a2a30] rounded-xl overflow-hidden">
      {/* SVG Grain Texture Overlay */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none opacity-[0.03] z-50">
        <filter id='noiseFilter'>
          <feTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/>
        </filter>
        <rect width='100%' height='100%' filter='url(#noiseFilter)'/>
      </svg>

      {/* Main Grid - Chronostructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[2px]">
        
        {/* LEFT: Total Value Monolith */}
        <div className={`${basaltStyles.panel} p-6 relative`}>
          <div className="border-b border-[#2a2a30] pb-4 mb-6">
            <span className={basaltStyles.label}>Vault Analytics</span>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff80] animate-pulse" />
              <span className="text-[0.65rem] text-[#00ff80] uppercase tracking-wider">Live Data</span>
            </div>
          </div>

          <div className="mb-8">
            <p className={basaltStyles.label}>Total Value Locked</p>
            <h2 className="text-4xl text-white font-light mt-2 tabular-nums">
              {formatNumber(totalValue)}
            </h2>
            <p className={`text-lg mt-1 ${basaltStyles.gold}`}>
              WLFI Equivalent
            </p>
          </div>

          <div className="mb-8">
            <p className={basaltStyles.label}>USD Value</p>
            <h2 className="text-3xl text-white font-light mt-2 tabular-nums">
              {formatUSD(totalValueUSD)}
            </h2>
          </div>

          {/* Chrono Bar */}
          <div className="mt-auto">
            <div className="flex justify-between text-[0.65rem] mb-2">
              <span className={basaltStyles.label}>Strategy Allocation</span>
              <span className={basaltStyles.mono}>{formatPercent(((strategyUSD1Value + strategyWETHValue) / (totalValueUSD || 1)) * 100)}%</span>
            </div>
            <div className="h-1 bg-[#2a2a30] w-full">
              <div 
                className="h-full bg-[#F2D57C]" 
                style={{ 
                  width: `${Math.min(100, ((strategyUSD1Value + strategyWETHValue) / (totalValueUSD || 1)) * 100)}%`,
                  boxShadow: '0 0 15px rgba(242, 213, 124, 0.4)'
                }}
              />
            </div>

            {/* Auto-compounded fees (estimate) */}
            <div className="mt-5 border-t border-[#2a2a30] pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={basaltStyles.label}>Auto-compounded fees (est.)</span>
                <span className={basaltStyles.mono}>{feeApr > 0 ? `${feeApr.toFixed(2)}% APR` : 'N/A'}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.7rem] text-[#5e6d8a]">30D</span>
                <span className="text-white tabular-nums font-light">{formatUSD(fees30dUsd)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.7rem] text-[#5e6d8a]">7D</span>
                <span className="text-white tabular-nums font-light">{formatUSD(fees7dUsd)}</span>
              </div>
              <div className="text-[0.65rem] text-[#5e6d8a]">
                ≈ {formatNumber(fees30dWlfiEq)} WLFI (30D) • {formatNumber(fees7dWlfiEq)} WLFI (7D)
              </div>
              <div className="text-[0.6rem] text-[#5e6d8a] opacity-80">
                Based on current strategy TVL × current fee APR (estimate).
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: Performance Chart */}
        <div className={`${basaltStyles.panel} p-6 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className={basaltStyles.label}>Performance // 30D</span>
              <p className="text-2xl text-white font-light mt-2 tabular-nums">
                {formatNumber(totalValue)} <span className="text-sm text-[#5e6d8a]">WLFI</span>
              </p>
            </div>
            
            {hoveredIndex !== null && chartData[hoveredIndex] ? (
              <div className="text-right">
                <p className={basaltStyles.mono} style={{ fontSize: '0.7rem' }}>
                  {chartData[hoveredIndex].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xl text-white font-light tabular-nums">
                  {formatNumber(chartData[hoveredIndex].value)}
                </p>
              </div>
            ) : (
              <div className="text-right">
                <p className={basaltStyles.mono} style={{ fontSize: '0.7rem' }}>30 Day Change</p>
                <p className={`text-lg font-medium ${basaltStyles.gold}`}>
                  +{formatPercent(((chartData[chartData.length - 1]?.value || 0) / (chartData[0]?.value || 1) - 1) * 100)}%
                </p>
              </div>
            )}
          </div>
          
          {/* Chart Area */}
          <div 
            ref={chartRef}
            className="relative h-48 cursor-crosshair"
            onMouseMove={(e) => {
              if (!chartRef.current) return;
              if (chartData.length === 0) return;
              const rect = chartRef.current.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const index = Math.round(x * (chartData.length - 1));
              setHoveredIndex(Math.max(0, Math.min(chartData.length - 1, index)));
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {historyLoading ? (
              <div className="h-full flex items-center justify-center text-[#5e6d8a]">
                Loading historical data...
              </div>
            ) : chartData.length > 0 ? (
              <svg 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none" 
                className="w-full h-full"
              >
                <defs>
                  <linearGradient id="basaltChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F2D57C" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#F2D57C" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#F2D57C" stopOpacity="0" />
                  </linearGradient>
                  
                  <filter id="basaltGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Grid lines */}
                {[20, 40, 60, 80].map((y) => (
                  <line
                    key={y}
                    x1="0" y1={y} x2="100" y2={y}
                    stroke="#2a2a30"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                
                {/* Area fill */}
                <path 
                  d={`${chartPath} L 100,100 L 0,100 Z`}
                  fill="url(#basaltChartFill)"
                />
                
                {/* Main line */}
                <path 
                  d={chartPath}
                  fill="none"
                  stroke="#F2D57C"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  filter="url(#basaltGlow)"
                />
                
                {/* Hover elements */}
                {hoveredIndex !== null && chartData[hoveredIndex] && (() => {
                  const x = (hoveredIndex / (chartData.length - 1)) * 100;
                  const paddingTop = 12;
                  const paddingBottom = 18;
                  const chartHeight = 100 - paddingTop - paddingBottom;
                  const y =
                    paddingTop +
                    (1 - (chartData[hoveredIndex].value - chartStats.min) / chartStats.range) * chartHeight;
                  return (
                    <>
                      <line
                        x1={x} y1="0" x2={x} y2="100"
                        stroke="#F2D57C"
                        strokeWidth="1"
                        strokeOpacity="0.3"
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle cx={x} cy={y} r="6" fill="#F2D57C" fillOpacity="0.2" />
                      <circle cx={x} cy={y} r="3" fill="#F2D57C" />
                      <circle cx={x} cy={y} r="1.5" fill="#0a0a0b" />
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="h-full flex items-center justify-center text-[#5e6d8a]">
                {historyError ? `Historical data unavailable: ${historyError}` : 'No historical data available'}
              </div>
            )}
          </div>
          
          {/* X-axis */}
          <div className="flex justify-between mt-3 text-[0.65rem] text-[#5e6d8a]">
            <span>30D AGO</span>
            <span>15D</span>
            <span>NOW</span>
          </div>
        </div>
      </div>

      {/* Strategy Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
        {/* USD1/WLFI Strategy */}
        <div className={`${basaltStyles.panel} ${basaltStyles.panelHover} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <span className={basaltStyles.label}>USD1/WLFI Strategy</span>
            <span className="text-[0.65rem] px-2 py-0.5 bg-[#1c1c21] text-[#5e6d8a] font-mono">50%</span>
          </div>
          <div className="text-2xl text-white font-light tabular-nums">
            {formatUSD(strategyUSD1Value)}
          </div>
          <a 
            href="https://alpha.charm.fi/ethereum/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[0.65rem] text-[#5e6d8a] hover:text-[#F2D57C] transition-colors mt-2 inline-block"
          >
            CHARM_ALPHA ↗
          </a>
        </div>

        {/* WETH/WLFI Strategy */}
        <div className={`${basaltStyles.panel} ${basaltStyles.panelHover} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <span className={basaltStyles.label}>WETH/WLFI Strategy</span>
            <span className="text-[0.65rem] px-2 py-0.5 bg-[#1c1c21] text-[#5e6d8a] font-mono">50%</span>
          </div>
          <div className="text-2xl text-white font-light tabular-nums">
            {formatUSD(strategyWETHValue)}
          </div>
          <a 
            href="https://alpha.charm.fi/ethereum/vault/0x3314e248F3F752Cd16939773D83bEb3a362F0AEF" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[0.65rem] text-[#5e6d8a] hover:text-[#F2D57C] transition-colors mt-2 inline-block"
          >
            CHARM_ALPHA ↗
          </a>
        </div>

        {/* Vault Reserves */}
        <div className={`${basaltStyles.panel} ${basaltStyles.panelHover} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <span className={basaltStyles.label}>Vault Reserves</span>
            <span className="text-[0.65rem] px-2 py-0.5 bg-[#1c1c21] text-[#00ff80] font-mono">IDLE</span>
          </div>
          <div className="text-2xl text-white font-light tabular-nums">
            {formatUSD(vaultReserves)}
          </div>
          <span className="text-[0.65rem] text-[#5e6d8a] mt-2 inline-block">
            AVAILABLE_NOW
          </span>
        </div>
      </div>

      {/* Asset Composition */}
      <div className={`${basaltStyles.panel} p-5`}>
        <p className={`${basaltStyles.label} mb-4`}>Asset Composition</p>
        
        {/* Composition Bar */}
        <div className="h-2 bg-[#1c1c21] w-full flex overflow-hidden">
          {assets.map((asset, i) => (
            <div
              key={i}
              className="h-full transition-all duration-500"
              style={{ 
                width: `${asset.percentage}%`,
                backgroundColor: asset.color
              }}
            />
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-6 mt-4">
          {assets.map((asset, i) => (
            <div key={i} className="flex items-center gap-3">
              <div 
                className="w-3 h-3" 
                style={{ backgroundColor: asset.color }}
              />
              <div>
                <span className="text-sm text-white font-light">{asset.name}</span>
                <span className="text-sm text-[#5e6d8a] ml-2 font-mono">
                  {formatPercent(asset.percentage)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Oracle Status */}
      <div className={`${basaltStyles.panel} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#F2D57C] animate-pulse" />
          <span className="text-[0.65rem] text-[#5e6d8a] font-mono uppercase">
            Oracle: Uniswap V3 TWAP // 1800s Interval
          </span>
        </div>
        <span className="text-[0.65rem] text-[#5e6d8a] font-mono">
          WLFI: ${wlfiPrice.toFixed(4)} // ETH: ${formatNumber(wethPrice)}
        </span>
      </div>
      </div>{/* End inner bg */}
      </div>{/* End Neumorphic Container */}
    </div>
  );
}
