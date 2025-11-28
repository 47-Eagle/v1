import { motion } from 'framer-motion';
import { BrowserProvider } from 'ethers';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ICONS } from '../config/icons';
import { NeoButton, NeoStatCard, NeoCard, NeoTaskBadge } from './neumorphic';

interface Props {
  onNavigateDown?: () => void;
  onNavigateToCrossChain?: () => void;
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

export default function EagleLPContent({ onNavigateDown, onNavigateToCrossChain }: Props) {
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
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 max-w-7xl">
        {/* Navigation Button */}
        <div className="mb-4 sm:mb-6">
          <NeoButton
            onClick={onNavigateDown}
            label="Back to Home"
            icon={<ArrowDown className="w-4 h-4" />}
          />
        </div>

        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8 md:mb-12"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl"></div>
                <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-200/50 dark:border-gray-600/50">
                  <img 
                    src={ICONS.EAGLE}
                    alt="Eagle"
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                  />
                </div>
              </motion.div>
              
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-400 dark:text-gray-500">+</span>
              
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-orange-400/20 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl"></div>
                <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-200/50 dark:border-gray-600/50">
                  <img 
                    src={ICONS.ETHEREUM}
                    alt="ETH"
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full"
                  />
                </div>
              </motion.div>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3 md:mb-4">
            EAGLE/ETH Liquidity Pool
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-400">
            Provide liquidity, earn trading fees, and support the Eagle ecosystem
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <NeoStatCard
            label="Total Liquidity"
            value={poolData.liquidity}
            subtitle={loading ? "Updating..." : "Live on Uniswap V4"}
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
        <div className="flex justify-end items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5 md:mb-6 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
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

        {/* Pool Info Badges - Minimal Design */}
        <motion.div 
          className="mb-4 sm:mb-6 md:mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Left: Pool Info Badges */}
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark border border-gray-200/50 dark:border-gray-600/50">
                <img src={ICONS.UNISWAP} alt="Uniswap" className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-bold text-pink-600 dark:text-pink-400">V4</span>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark border border-gray-200/50 dark:border-gray-600/50">
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Fee:</span>
                <span className="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">2%</span>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 rounded-full shadow-neo-inset dark:shadow-neo-inset-dark border border-gray-200/50 dark:border-gray-600/50">
                <img src={ICONS.ETHEREUM} alt="Ethereum" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Ethereum</span>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark border border-emerald-200 dark:border-emerald-700">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">LIVE</span>
              </div>
            </div>
            
            {/* Right: CTA Buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 w-full sm:w-auto">
              <a 
                href="https://dexscreener.com/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 active:bg-gray-950 dark:active:bg-gray-900 text-white text-xs sm:text-sm font-semibold rounded-full shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
              >
                <img 
                  src="https://dexscreener.com/icon-192x192.png" 
                  alt="DexScreener" 
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded"
                />
                <span className="hidden sm:inline">DexScreener</span>
                <span className="sm:hidden">DEX</span>
              </a>
              
              <a 
                href="https://t.me/EagleDeFi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#0088cc] hover:to-[#006699] active:from-[#007BB3] active:to-[#005580] text-white text-xs sm:text-sm font-semibold rounded-full shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>Telegram</span>
              </a>
            </div>
          </div>
        </motion.div>

        {/* DexScreener Chart Embed */}
        <motion.div 
          className="mb-6 sm:mb-8 md:mb-12"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <NeoCard className="!p-0 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Live Price Chart
              </h3>
            </div>
            <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[500px]">
              <iframe
                src="https://dexscreener.com/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333?embed=1&theme=dark&trades=0&info=0"
                className="w-full h-full border-0"
                title="DexScreener Chart"
                allow="clipboard-write"
              />
            </div>
          </NeoCard>
        </motion.div>

      </div>
    </div>
  );
}

