import { motion } from 'framer-motion';
import { BrowserProvider } from 'ethers';
import { ArrowDown } from 'lucide-react';
import { ICONS } from '../config/icons';
import { NeoButton, NeoStatCard, NeoCard, NeoTaskBadge } from './neumorphic';

interface Props {
  onNavigateDown?: () => void;
  provider: BrowserProvider | null;
}

export default function EagleLPContent({ onNavigateDown }: Props) {
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
            value="$0"
            subtitle="Coming Soon"
          />
          <NeoStatCard
            label="24h Volume"
            value="$0"
            subtitle="---"
          />
          <NeoStatCard
            label="APR"
            value="---%"
            subtitle="Trading fees"
            highlighted
          />
          <NeoStatCard
            label="Your Liquidity"
            value="$0.00"
            subtitle="Connect wallet"
          />
        </motion.div>

        {/* Coming Soon Card */}
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
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 bg-clip-text text-transparent mb-4">
                EAGLE/ETH Pool Coming Soon
              </h2>
              
              {/* Description */}
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-10 leading-relaxed px-4">
                We're launching the EAGLE/ETH liquidity pool on Uniswap V4 with custom hooks. Provide liquidity, 
                earn trading fees, and benefit from innovative DeFi features.
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
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Network</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">Ethereum</div>
                  </div>
                </motion.div>
              </div>

              {/* CTA Button */}
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
                      <span>Join Telegram for Updates</span>
                    </div>
                  </div>
                </a>
              </motion.div>
            </div>
          </NeoCard>
        </motion.div>
      </div>
    </div>
  );
}

