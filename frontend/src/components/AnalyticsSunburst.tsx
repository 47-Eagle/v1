import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface AnalyticsSunburstProps {
  token0Amount: number;
  token1Amount: number;
  token0Symbol: string;
  token1Symbol: string;
  token0Price: number;
  token1Price: number;
  currentTvl: number;
}

interface HierarchyNode {
  name: string;
  value: number;
  color: string;
  children?: HierarchyNode[];
}

export default function AnalyticsSunburst({
  token0Amount,
  token1Amount,
  token0Symbol,
  token1Symbol,
  token0Price,
  token1Price,
  currentTvl,
}: AnalyticsSunburstProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const token0Value = token0Amount * token0Price;
  const token1Value = token1Amount * token1Price;

  useEffect(() => {
    if (!svgRef.current || currentTvl === 0) return;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    // Responsive sizing
    const isMobile = window.innerWidth < 640;
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 320 : 450;
    const radius = Math.min(width, height) / 2 - 40;

    // Create hierarchical data structure
    const data: HierarchyNode = {
      name: 'Total Assets',
      value: currentTvl,
      color: '#1F2937',
      children: [
        {
          name: token0Symbol,
          value: token0Value,
          color: '#D4B474', // Gold for primary token
          children: [
            {
              name: `${token0Symbol} Amount`,
              value: token0Value,
              color: '#F2D57C', // Lighter gold
            },
          ],
        },
        {
          name: token1Symbol,
          value: token1Value,
          color: '#6366F1', // Indigo for secondary token
          children: [
            {
              name: `${token1Symbol} Amount`,
              value: token1Value,
              color: '#818CF8', // Lighter indigo
            },
          ],
        },
      ],
    };

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create hierarchy
    const root = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<HierarchyNode>().size([2 * Math.PI, radius]);

    partition(root);

    // Arc generator
    const arc = d3
      .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.01))
      .padRadius(radius / 3)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1 - 2);

    // Hover arc (expanded)
    const arcHover = d3
      .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.01))
      .padRadius(radius / 3)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1 + 8);

    // Add glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create arcs
    const paths = svg
      .selectAll('path')
      .data(root.descendants().filter((d) => d.depth > 0))
      .join('path')
      .attr('d', arc as any)
      .attr('fill', (d) => d.data.color || '#666')
      .attr('opacity', (d) => {
        if (selectedPath && d.data.name !== selectedPath) return 0.3;
        if (hoveredPath && d.data.name === hoveredPath) return 1;
        return 0.9;
      })
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)')
      .style('filter', (d) =>
        hoveredPath === d.data.name ? 'url(#glow)' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
      )
      .on('mouseenter', function (event, d) {
        setHoveredPath(d.data.name);
        d3.select(this)
          .transition()
          .duration(200)
          .ease(d3.easeCubicOut)
          .attr('d', arcHover as any)
          .attr('opacity', 1)
          .style('filter', 'url(#glow)');

        const usdValue = d.value || 0;
        const percentage = currentTvl > 0 ? ((usdValue / currentTvl) * 100).toFixed(2) : '0';

        let tokenAmount = '';
        let tokenSymbol = '';

        if (d.data.name === token0Symbol || d.data.name === `${token0Symbol} Amount`) {
          tokenAmount = token0Amount.toFixed(4);
          tokenSymbol = token0Symbol;
        } else if (d.data.name === token1Symbol || d.data.name === `${token1Symbol} Amount`) {
          tokenAmount = token1Amount.toFixed(4);
          tokenSymbol = token1Symbol;
        }

        d3.select('#analytics-tooltip')
          .style('left', event.clientX + 15 + 'px')
          .style('top', event.clientY - 10 + 'px')
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
              ${tokenAmount ? `
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="color: #9ca3af; font-size: 12px;">Amount:</span>
                <span style="color: #eab308; font-weight: 600; font-family: monospace; font-size: 13px;">${tokenAmount} ${tokenSymbol}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="color: #9ca3af; font-size: 12px;">USD Value:</span>
                <span style="color: white; font-weight: 600; font-family: monospace; font-size: 13px;">$${usdValue.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                <span style="color: #9ca3af; font-size: 12px;">Share:</span>
                <span style="color: #eab308; font-weight: 700; font-size: 16px;">${percentage}%</span>
              </div>
            </div>
          `);
      })
      .on('mousemove', function (event) {
        d3.select('#analytics-tooltip')
          .style('left', event.clientX + 15 + 'px')
          .style('top', event.clientY - 10 + 'px');
      })
      .on('mouseleave', function () {
        setHoveredPath(null);
        d3.select(this)
          .transition()
          .duration(200)
          .ease(d3.easeCubicIn)
          .attr('d', arc as any)
          .attr('opacity', selectedPath && selectedPath !== d3.select(this).datum().data.name ? 0.3 : 0.9)
          .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))');

        d3.select('#analytics-tooltip')
          .transition()
          .duration(200)
          .style('opacity', '0')
          .on('end', function () {
            d3.select(this).style('left', '-9999px').style('top', '-9999px');
          });
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        setSelectedPath(selectedPath === d.data.name ? null : d.data.name);
      });

    // Center circle with total TVL
    const centerGroup = svg.append('g');
    centerGroup
      .append('circle')
      .attr('r', 60)
      .attr('fill', 'rgba(0, 0, 0, 0.5)')
      .attr('stroke', 'rgba(212, 175, 55, 0.4)')
      .attr('stroke-width', 2);

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -8)
      .style('font-size', '28px')
      .style('font-weight', '700')
      .style('fill', '#D4B474')
      .text(`$${(currentTvl / 1000).toFixed(1)}K`);

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 12)
      .style('font-size', '10px')
      .style('fill', '#9ca3af')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '1.5px')
      .text('Total Value');
  }, [
    token0Amount,
    token1Amount,
    token0Symbol,
    token1Symbol,
    token0Price,
    token1Price,
    currentTvl,
    selectedPath,
    hoveredPath,
  ]);

  if (currentTvl === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-sm mb-2">No assets allocated</div>
          <div className="text-xs text-gray-600">TVL: $0.00</div>
        </div>
      </div>
    );
  }

  const token0Percentage = currentTvl > 0 ? ((token0Value / currentTvl) * 100).toFixed(1) : '0';
  const token1Percentage = currentTvl > 0 ? ((token1Value / currentTvl) * 100).toFixed(1) : '0';

  return (
    <>
      {/* Tooltip Portal */}
      {createPortal(<div id="analytics-tooltip" />, document.body)}

      <div className="relative">
        {/* Sunburst Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4B474]/10 to-indigo-500/10 rounded-full blur-2xl"></div>
            <svg ref={svgRef} className="relative drop-shadow-2xl"></svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedPath === token0Symbol || selectedPath === `${token0Symbol} Amount`
                  ? 'bg-[#D4B474]/20 border-2 border-[#D4B474]'
                  : 'bg-gray-800/50 border border-gray-700/50'
              }`}
              onClick={() => setSelectedPath(selectedPath === token0Symbol ? null : token0Symbol)}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#D4B474' }}></div>
              <div className="text-sm">
                <span className="text-gray-300">{token0Symbol}</span>
                <span className="text-gray-500 ml-2">{token0Percentage}%</span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedPath === token1Symbol || selectedPath === `${token1Symbol} Amount`
                  ? 'bg-indigo-500/20 border-2 border-indigo-500'
                  : 'bg-gray-800/50 border border-gray-700/50'
              }`}
              onClick={() => setSelectedPath(selectedPath === token1Symbol ? null : token1Symbol)}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#6366F1' }}></div>
              <div className="text-sm">
                <span className="text-gray-300">{token1Symbol}</span>
                <span className="text-gray-500 ml-2">{token1Percentage}%</span>
              </div>
            </motion.div>
          </div>

          {/* Token Details */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/30">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{token0Symbol}</div>
              <div className="text-lg font-light text-white mb-1">{token0Amount.toFixed(4)}</div>
              <div className="text-xs text-[#D4B474]">${token0Value.toFixed(2)}</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/30">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{token1Symbol}</div>
              <div className="text-lg font-light text-white mb-1">{token1Amount.toFixed(4)}</div>
              <div className="text-xs text-indigo-400">${token1Value.toFixed(2)}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

