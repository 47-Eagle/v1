import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { BrowserProvider } from 'ethers';
import { ICONS } from '../config/icons';
import { UniswapBadge, CharmBadge, LayerZeroBadge } from './tech-stack';

interface Props {
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  provider: BrowserProvider | null;
}

export default function EagleHomeContent({ onNavigateUp, onNavigateDown, provider }: Props) {

  return (
    <div className="h-full flex items-center justify-center px-3 sm:px-6 relative overflow-y-auto overflow-x-hidden transition-colors duration-300">
      <div className="max-w-4xl mx-auto w-full relative z-10 my-auto">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-6 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img 
            src={ICONS.EAGLE}
            alt="Eagle"
            className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 opacity-90"
          />
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-2 sm:mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-[#E4CFA0] via-[#D4B474] to-[#D4B474] dark:from-[#E4CFA0] dark:via-[#D4B474] dark:to-[#D4B474] bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(251,191,36,0.5)] dark:drop-shadow-[0_4px_16px_rgba(251,191,36,0.6)]">
              EAGLE
            </span>
          </h1>
          
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 px-2">Omnichain WLFI Yield Strategy Vault</p>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-10">
            <motion.div
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-br from-neo-bg-light to-gray-50 dark:from-neo-bg-dark dark:to-gray-900 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark border border-gray-200/50 dark:border-gray-700/30 transition-all duration-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold">Powered by</span>
              <UniswapBadge className="!w-5 !h-5 sm:!w-6 sm:!h-6" />
            </motion.div>
            <motion.div
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-br from-neo-bg-light to-gray-50 dark:from-neo-bg-dark dark:to-gray-900 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark border border-gray-200/50 dark:border-gray-700/30 transition-all duration-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold">Managed by</span>
              <CharmBadge className="!w-5 !h-5 sm:!w-6 sm:!h-6" />
            </motion.div>
            <motion.div
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-br from-neo-bg-light to-gray-50 dark:from-neo-bg-dark dark:to-gray-900 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark border border-gray-200/50 dark:border-gray-700/30 transition-all duration-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold">Omnichain via</span>
              <LayerZeroBadge className="!w-5 !h-5 sm:!w-6 sm:!h-6" />
            </motion.div>
          </div>
        </motion.div>

        {/* Main Navigation Cards */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* LP Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark rounded-2xl p-5 sm:p-8 transition-all duration-300 text-left cursor-pointer group relative overflow-hidden"
            onClick={onNavigateUp}
          >
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Status Badge - Top Right */}
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-orange-400 dark:border-orange-500 rounded-full shadow-sm">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] sm:text-xs font-semibold text-orange-700 dark:text-orange-300">Coming Soon</span>
            </div>
            
            <div className="flex items-start justify-between mb-3 sm:mb-4 pr-24 sm:pr-32">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">EAGLE/ETH LP</h3>
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </motion.div>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">Provide liquidity, earn fees</p>
          </motion.div>

          {/* Vault Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark rounded-2xl p-5 sm:p-8 transition-all duration-300 text-left cursor-pointer group relative overflow-hidden"
            onClick={onNavigateDown}
          >
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Status Badge - Top Right */}
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-400 dark:border-green-500 rounded-full shadow-sm">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] sm:text-xs font-semibold text-green-700 dark:text-green-300">Active</span>
            </div>
            
            <div className="flex items-start justify-between mb-3 sm:mb-4 pr-16 sm:pr-32">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#A27D46] dark:group-hover:text-[#D4B474] transition-colors">Vault Engine</h3>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 group-hover:text-[#A27D46] dark:group-hover:text-[#D4B474] transition-colors" />
              </motion.div>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">Deposit & earn yield</p>
          </motion.div>
        </motion.div>

        {/* Bottom Navigation */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.a 
            href="https://docs.47eagle.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark rounded-full text-gray-700 dark:text-gray-300 hover:text-[#8C6A38] dark:hover:text-[#D4B474] transition-all font-medium"
          >
            Docs
          </motion.a>
          <motion.a 
            href="#" 
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark rounded-full text-gray-700 dark:text-gray-300 hover:text-[#8C6A38] dark:hover:text-[#D4B474] transition-all font-medium"
          >
            Summary
          </motion.a>
          <motion.a 
            href="https://x.com/teameagle47" 
            target="_blank" 
            rel="noopener noreferrer" 
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark rounded-full text-gray-700 dark:text-gray-300 hover:text-[#8C6A38] dark:hover:text-[#D4B474] transition-all font-medium"
          >
            Twitter
          </motion.a>
          <motion.a 
            href="https://t.me/Eagle_community_47" 
            target="_blank" 
            rel="noopener noreferrer" 
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark rounded-full text-gray-700 dark:text-gray-300 hover:text-[#8C6A38] dark:hover:text-[#D4B474] transition-all font-medium"
          >
            Telegram
          </motion.a>
        </motion.div>
      </div>
    </div>
  );
}
