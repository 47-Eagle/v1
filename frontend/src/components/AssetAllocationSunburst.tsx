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
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  
  const totalVault = vaultWLFI + vaultUSD1;
  const totalStrategy = strategyWLFI + strategyUSD1;
  const grandTotal = totalVault + totalStrategy;

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 500;
    const height = 400;
    const radius = Math.min(width, height) / 2;

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

    // Arc generator
    const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    // Hover arc (expanded)
    const arcHover = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 + 10);

    // Create arcs
    const paths = svg.selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('d', arc as any)
      .attr('fill', d => d.data.color || '#666')
      .attr('opacity', d => selectedPath && d.data.name !== selectedPath ? 0.3 : 0.8)
      .attr('stroke', '#0a0a0a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover as any)
          .attr('opacity', 1);
        
        // Show tooltip
        const percentage = grandTotal > 0 ? ((d.value || 0) / grandTotal * 100).toFixed(1) : '0';
        d3.select('#tooltip')
          .style('opacity', 1)
          .html(`
            <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="color: white; font-weight: 600; margin-bottom: 4px;">${d.data.name}</div>
              <div style="color: #9ca3af; font-size: 12px;">${(d.value || 0).toFixed(2)} tokens</div>
              <div style="color: #eab308; font-size: 12px;">${percentage}% of total</div>
            </div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any)
          .attr('opacity', d => selectedPath && d.data.name !== selectedPath ? 0.3 : 0.8);
        
        d3.select('#tooltip').style('opacity', 0);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        setSelectedPath(selectedPath === d.data.name ? null : d.data.name);
      });

    // Add center text
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -10)
      .style('font-size', '28px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text(grandTotal.toFixed(0));

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .style('font-size', '12px')
      .style('fill', '#9ca3af')
      .text('Total Tokens');

  }, [vaultWLFI, vaultUSD1, strategyWLFI, strategyUSD1, grandTotal, selectedPath]);

  return (
    <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Asset Allocation</h3>
        {selectedPath && (
          <button
            onClick={() => setSelectedPath(null)}
            className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-lg transition-all"
          >
            Reset View
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        {/* D3 Sunburst Chart */}
        <div className="flex-1">
          <svg ref={svgRef}></svg>
          <div 
            id="tooltip" 
            style={{ 
              position: 'fixed', 
              opacity: 0, 
              pointerEvents: 'none',
              zIndex: 1000,
              transition: 'opacity 0.2s'
            }}
          />
        </div>

        {/* Interactive Legend */}
        <div className="space-y-4">
          <div 
            className={`cursor-pointer p-3 rounded-lg transition-all border ${
              selectedPath?.includes('Vault') 
                ? 'bg-yellow-500/20 border-yellow-500/50 shadow-lg' 
                : 'border-white/5 hover:bg-white/5 hover:border-yellow-500/20'
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
            className={`cursor-pointer p-3 rounded-lg transition-all border ${
              selectedPath?.includes('Strategy') 
                ? 'bg-indigo-500/20 border-indigo-500/50' 
                : 'border-white/5 hover:bg-white/5'
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

          <div className="pt-3 border-t border-white/10">
            <div className="text-xs text-gray-500">Total Assets</div>
            <div className="text-2xl font-bold text-white">{grandTotal.toFixed(2)}</div>
          </div>

          {selectedPath && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg animate-fadeIn">
              <div className="text-xs text-yellow-400 font-semibold mb-1">
                ✨ {selectedPath}
              </div>
              <p className="text-xs text-gray-400">
                Click to deselect or choose another section
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
