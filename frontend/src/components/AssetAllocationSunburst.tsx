import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AssetAllocationSunburstProps {
  vaultWLFI: number;
  vaultUSD1: number;
  strategyWLFI: number;
  strategyUSD1: number;
}

export default function AssetAllocationSunburst({
  vaultWLFI,
  vaultUSD1,
  strategyWLFI,
  strategyUSD1
}: AssetAllocationSunburstProps) {
  
  const totalVault = vaultWLFI + vaultUSD1;
  const totalStrategy = strategyWLFI + strategyUSD1;
  const grandTotal = totalVault + totalStrategy;

  // Outer ring: Vault vs Strategies
  const outerData = useMemo(() => [
    { name: 'Vault Reserves', value: totalVault, color: '#10b981' },
    { name: 'Charm Strategy', value: totalStrategy, color: '#6366f1' },
  ], [totalVault, totalStrategy]);

  // Inner ring: Token breakdown
  const innerData = useMemo(() => [
    { name: 'Vault WLFI', value: vaultWLFI, color: '#34d399' },
    { name: 'Vault USD1', value: vaultUSD1, color: '#059669' },
    { name: 'Strategy WLFI', value: strategyWLFI, color: '#818cf8' },
    { name: 'Strategy USD1', value: strategyUSD1, color: '#4f46e5' },
  ], [vaultWLFI, vaultUSD1, strategyWLFI, strategyUSD1]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = grandTotal > 0 ? ((data.value / grandTotal) * 100).toFixed(1) : '0';
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold text-sm">{data.name}</p>
          <p className="text-gray-400 text-xs mt-1">{data.value.toFixed(2)} tokens</p>
          <p className="text-yellow-500 text-xs">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Asset Allocation</h3>
      
      <div className="flex items-center gap-6">
        {/* Sunburst Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              {/* Inner ring - Token breakdown */}
              <Pie
                data={innerData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {innerData.map((entry, index) => (
                  <Cell key={`inner-${index}`} fill={entry.color} />
                ))}
              </Pie>
              
              {/* Outer ring - Vault vs Strategy */}
              <Pie
                data={outerData}
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={130}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => 
                  grandTotal > 0 ? `${((value / grandTotal) * 100).toFixed(0)}%` : '0%'
                }
              >
                {outerData.map((entry, index) => (
                  <Cell key={`outer-${index}`} fill={entry.color} />
                ))}
              </Pie>
              
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Vault Reserves</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#34d399' }}></div>
                <span className="text-sm text-gray-300">WLFI: {vaultWLFI.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#059669' }}></div>
                <span className="text-sm text-gray-300">USD1: {vaultUSD1.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Charm Strategy</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#818cf8' }}></div>
                <span className="text-sm text-gray-300">WLFI: {strategyWLFI.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4f46e5' }}></div>
                <span className="text-sm text-gray-300">USD1: {strategyUSD1.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="text-xs text-gray-500">Total Assets</div>
            <div className="text-lg font-bold text-white">{grandTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

