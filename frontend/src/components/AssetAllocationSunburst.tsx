import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface AssetAllocationSunburstProps {
  vaultWLFI: number;
  vaultUSD1: number;
  strategyWLFI: number;
  strategyUSD1: number;
  wlfiPrice: number;
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
  wlfiPrice
}: AssetAllocationSunburstProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Convert USD1 to WLFI equivalent (USD1 = $1, so USD1 / wlfiPrice = WLFI equivalent)
  const vaultUSD1InWLFI = wlfiPrice > 0 ? vaultUSD1 / wlfiPrice : 0;
  const strategyUSD1InWLFI = wlfiPrice > 0 ? strategyUSD1 / wlfiPrice : 0;
  
  const totalVault = vaultWLFI + vaultUSD1;
  const totalStrategy = strategyWLFI + strategyUSD1;
  const grandTotal = totalVault + totalStrategy;
  
  // Total in WLFI terms
  const totalInWLFI = vaultWLFI + vaultUSD1InWLFI + strategyWLFI + strategyUSD1InWLFI;

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    // Responsive sizing based on viewport
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
    const width = isMobile ? 300 : isTablet ? 350 : 450;
    const height = isMobile ? 300 : isTablet ? 350 : 450;
    const radius = Math.min(width, height) / 2 - 30;

    // Hierarchical data structure with Eagle Finance theme colors
    const data: HierarchyNode = {
      name: 'Total Assets',
      children: [
        {
          name: 'Vault Reserves',
          color: '#d4af37', // Eagle Gold
          children: [
            { name: 'Vault WLFI', value: vaultWLFI, color: '#f6d55c' }, // Light Gold
            { name: 'Vault USD1', value: vaultUSD1, color: '#b8941f' } // Dark Gold
          ]
        },
        {
          name: 'Charm Strategy',
          color: '#6366f1', // Indigo (Strategy)
          children: [
            { name: 'Strategy WLFI', value: strategyWLFI, color: '#818cf8' }, // Light Indigo
            { name: 'Strategy USD1', value: strategyUSD1, color: '#4f46e5' } // Dark Indigo
          ]
        }
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
        
        // Show elegant tooltip
        const percentage = grandTotal > 0 ? ((d.value || 0) / grandTotal * 100).toFixed(1) : '0';
        d3.select('#tooltip')
          .style('opacity', 1)
          .html(`
            <div style="
              background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,20,0.95) 100%);
              padding: 16px;
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.2);
              box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${d.data.color}40;
              backdrop-filter: blur(10px);
              min-width: 180px;
            ">
              <div style="color: ${d.data.color}; font-weight: 700; margin-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">${d.data.name.toUpperCase()}</div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                <span style="color: #9ca3af; font-size: 12px;">Amount:</span>
                <span style="color: white; font-weight: 600; font-family: monospace; font-size: 13px;">${(d.value || 0).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="color: #9ca3af; font-size: 12px;">Share:</span>
                <span style="color: #eab308; font-weight: 700; font-size: 16px;">${percentage}%</span>
              </div>
            </div>
          `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 10) + 'px');
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
          .style('opacity', 0);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        setSelectedPath(d.data.name);
        
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
      .style('fill', '#d4af37')
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

  }, [vaultWLFI, vaultUSD1, strategyWLFI, strategyUSD1, grandTotal, selectedPath, animationKey, wlfiPrice, totalInWLFI]);

  return (
    <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 shadow-neo-raised dark:shadow-neo-raised-dark rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 overflow-hidden border border-gray-300/50 dark:border-gray-600/40 transition-colors duration-300">
      {/* Subtle animated background gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
      
      <div className="relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
          <div>
            <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg sm:text-xl mb-1">Asset Allocation</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Real-time token distribution</p>
          </div>
          {selectedPath && (
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-100 dark:bg-yellow-900/30 shadow-neo-inset dark:shadow-neo-inset-dark text-yellow-700 dark:text-yellow-400 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl">
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
        <div className="flex-shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-blue-500/10 rounded-full blur-2xl"></div>
          <svg ref={svgRef} className="relative drop-shadow-2xl"></svg>
          <div 
            id="tooltip" 
            style={{ 
              position: 'fixed', 
              opacity: 0, 
              pointerEvents: 'none',
              zIndex: 1000,
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>

        {/* Neumorphic Interactive Legend */}
        <div className="space-y-2.5 sm:space-y-3 flex-shrink-0 w-full lg:w-auto">
          <div 
            className={`cursor-pointer p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation active:scale-[0.98] ${
              selectedPath?.includes('Vault') 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 shadow-neo-inset dark:shadow-neo-inset-dark border-2 border-yellow-400 dark:border-yellow-600' 
                : 'bg-white dark:bg-gray-800 shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-300/50 dark:border-gray-600/50 hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark'
            }`}
            onClick={() => setSelectedPath(selectedPath?.includes('Vault') ? null : 'Vault Reserves')}
          >
            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5 sm:mb-2 font-semibold">Vault Reserves</div>
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
            <div className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-400 mt-1.5 sm:mt-2 font-semibold">
              {grandTotal > 0 ? ((totalVault / grandTotal) * 100).toFixed(1) : '0.0'}% • Available now
            </div>
          </div>
          
          <div 
            className={`cursor-pointer p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation active:scale-[0.98] ${
              selectedPath?.includes('Strategy') 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 shadow-neo-inset dark:shadow-neo-inset-dark border-2 border-indigo-400 dark:border-indigo-600' 
                : 'bg-white dark:bg-gray-800 shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-300/50 dark:border-gray-600/50 hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark'
            }`}
            onClick={() => setSelectedPath(selectedPath?.includes('Strategy') ? null : 'Charm Strategy')}
          >
            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5 sm:mb-2 font-semibold">Charm Strategy</div>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark bg-indigo-400 flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">WLFI</span>
                </div>
                <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{strategyWLFI.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark bg-indigo-700 flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">USD1</span>
                </div>
                <span className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 font-semibold">{strategyUSD1.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-indigo-700 dark:text-indigo-400 mt-1.5 sm:mt-2 font-semibold">
              {grandTotal > 0 ? ((totalStrategy / grandTotal) * 100).toFixed(1) : '100.0'}% • Earning yield
            </div>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-gray-300/50 dark:border-gray-600/40 mt-3 sm:mt-4">
            <div className="bg-white dark:bg-gray-800 shadow-neo-inset dark:shadow-neo-inset-dark rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50">
              <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1 font-semibold">Total Assets</div>
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {totalInWLFI.toFixed(2)}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium">WLFI (incl. USD1 equiv.)</div>
            </div>
          </div>

          {selectedPath && (
            <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/30 shadow-neo-inset dark:shadow-neo-inset-dark border border-yellow-400 dark:border-yellow-600 rounded-lg sm:rounded-xl animate-fadeIn">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600 dark:text-yellow-400 animate-pulse flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 font-bold truncate">
                  Viewing: {selectedPath}
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                Click any section to animate and update view
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
