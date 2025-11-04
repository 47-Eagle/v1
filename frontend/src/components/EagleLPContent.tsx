import { motion } from 'framer-motion';
import { BrowserProvider } from 'ethers';
import { ArrowDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ICONS } from '../config/icons';
import { NeoButton, NeoStatCard, NeoCard, NeoTaskBadge } from './neumorphic';

interface Props {
  onNavigateDown?: () => void;
  provider: BrowserProvider | null;
}

interface PoolData {
  liquidity: string;
  volume24h: string;
  priceChange24h: string;
  priceUsd: string;
  fdv: string;
  apr: string;
}

export default function EagleLPContent({ onNavigateDown }: Props) {
  const [poolData, setPoolData] = useState<PoolData>({
    liquidity: '$6.6K',
    volume24h: '$14.8K',
    priceChange24h: '-32.2%',
    priceUsd: '$0.00537',
    fdv: '$268.5K',
    apr: '~820%'
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchPoolData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333');
      const data = await response.json();
      
      if (data?.pair) {
        const pair = data.pair;
        const liquidityUsd = parseFloat(pair.liquidity?.usd || 0);
        const volume24h = parseFloat(pair.volume?.h24 || 0);
        const priceUsd = parseFloat(pair.priceUsd || 0);
        const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
        const fdv = parseFloat(pair.fdv || 0);
        
        // Calculate APR: (24h Volume × 365 × Fee %) / Liquidity
        // Assuming 0.3% fee tier (standard Uniswap V3)
        const estimatedAPR = liquidityUsd > 0 
          ? ((volume24h * 365 * 0.003) / liquidityUsd) * 100 
          : 0;

        setPoolData({
          liquidity: liquidityUsd >= 1000 
            ? `$${(liquidityUsd / 1000).toFixed(1)}K` 
            : `$${liquidityUsd.toFixed(2)}`,
          volume24h: volume24h >= 1000 
            ? `$${(volume24h / 1000).toFixed(1)}K` 
            : `$${volume24h.toFixed(2)}`,
          priceChange24h: `${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(1)}%`,
          priceUsd: `$${priceUsd.toFixed(5)}`,
          fdv: fdv >= 1000 
            ? `$${(fdv / 1000).toFixed(1)}K` 
            : `$${fdv.toFixed(2)}`,
          apr: `~${estimatedAPR.toFixed(0)}%`
        });
        
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching pool data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately on mount
    fetchPoolData();

    // Set up interval to fetch every 30 seconds
    const interval = setInterval(() => {
      fetchPoolData();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Back Button */}
        <NeoButton
          onClick={onNavigateDown}
          label="Back to Home"
          icon={<ArrowDown className="w-4 h-4" />}
          className="mb-8"
        />

        {/* Header */}
        <motion.div 
          className="mb-12"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 p-3 rounded-2xl shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-200/50 dark:border-gray-600/50">
                  <img 
                    src={ICONS.EAGLE}
                    alt="Eagle"
                    className="w-12 h-12"
                  />
                </div>
              </motion.div>
              
              <span className="text-3xl font-bold text-gray-400 dark:text-gray-500">+</span>
              
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 p-3 rounded-2xl shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-200/50 dark:border-gray-600/50">
                  <img 
                    src={ICONS.ETHEREUM}
                    alt="ETH"
                    className="w-12 h-12 rounded-full"
                  />
                </div>
              </motion.div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 bg-clip-text text-transparent mb-4">
            EAGLE/ETH Liquidity Pool
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Provide liquidity, earn trading fees, and support the Eagle ecosystem
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <NeoStatCard
            label="Total Liquidity"
            value={poolData.liquidity}
            subtitle={loading ? "Updating..." : "Live on Uniswap V3"}
          />
          <NeoStatCard
            label="24h Volume"
            value={poolData.volume24h}
            subtitle={poolData.priceChange24h}
          />
          <NeoStatCard
            label="Estimated APR"
            value={poolData.apr}
            subtitle="Based on 24h volume"
            highlighted
          />
          <NeoStatCard
            label="EAGLE Price"
            value={poolData.priceUsd}
            subtitle={`FDV: ${poolData.fdv}`}
          />
        </motion.div>

        {/* Last Update Indicator */}
        <div className="flex justify-end items-center gap-2 mb-6 text-xs text-gray-500 dark:text-gray-400">
          <motion.div
            animate={{ rotate: loading ? 360 : 0 }}
            transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.div>
          <span>
            {loading ? 'Updating...' : `Updated ${lastUpdate.toLocaleTimeString()}`}
          </span>
        </div>

        {/* DexScreener Chart Embed */}
        <motion.div 
          className="mb-12"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <NeoCard className="!p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Live Price Chart
              </h3>
            </div>
            <div className="relative w-full" style={{ height: '500px' }}>
              <iframe
                src="https://dexscreener.com/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333?embed=1&theme=dark&trades=0&info=0"
                className="w-full h-full border-0"
                title="DexScreener Chart"
                allow="clipboard-write"
              />
            </div>
          </NeoCard>
        </motion.div>

        {/* Live Pool Card */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <NeoCard className="p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-yellow-400/10 via-orange-400/10 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-2xl"></div>
            </div>

            <div className="max-w-2xl mx-auto relative z-10">
              {/* Icon */}
              <motion.div 
                className="relative w-24 h-24 mx-auto mb-8"
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-500/30 rounded-full blur-xl"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark flex items-center justify-center">
                  <motion.svg 
                    className="w-12 h-12 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </motion.svg>
                </div>
              </motion.div>
              
              {/* Title */}
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600 dark:from-yellow-400 dark:via-orange-400 dark:to-yellow-400 bg-clip-text text-transparent mb-4 flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-500/50"></div>
                  EAGLE/ETH Pool is LIVE
                </span>
              </h2>
              
              {/* Description */}
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-10 leading-relaxed px-4">
                The EAGLE/ETH liquidity pool is now live on Uniswap V3! Provide liquidity, 
                earn trading fees, and support the Eagle ecosystem. Currently generating {poolData.apr} APR from trading activity.
              </p>
              
              {/* Info Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-4 shadow-neo-inset dark:shadow-neo-inset-dark border border-gray-200/50 dark:border-gray-600/50">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Pool Type</div>
                    <div className="flex items-center gap-2">
                      <img 
                        src={ICONS.UNISWAP}
                        alt="Uniswap"
                        className="w-6 h-6"
                      />
                      <span className="text-lg font-bold text-pink-600 dark:text-pink-400">V4</span>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-4 shadow-neo-inset dark:shadow-neo-inset-dark border border-gray-200/50 dark:border-gray-600/50">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Fee Tier</div>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">2%</div>
                  </div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-4 shadow-neo-inset dark:shadow-neo-inset-dark border border-gray-200/50 dark:border-gray-600/50">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Network</div>
                    <div className="flex items-center justify-center">
                      <img 
                        src={ICONS.ETHEREUM}
                        alt="Ethereum Network"
                        className="w-10 h-10 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <motion.div 
                  whileHover={{ scale: 1.03, y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <a 
                    href="https://dexscreener.com/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                      <div className="relative bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300 flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>View on DexScreener</span>
                      </div>
                    </div>
                  </a>
                </motion.div>
                
                <motion.div 
                  whileHover={{ scale: 1.03, y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <a 
                    href="https://t.me/Eagle_community_47" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300 flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Join Community</span>
                      </div>
                    </div>
                  </a>
                </motion.div>
              </div>
            </div>
          </NeoCard>
        </motion.div>
      </div>
    </div>
  );
}

