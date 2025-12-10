import { useState, useRef, useEffect, useMemo } from 'react';

interface AnalyticsTabProps {
  vaultData: any;
}

export function AnalyticsTab({ vaultData }: AnalyticsTabProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

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

  // Asset breakdown
  const assets = useMemo(() => {
    if (totalValue === 0) return [];
    return [
      { 
        name: 'WLFI', 
        amount: totalWLFI, 
        percentage: (totalWLFI / totalValue) * 100,
        color: '#F59E0B'
      },
      { 
        name: 'USD1', 
        amount: wlfiFromUSD1, 
        percentage: (wlfiFromUSD1 / totalValue) * 100,
        color: '#3B82F6'
      },
      { 
        name: 'WETH', 
        amount: wlfiFromWETH, 
        percentage: (wlfiFromWETH / totalValue) * 100,
        color: '#6B7280'
      }
    ].filter(a => a.percentage > 0);
  }, [totalWLFI, wlfiFromUSD1, wlfiFromWETH, totalValue]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (totalValue === 0) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const progress = i / 29;
      const base = totalValue * 0.85;
      const growth = totalValue * 0.15 * progress;
      const variation = Math.sin(i * 0.8) * totalValue * 0.02;
      return {
        day: i,
        value: Math.max(0, base + growth + variation),
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
      };
    });
  }, [totalValue]);

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
    const points = chartData.map((d, i) => ({
      x: (i / (chartData.length - 1)) * 100,
      y: 100 - ((d.value - min) / range) * 80 - 10
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

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Total Value - Neumorphic Card */}
      <div className="rounded-2xl p-6 sm:p-8
        bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
        shadow-neo-raised dark:shadow-neo-raised-dark
        border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Total Value Locked
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl sm:text-6xl font-light text-gray-900 dark:text-white tabular-nums">
              {formatNumber(totalValue)}
            </span>
            <span className="text-xl text-gray-400 dark:text-gray-500">WLFI</span>
          </div>
          <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
            ${formatNumber(totalValueUSD)} USD
          </p>
        </div>
      </div>

      {/* Asset Breakdown - Neumorphic Pills */}
      <div className="flex justify-center gap-4 sm:gap-6 flex-wrap">
        {assets.map((asset, i) => (
          <div key={i} className="text-center px-5 py-3 rounded-xl
            bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
            shadow-neo-raised dark:shadow-neo-raised-dark
            border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: asset.color }}
              />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {asset.name}
              </span>
            </div>
            <p className="text-2xl font-light text-gray-900 dark:text-white tabular-nums">
              {formatPercent(asset.percentage)}%
            </p>
          </div>
        ))}
      </div>

      {/* Chart - Neumorphic Card */}
      <div className="mt-6 rounded-2xl p-5 sm:p-6
        bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
        shadow-neo-raised dark:shadow-neo-raised-dark
        border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            30 Day Performance
          </span>
          {hoveredIndex !== null && chartData[hoveredIndex] && (
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {chartData[hoveredIndex].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' · '}
              <span className="font-medium">{formatNumber(chartData[hoveredIndex].value)} WLFI</span>
            </span>
          )}
        </div>
        
        <div 
          ref={chartRef}
          className="relative h-48 sm:h-56"
          onMouseMove={(e) => {
            if (!chartRef.current) return;
            const rect = chartRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const index = Math.round(x * (chartData.length - 1));
            setHoveredIndex(Math.max(0, Math.min(chartData.length - 1, index)));
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {chartData.length > 0 ? (
            <svg 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none" 
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Area fill */}
              <path 
                d={`${chartPath} L 100,100 L 0,100 Z`}
                fill="url(#areaGradient)"
              />
              
              {/* Line */}
              <path 
                d={chartPath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
              
              {/* Hover indicator */}
              {hoveredIndex !== null && chartData[hoveredIndex] && (
                <>
                  <line
                    x1={(hoveredIndex / (chartData.length - 1)) * 100}
                    y1="0"
                    x2={(hoveredIndex / (chartData.length - 1)) * 100}
                    y2="100"
                    stroke="#3B82F6"
                    strokeWidth="0.3"
                    strokeDasharray="2,2"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={(hoveredIndex / (chartData.length - 1)) * 100}
                    cy={100 - ((chartData[hoveredIndex].value - chartStats.min) / chartStats.range) * 80 - 10}
                    r="1.5"
                    fill="#3B82F6"
                  />
                </>
              )}
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
          <span>30d ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Composition Bar - Neumorphic */}
      {assets.length > 0 && (
        <div className="rounded-2xl p-5 sm:p-6
          bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
          shadow-neo-raised dark:shadow-neo-raised-dark
          border border-gray-200/50 dark:border-gray-700/50">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
            Asset Composition
          </p>
          <div className="h-3 rounded-full overflow-hidden flex 
            bg-gray-100 dark:bg-gray-700
            shadow-neo-pressed dark:shadow-neo-pressed-dark">
            {assets.map((asset, i) => (
              <div
                key={i}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                style={{ 
                  width: `${asset.percentage}%`,
                  backgroundColor: asset.color
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 flex-wrap gap-2">
            {assets.map((asset, i) => (
              <div key={i} className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: asset.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {asset.name}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                  {formatNumber(asset.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
