import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AssetAllocationVizProps {
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
  token0Light: '#F2D57C',
  token1: '#6366F1',
  token1Light: '#818CF8',
};

export default function AssetAllocationViz({
  token0Amount,
  token1Amount,
  token0Symbol,
  token1Symbol,
  token0Price,
  token1Price,
  currentTvl,
}: AssetAllocationVizProps) {
  const token0Value = token0Amount * token0Price;
  const token1Value = token1Amount * token1Price;
  const token0Percentage = currentTvl > 0 ? (token0Value / currentTvl) * 100 : 0;
  const token1Percentage = currentTvl > 0 ? (token1Value / currentTvl) * 100 : 0;

  const data = [
    {
      name: token0Symbol,
      value: token0Value,
      amount: token0Amount,
      color: COLORS.token0,
      percentage: token0Percentage,
    },
    {
      name: token1Symbol,
      value: token1Value,
      amount: token1Amount,
      color: COLORS.token1,
      percentage: token1Percentage,
    },
  ].filter((item) => item.value > 0);

  if (currentTvl === 0 || data.length === 0) {
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
      return (
        <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 shadow-2xl">
          <div className="text-sm font-semibold text-white mb-3">{data.name}</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between gap-6">
              <span className="text-gray-400">Amount:</span>
              <span className="text-white font-mono font-medium">{data.amount.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-gray-400">Value:</span>
              <span className="text-white font-mono font-medium">${data.value.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-6 pt-2 border-t border-gray-700">
              <span className="text-gray-400">Allocation:</span>
              <span className="text-[#D4B474] font-bold">{data.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4B474]/20 via-transparent to-[#6366F1]/20 rounded-full blur-3xl"></div>
            
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <defs>
                  <linearGradient id="token0Gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={COLORS.token0} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS.token0Light} stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="token1Gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={COLORS.token1} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS.token1Light} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={110}
                  innerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={1000}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === token0Symbol ? 'url(#token0Gradient)' : 'url(#token1Gradient)'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  ${(currentTvl / 1000).toFixed(1)}K
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Total Value</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Details Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          {data.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 hover:border-opacity-100 transition-all duration-300 p-6"
            >
              {/* Background gradient on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${item.color}15, transparent)`,
                }}
              ></div>

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full shadow-lg"
                      style={{
                        background: item.name === token0Symbol
                          ? 'linear-gradient(135deg, #D4B474, #F2D57C)'
                          : 'linear-gradient(135deg, #6366F1, #818CF8)',
                      }}
                    ></div>
                    <div>
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="text-xs text-gray-400">Token Allocation</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{item.percentage.toFixed(1)}%</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          item.name === token0Symbol
                            ? 'linear-gradient(90deg, #D4B474, #F2D57C)'
                            : 'linear-gradient(90deg, #6366F1, #818CF8)',
                        boxShadow: `0 0 10px ${item.color}40`,
                      }}
                    ></motion.div>
                  </div>
                </div>

                {/* Token Details */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700/30">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Amount</div>
                    <div className="text-sm font-mono text-white font-medium">
                      {item.amount.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">USD Value</div>
                    <div className="text-sm font-mono text-white font-medium">
                      ${item.value.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Total Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#D4B474]/10 to-[#6366F1]/10 border border-[#D4B474]/20"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Total Value Locked</div>
              <div className="text-xl font-bold text-white">
                ${currentTvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

