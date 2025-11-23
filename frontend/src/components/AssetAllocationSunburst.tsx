import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';

interface AssetAllocationSunburstProps {
  vaultWLFI: number;
  vaultUSD1: number;
  strategyWLFI: number; // Not used, kept for compatibility
  strategyUSD1: number;
  wlfiPrice: number;
  wethPrice?: number; // WETH price in USD
  strategyWETH?: number;
  strategyWLFIinPool?: number;
  strategyUSD1InPool?: number;
  strategyWLFIinUSD1Pool?: number;
}

interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
  color?: string;
}

export default function AssetAllocationSunburst({
  vaultWLFI,
  vaultUSD1,
  strategyWLFI,
  strategyUSD1,
  wlfiPrice,
  wethPrice = 3000.0, // Default fallback
  strategyWETH = 0,
  strategyWLFIinPool = 0,
  strategyUSD1InPool = 0,
  strategyWLFIinUSD1Pool = 0
}: AssetAllocationSunburstProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Convert USD1 to WLFI equivalent (USD1 = $1, so USD1 / wlfiPrice = WLFI equivalent)
  const vaultUSD1InWLFI = wlfiPrice > 0 ? vaultUSD1 / wlfiPrice : 0;
  const strategyUSD1InWLFI = wlfiPrice > 0 ? strategyUSD1 / wlfiPrice : 0;
  
  // Calculate totals (normalize to USD) using real prices
  // Ensure all values are numbers - handle string inputs and edge cases
  const strategyWETHNum = Math.max(0, Number(strategyWETH) || 0);
  const strategyWLFIinPoolNum = Math.max(0, Number(strategyWLFIinPool) || 0);
  
  // Check if we have any WETH strategy data (even if very small)
  const hasWETHStrategyData = strategyWETHNum > 0 || strategyWLFIinPoolNum > 0;
  
  const totalVault = (vaultWLFI * wlfiPrice) + vaultUSD1;
  const totalUSD1Strategy = strategyUSD1;
  const totalWETHStrategy = (strategyWETHNum * wethPrice) + (strategyWLFIinPoolNum * wlfiPrice);
  const grandTotal = totalVault + totalUSD1Strategy + totalWETHStrategy;
  
  // Debug logging
  console.log('[Sunburst] ===== RAW DATA RECEIVED =====');
  console.log('[Sunburst] vaultWLFI:', vaultWLFI, typeof vaultWLFI);
  console.log('[Sunburst] vaultUSD1:', vaultUSD1, typeof vaultUSD1);
  console.log('[Sunburst] strategyUSD1:', strategyUSD1, typeof strategyUSD1);
  console.log('[Sunburst] strategyWETH:', strategyWETH, typeof strategyWETH);
  console.log('[Sunburst] strategyWLFIinPool:', strategyWLFIinPool, typeof strategyWLFIinPool);
  console.log('[Sunburst] wethPrice:', wethPrice, typeof wethPrice);
  console.log('[Sunburst] wlfiPrice:', wlfiPrice, typeof wlfiPrice);
  console.log('[Sunburst] ===== CONVERTED VALUES =====');
  console.log('[Sunburst] strategyWETHNum:', strategyWETHNum, '> 0?', strategyWETHNum > 0);
  console.log('[Sunburst] strategyWLFIinPoolNum:', strategyWLFIinPoolNum, '> 0?', strategyWLFIinPoolNum > 0);
  console.log('[Sunburst] hasWETHStrategyData:', hasWETHStrategyData);
  console.log('[Sunburst] Will show WETH strategy?', hasWETHStrategyData);
  console.log('[Sunburst] ===== CALCULATED TOTALS =====');
  console.log('[Sunburst] Calculated totals (USD):', {
    totalVault: totalVault.toFixed(2),
    totalUSD1Strategy: totalUSD1Strategy.toFixed(2),
    totalWETHStrategy: totalWETHStrategy.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  });
  
  // Total in WLFI terms (convert everything to WLFI for display)
  const strategyWETHInWLFI = wlfiPrice > 0 ? (strategyWETHNum * wethPrice) / wlfiPrice : 0;
  const strategyWLFIinPoolWLFI = strategyWLFIinPoolNum;
  const totalInWLFI = vaultWLFI + vaultUSD1InWLFI + strategyUSD1InWLFI + strategyWETHInWLFI + strategyWLFIinPoolWLFI;

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Initialize tooltip with D3
    const tooltip = d3.select('#tooltip');
    tooltip
      .style('position', 'fixed')
      .style('opacity', '0')
      .style('left', '-9999px')
      .style('top', '-9999px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('transition', 'opacity 0.2s ease');
    
    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    // Responsive sizing based on viewport
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
    const width = isMobile ? 300 : isTablet ? 350 : 450;
    const height = isMobile ? 300 : isTablet ? 350 : 450;
    const radius = Math.min(width, height) / 2 - 30;

    // Hierarchical data structure with Eagle Finance theme colors
    // All values normalized to USD for proper comparison
    const data: HierarchyNode = {
      name: 'Total Assets',
      children: [
        {
          name: 'Vault Reserves',
          color: '#F2D57C', // Primary Gold
          children: [
            { name: 'Vault WLFI', value: vaultWLFI * wlfiPrice, color: '#FFE7A3' }, // Highlight Gold (WLFI in USD)
            { name: 'Vault USD1', value: vaultUSD1, color: '#C9A854' } // Soft Gold (USD1 already in USD)
          ]
        },
        {
          name: 'USD1/WLFI Strategy',
          color: '#6366f1', // Indigo (USD1 Strategy)
          children: [
            { name: 'USD1 in Charm', value: strategyUSD1InPool, color: '#818cf8' }, // Light indigo (USD1 already in USD)
            { name: 'WLFI in Charm', value: strategyWLFIinUSD1Pool * wlfiPrice, color: '#a5b4fc' } // Lighter indigo (WLFI to USD)
          ]
        },
        ...(hasWETHStrategyData ? (() => {
          const wethChildren = strategyWETHNum > 0 ? [{ name: 'WETH in Pool', value: strategyWETHNum * wethPrice, color: '#1a1a1a' }] : [];
          const wlfiChildren = strategyWLFIinPoolNum > 0 ? [{ name: 'WLFI in Pool', value: strategyWLFIinPoolNum * wlfiPrice, color: '#5a5a5a' }] : [];
          const allChildren = [...wethChildren, ...wlfiChildren];
          
          console.log('[Sunburst] Building WETH/WLFI Strategy section:', {
            strategyWETHNum,
            strategyWLFIinPoolNum,
            wethPrice,
            wlfiPrice,
            wethValueUSD: strategyWETHNum * wethPrice,
            wlfiValueUSD: strategyWLFIinPoolNum * wlfiPrice,
            childrenCount: allChildren.length,
            children: allChildren,
            hasWETHStrategyData
          });
          
          // Ensure we always have at least one child if the section is being created
          if (allChildren.length === 0) {
            console.warn('[Sunburst] WARNING: WETH/WLFI Strategy section created but has no children!');
            // Add a placeholder child with minimal value to ensure rendering
            allChildren.push({ name: 'WETH in Pool', value: 0.01, color: '#1a1a1a' });
          }
          
          return [{
          name: 'WETH/WLFI Strategy',
          color: '#3a3a3a', // Dark metallic gray (WETH Strategy)
            children: allChildren
          }];
        })() : (() => {
          // Debug: Log why WETH strategy is not showing
          console.log('[Sunburst] WETH/WLFI Strategy NOT showing because:', {
            strategyWETHNum,
            strategyWLFIinPoolNum,
            hasWETHStrategyData,
            strategyWETH,
            strategyWLFIinPool
          });
          return [];
        })())
      ]
    };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Arc generator for normal state
    const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    // Collapsed arc (for animation)
    const arcCollapsed = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(0)
      .outerRadius(0); // Fully collapsed

    // Hover arc (slightly expanded)
    const arcHover = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 + 10);

    // Add subtle glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow');
    
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create arcs - start fully open
    const paths = svg.selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('d', arc as any)
      .attr('opacity', 0.85)
      .attr('fill', d => {
        // Add subtle gradient based on depth
        const baseColor = d.data.color || '#666';
        return baseColor;
      })
      .attr('opacity', d => selectedPath && d.data.name !== selectedPath ? 0.3 : 0.85)
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)')
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr('d', arcHover as any)
          .attr('opacity', 1)
          .style('filter', 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 20px ' + (d.data.color || '#666') + '80)');
        
        // Calculate token quantity based on section name
        const usdValue = d.value || 0;
        const percentage = grandTotal > 0 ? ((usdValue / grandTotal * 100).toFixed(1)) : '0';
        
        let tokenQuantity = '';
        let tokenSymbol = '';
        
        const sectionName = d.data.name.toLowerCase();
        if (sectionName.includes('wlfi') && !sectionName.includes('weth')) {
          // WLFI quantity
          tokenQuantity = (usdValue / wlfiPrice).toFixed(2);
          tokenSymbol = 'WLFI';
        } else if (sectionName.includes('usd1')) {
          // USD1 quantity (already in USD, so 1:1)
          tokenQuantity = usdValue.toFixed(2);
          tokenSymbol = 'USD1';
        } else if (sectionName.includes('weth')) {
          // WETH quantity
          tokenQuantity = (usdValue / wethPrice).toFixed(4);
          tokenSymbol = 'WETH';
        } else {
          // Parent sections or unknown - show USD only
          tokenQuantity = null;
        }
        
        d3.select('#tooltip')
          .style('left', (event.clientX + 15) + 'px')
          .style('top', (event.clientY - 10) + 'px')
          .style('opacity', '1')
          .html(`
            <div style="
              background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,20,0.95) 100%);
              padding: 16px;
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.2);
              box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${d.data.color}40;
              backdrop-filter: blur(10px);
              min-width: 200px;
            ">
              <div style="color: ${d.data.color}; font-weight: 700; margin-bottom: 10px; font-size: 14px; letter-spacing: 0.5px;">${d.data.name.toUpperCase()}</div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="color: #9ca3af; font-size: 12px;">USD Value:</span>
                <span style="color: white; font-weight: 600; font-family: monospace; font-size: 13px;">$${usdValue.toFixed(2)}</span>
              </div>
              ${tokenQuantity !== null ? `
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="color: #9ca3af; font-size: 12px;">Quantity:</span>
                <span style="color: #eab308; font-weight: 600; font-family: monospace; font-size: 13px;">${tokenQuantity} ${tokenSymbol}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                <span style="color: #9ca3af; font-size: 12px;">Share:</span>
                <span style="color: #eab308; font-weight: 700; font-size: 16px;">${percentage}%</span>
              </div>
            </div>
          `);
      })
      .on('mousemove', function(event, d) {
        // Update tooltip position as mouse moves
        d3.select('#tooltip')
          .style('left', (event.clientX + 15) + 'px')
          .style('top', (event.clientY - 10) + 'px');
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicIn)
          .attr('d', arc as any)
          .attr('opacity', selectedPath && d.data.name !== selectedPath ? 0.3 : 0.85)
          .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))');
        
        d3.select('#tooltip')
          .transition()
          .duration(200)
          .style('opacity', '0')
          .on('end', function() {
            // Move offscreen after fade out completes
            d3.select(this)
              .style('left', '-9999px')
              .style('top', '-9999px');
          });
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        setSelectedPath(d.data.name);
        
        // Hide tooltip immediately on click and move it offscreen
        d3.select('#tooltip')
          .style('opacity', '0')
          .style('left', '-9999px')
          .style('top', '-9999px');
        
        // Trigger close-then-open animation
        const clickedPath = d3.select(this);
        
        // Close animation (400ms)
        svg.selectAll('path')
          .transition()
          .duration(400)
          .ease(d3.easeCubicIn)
          .attr('d', arcCollapsed as any)
          .attr('opacity', 0)
          .on('end', function() {
            // Reopen animation (600ms) after close completes
            svg.selectAll('path')
              .transition()
              .duration(600)
              .ease(d3.easeCubicOut)
              .attr('d', arc as any)
              .attr('opacity', 0.85);
          });
      });

    // Add elegant center text with gradient
    const centerGroup = svg.append('g');
    
    // Subtle circle background
    centerGroup.append('circle')
      .attr('r', 55)
      .attr('fill', 'rgba(0, 0, 0, 0.4)')
      .attr('stroke', 'rgba(212, 175, 55, 0.3)')
      .attr('stroke-width', 1.5);
    
    // Center content - display total in WLFI terms
    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -8)
      .style('font-size', '32px')
      .style('font-weight', '700')
      .style('fill', '#F2D57C')
      .style('letter-spacing', '1px')
      .text(totalInWLFI.toFixed(2));

    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 12)
      .style('font-size', '11px')
      .style('fill', '#9ca3af')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '1.5px')
      .text('WLFI');

  }, [vaultWLFI, vaultUSD1, strategyWLFI, strategyUSD1, strategyWETH, strategyWLFIinPool, strategyUSD1InPool, strategyWLFIinUSD1Pool, grandTotal, selectedPath, animationKey, wlfiPrice, wethPrice, totalInWLFI]);

  return (
    <>
      {/* Tooltip Portal - rendered at document.body level */}
      {createPortal(
        <div id="tooltip" />,
        document.body
      )}
      
      <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 shadow-neo-raised dark:shadow-neo-raised-dark rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 overflow-hidden border border-gray-300/50 dark:border-gray-600/40 transition-colors duration-300">
        {/* Subtle animated background gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-gradient-to-br from-[#F2D57C]/5 to-transparent rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
        
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
            <div>
              <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg sm:text-xl mb-1">Asset Allocation</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Real-time token distribution</p>
            </div>
            {selectedPath && (
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#FFE7A3]/20 dark:bg-[#C9A854]/20 shadow-neo-inset dark:shadow-neo-inset-dark text-[#A69348] dark:text-[#F2D57C] text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl">
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="truncate max-w-[150px] sm:max-w-none">{selectedPath}</span>
                </span>
              </div>
            )}
          </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-10 max-w-5xl mx-auto">
          {/* D3 Sunburst Chart with glow effect */}
          <div className="flex-shrink-0 relative flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#F2D57C]/10 to-blue-500/10 rounded-full blur-2xl"></div>
              <svg ref={svgRef} className="relative drop-shadow-2xl"></svg>
            </div>
          
          {/* Selected Section Info Card - Below Chart */}
          {selectedPath && (
            <div className="w-full max-w-xs p-3 sm:p-4 bg-[#FFE7A3]/20 dark:bg-[#C9A854]/20 shadow-neo-inset dark:shadow-neo-inset-dark border border-[#F2D57C] dark:border-[#C9A854] rounded-lg sm:rounded-xl animate-fadeIn">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A854] dark:text-[#F2D57C] animate-pulse flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <div className="text-xs sm:text-sm text-[#A69348] dark:text-[#F2D57C] font-bold truncate">
                  Viewing: {selectedPath}
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                Click any section to animate and update view
              </p>
            </div>
          )}
        </div>

        {/* Neumorphic Interactive Legend */}
        <div className="space-y-2.5 sm:space-y-3 flex-shrink-0 w-full lg:w-auto">
          <div 
            className={`cursor-pointer p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation active:scale-[0.98] ${
              expandedSection === 'vault'
                ? 'bg-[#FFE7A3]/20 dark:bg-[#C9A854]/20 shadow-neo-inset dark:shadow-neo-inset-dark border-2 border-[#F2D57C] dark:border-[#C9A854]' 
                : 'bg-white dark:bg-gray-800 shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-300/50 dark:border-gray-600/50 hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark'
            }`}
            onClick={() => {
              setExpandedSection(expandedSection === 'vault' ? null : 'vault');
              setSelectedPath(selectedPath?.includes('Vault') ? null : 'Vault Reserves');
            }}
          >
            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5 sm:mb-2 font-semibold">Vault Reserves</div>
            
            {expandedSection === 'vault' ? (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark flex-shrink-0" style={{ backgroundColor: '#f6d55c' }}></div>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">WLFI</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{vaultWLFI.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark flex-shrink-0" style={{ backgroundColor: '#b8941f' }}></div>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">USD1</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{vaultUSD1.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Total Value</span>
                <span className="text-base sm:text-lg font-mono text-gray-900 dark:text-gray-100 font-bold">${totalVault.toFixed(2)}</span>
              </div>
            )}
            
            <div className="text-[10px] sm:text-xs text-[#A69348] dark:text-[#F2D57C] mt-1.5 sm:mt-2 font-semibold">
              {grandTotal > 0 ? ((totalVault / grandTotal) * 100).toFixed(1) : '0.0'}% • Available now
            </div>
          </div>
          
          {/* USD1/WLFI Strategy */}
          <div 
            className={`cursor-pointer p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation active:scale-[0.98] ${
              expandedSection === 'usd1'
                ? 'bg-indigo-100/30 dark:bg-indigo-900/20 shadow-neo-inset dark:shadow-neo-inset-dark border-2 border-indigo-400 dark:border-indigo-500' 
                : 'bg-indigo-50/50 dark:bg-indigo-950/30 shadow-neo-raised dark:shadow-neo-raised-dark border border-indigo-300/50 dark:border-indigo-700/50 hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark'
            }`}
            onClick={() => {
              setExpandedSection(expandedSection === 'usd1' ? null : 'usd1');
              setSelectedPath(selectedPath?.includes('USD1') ? null : 'USD1/WLFI Strategy');
            }}
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">USD1/WLFI Strategy</div>
              <a
                href="https://alpha.charm.fi/ethereum/vault/0x22828dbf15f5fba2394ba7cf8fa9a96bdb444b71"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                title="View on Charm Finance"
              >
                <span>Charm</span>
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            
            {expandedSection === 'usd1' ? (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark bg-indigo-400 flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">USD1</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{strategyUSD1InPool.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark bg-indigo-300 flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">WLFI</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{strategyWLFIinUSD1Pool.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Total Value</span>
                <span className="text-base sm:text-lg font-mono text-gray-900 dark:text-gray-100 font-bold">${strategyUSD1.toFixed(2)}</span>
              </div>
            )}
            
            <div className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 sm:mt-2 font-semibold">
              {grandTotal > 0 ? ((totalUSD1Strategy / grandTotal) * 100).toFixed(1) : '0'}% • Charm USD1/WLFI
            </div>
          </div>

          {/* WETH/WLFI Strategy */}
          {hasWETHStrategyData && (
            <div 
              className={`cursor-pointer p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation active:scale-[0.98] ${
                expandedSection === 'weth'
                  ? 'bg-gray-200 dark:bg-gray-800 shadow-neo-inset dark:shadow-neo-inset-dark border-2 border-gray-400 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-300/50 dark:border-gray-600/50 hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark'
              }`}
              onClick={() => {
                setExpandedSection(expandedSection === 'weth' ? null : 'weth');
                setSelectedPath(selectedPath?.includes('WETH') ? null : 'WETH/WLFI Strategy');
              }}
            >
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">WETH/WLFI Strategy</div>
                <a
                  href="https://alpha.charm.fi/ethereum/vault/0x3314e248f3f752cd16939773d83beb3a362f0aef"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                  title="View on Charm Finance"
                >
                  <span>Charm</span>
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              
              {expandedSection === 'weth' ? (
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark bg-gradient-to-br from-gray-800 to-black flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">WETH</span>
                    </div>
                    <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{strategyWETHNum.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark bg-gradient-to-br from-gray-500 to-gray-600 flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">WLFI</span>
                    </div>
                    <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{strategyWLFIinPoolNum.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Total Value</span>
                  <span className="text-base sm:text-lg font-mono text-gray-900 dark:text-gray-100 font-bold">${totalWETHStrategy.toFixed(2)}</span>
                </div>
              )}
              
              <div className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-400 mt-1.5 sm:mt-2 font-semibold">
                {grandTotal > 0 ? ((totalWETHStrategy / grandTotal) * 100).toFixed(1) : '0'}% • Charm WETH/WLFI
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
    </>
  );
}
