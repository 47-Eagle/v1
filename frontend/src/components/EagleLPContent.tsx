import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrowserProvider } from 'ethers';

interface Props {
  onNavigateDown?: () => void;
  provider: BrowserProvider | null;
}

export default function EagleLPContent({ onNavigateDown }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Back Button */}
        <button 
          onClick={onNavigateDown}
          className="flex items-center gap-2 text-gray-400 hover:text-yellow-500 mb-8 transition-colors group inline-flex"
        >
          <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Header */}
        <motion.div 
          className="mb-12"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                alt="Eagle"
                className="w-16 h-16"
              />
              <span className="text-4xl font-bold text-white">+</span>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                Ξ
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-4">EAGLE/ETH Liquidity Pool</h1>
          <p className="text-xl text-gray-400">
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
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 p-6">
            <p className="text-sm text-gray-400 mb-2">Total Liquidity</p>
            <p className="text-3xl font-bold text-white">$0</p>
            <p className="text-sm text-gray-500 mt-1">Coming Soon</p>
          </div>
          
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 p-6">
            <p className="text-sm text-gray-400 mb-2">24h Volume</p>
            <p className="text-3xl font-bold text-white">$0</p>
            <p className="text-sm text-emerald-400 mt-1">---</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-2xl border border-yellow-500/20 p-6">
            <p className="text-sm text-gray-400 mb-2">APR</p>
            <p className="text-3xl font-bold text-yellow-500">---%</p>
            <p className="text-sm text-yellow-500/60 mt-1">Trading fees</p>
          </div>
          
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 p-6">
            <p className="text-sm text-gray-400 mb-2">Your Liquidity</p>
            <p className="text-3xl font-bold text-white">$0.00</p>
            <p className="text-sm text-gray-500 mt-1">Connect wallet</p>
          </div>
        </motion.div>

        {/* Coming Soon Card */}
        <motion.div 
          className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border-2 border-blue-500/30 p-12 text-center"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              EAGLE/ETH Pool Coming Soon
            </h2>
            
            <p className="text-xl text-gray-400 mb-8">
              We're launching the EAGLE/ETH liquidity pool on Uniswap V3. Provide liquidity, earn trading fees, 
              and help build the Eagle ecosystem.
            </p>
            
            <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Pool Type</p>
                <p className="text-lg font-semibold text-white">Uniswap V3</p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Fee Tier</p>
                <p className="text-lg font-semibold text-white">1%</p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Network</p>
                <p className="text-lg font-semibold text-white">Ethereum</p>
              </div>
            </div>

            <div className="mt-8">
              <a 
                href="https://t.me/Eagle_community_47" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all"
              >
                <span>Join Telegram for Updates</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

