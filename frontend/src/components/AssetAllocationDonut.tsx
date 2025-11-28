import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AssetAllocationDonutProps {
  token0Amount: number;
  token1Amount: number;
  token0Symbol: string;
  token1Symbol: string;
  token0Price: number;
  token1Price: number;
  currentTvl: number;
}

const COLORS = {
  token0: '#D4B474',
  token1: '#6B7280',
};

export default function AssetAllocationDonut({
  token0Amount,
  token1Amount,
  token0Symbol,
  token1Symbol,
  token0Price,
  token1Price,
  currentTvl,
}: AssetAllocationDonutProps) {
  const token0Value = token0Amount * token0Price;
  const token1Value = token1Amount * token1Price;

  const data = [
    {
      name: token0Symbol,
      value: token0Value,
      amount: token0Amount,
      color: COLORS.token0,
    },
    {
      name: token1Symbol,
      value: token1Value,
      amount: token1Amount,
      color: COLORS.token1,
    },
  ].filter(item => item.value > 0); // Only show tokens with value

  if (data.length === 0 || currentTvl === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-sm mb-2">No assets allocated</div>
          <div className="text-xs text-gray-600">TVL: $0.00</div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = currentTvl > 0 ? ((data.value / currentTvl) * 100).toFixed(1) : '0';
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <div className="text-sm font-semibold text-white mb-2">{data.name}</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Amount:</span>
              <span className="text-white font-mono">{data.amount.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Value:</span>
              <span className="text-white font-mono">${data.value.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-700">
              <span className="text-gray-400">Share:</span>
              <span className="text-[#D4B474] font-semibold">{percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
            iconType="circle"
            formatter={(value, entry: any) => {
              const item = data.find(d => d.name === value);
              if (!item) return value;
              const percentage = currentTvl > 0 ? ((item.value / currentTvl) * 100).toFixed(1) : '0';
              return `${value} (${percentage}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2">
        {data.map((item) => {
          const percentage = currentTvl > 0 ? ((item.value / currentTvl) * 100).toFixed(1) : '0';
          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-400">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white font-mono">{item.amount.toFixed(4)}</span>
                <span className="text-gray-500 w-20 text-right">${item.value.toFixed(2)}</span>
                <span className="text-[#D4B474] font-semibold w-12 text-right">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

