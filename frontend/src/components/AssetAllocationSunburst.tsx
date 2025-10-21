import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface AssetAllocationSunburstProps {
  vaultWLFI: number;
  vaultUSD1: number;
  strategyWLFI: number;
  strategyUSD1: number;
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
  strategyUSD1
}: AssetAllocationSunburstProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  
  const totalVault = vaultWLFI + vaultUSD1;
  const totalStrategy = strategyWLFI + strategyUSD1;
  const grandTotal = totalVault + totalStrategy;

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 450;
    const height = 450;
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

    // Arc generators - collapsed state (small) and expanded state (full)
    const arcCollapsed = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(0)
      .outerRadius(20); // Small circle when collapsed

    const arcExpanded = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    // Hover arc (even more expanded)
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

    // Create arcs that animate between collapsed and expanded states
    const paths = svg.selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('d', (isExpanded ? arcExpanded : arcCollapsed) as any)
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
      });

    // Add elegant center text with gradient
    const centerGroup = svg.append('g');
    
    // Subtle circle background
    centerGroup.append('circle')
      .attr('r', 55)
      .attr('fill', 'rgba(0, 0, 0, 0.4)')
      .attr('stroke', 'rgba(212, 175, 55, 0.3)')
      .attr('stroke-width', 1.5);
    
    // Center content - always visible, clickable to toggle
    centerGroup.append('circle')
      .attr('r', 60)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('click', () => setIsExpanded(!isExpanded));

    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -8)
      .style('font-size', '32px')
      .style('font-weight', '700')
      .style('fill', '#d4af37')
      .style('letter-spacing', '1px')
      .style('cursor', 'pointer')
      .text(grandTotal.toFixed(0))
      .on('click', () => setIsExpanded(!isExpanded));

    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 12)
      .style('font-size', '11px')
      .style('fill', '#9ca3af')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '1.5px')
      .style('cursor', 'pointer')
      .text(isExpanded ? 'Click to Close' : 'Click to Open')
      .on('click', () => setIsExpanded(!isExpanded));

    // Animate arcs when expanded state changes
    paths.transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr('d', (isExpanded ? arcExpanded : arcCollapsed) as any)
      .attr('opacity', isExpanded ? 0.85 : 0);

  }, [vaultWLFI, vaultUSD1, strategyWLFI, strategyUSD1, grandTotal, selectedPath, isExpanded]);

  return (
    <div className="relative bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent border border-white/10 rounded-2xl p-8 mb-8 overflow-hidden">
      {/* Subtle animated background gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-bold text-xl mb-1">Asset Allocation</h3>
            <p className="text-sm text-gray-500">Real-time token distribution</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 text-yellow-400 text-sm font-semibold rounded-xl transition-all shadow-lg"
          >
            <span className="flex items-center gap-2">
              {isExpanded ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Expand
                </>
              )}
            </span>
          </button>
        </div>
      
      <div className="flex items-center justify-center gap-10 max-w-5xl mx-auto">
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

        {/* Elegant Interactive Legend */}
        <div className="space-y-3 flex-shrink-0">
          <div 
            className={`cursor-pointer p-4 rounded-xl transition-all duration-300 border ${
              selectedPath?.includes('Vault') 
                ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-yellow-500/50 shadow-xl' 
                : 'bg-black/20 border-white/5 hover:bg-black/30 hover:border-yellow-500/30 hover:shadow-lg'
            }`}
            onClick={() => setSelectedPath(selectedPath?.includes('Vault') ? null : 'Vault Reserves')}
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Vault Reserves</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f6d55c' }}></div>
                  <span className="text-sm text-gray-300">WLFI</span>
                </div>
                <span className="text-sm font-mono text-white">{vaultWLFI.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#b8941f' }}></div>
                  <span className="text-sm text-gray-300">USD1</span>
                </div>
                <span className="text-sm font-mono text-white">{vaultUSD1.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-xs text-yellow-500 mt-2 font-semibold">
              {grandTotal > 0 ? ((totalVault / grandTotal) * 100).toFixed(1) : '0'}% • Available now
            </div>
          </div>
          
          <div 
            className={`cursor-pointer p-4 rounded-xl transition-all duration-300 border ${
              selectedPath?.includes('Strategy') 
                ? 'bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border-indigo-500/50 shadow-xl' 
                : 'bg-black/20 border-white/5 hover:bg-black/30 hover:border-indigo-500/30 hover:shadow-lg'
            }`}
            onClick={() => setSelectedPath(selectedPath?.includes('Strategy') ? null : 'Charm Strategy')}
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Charm Strategy</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                  <span className="text-sm text-gray-300">WLFI</span>
                </div>
                <span className="text-sm font-mono text-white">{strategyWLFI.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-700"></div>
                  <span className="text-sm text-gray-300">USD1</span>
                </div>
                <span className="text-sm font-mono text-white">{strategyUSD1.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {grandTotal > 0 ? ((totalStrategy / grandTotal) * 100).toFixed(1) : '0'}% • Earning yield
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4">
            <div className="bg-gradient-to-br from-yellow-500/10 to-transparent rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Assets</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
                {grandTotal.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 mt-1">WLFI + USD1</div>
            </div>
          </div>

          {!isExpanded && (
            <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-yellow-400 font-semibold">
                  Chart Collapsed
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Click center or "Expand" button to view breakdown
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
