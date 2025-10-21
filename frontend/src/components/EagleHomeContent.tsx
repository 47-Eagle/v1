import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { motion } from 'framer-motion';
import { CONTRACTS } from '../config/contracts';

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

interface Props {
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  provider: BrowserProvider | null;
}

export default function EagleHomeContent({ onNavigateUp, onNavigateDown, provider }: Props) {
  const [stats, setStats] = useState({
    tvl: '0',
    holders: '247',
    apy: '22.22'
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!provider) return;
      
      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const totalAssets = await vault.totalAssets();
        setStats(prev => ({
          ...prev,
          tvl: Number(formatEther(totalAssets)).toFixed(2)
        }));
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [provider]);

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-5xl mx-auto w-full">
        {/* Hero */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
            alt="Eagle"
            className="w-20 h-20 mx-auto mb-4"
          />
          
          <h1 className="text-6xl font-bold mb-3">
            <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
              EAGLE
            </span>
          </h1>
          
          <p className="text-lg text-gray-400 mb-6">Multi-Chain Yield Aggregator</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">TVL</div>
              <div className="text-2xl font-bold text-white">${stats.tvl}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Holders</div>
              <div className="text-2xl font-bold text-white">{stats.holders}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">APY</div>
              <div className="text-2xl font-bold text-yellow-500">{stats.apy}%</div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Links - Minimalistic */}
        <motion.div 
          className="grid grid-cols-2 gap-4 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={onNavigateUp}
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl p-6 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">EAGLE/ETH LP</h3>
              <svg className="w-5 h-5 text-blue-400 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-3">Provide liquidity, earn fees</p>
            <div className="text-xs text-orange-400">Coming Soon</div>
          </button>

          <button
            onClick={onNavigateDown}
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/50 rounded-xl p-6 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Vault Engine</h3>
              <svg className="w-5 h-5 text-yellow-400 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-3">Deposit & earn yield</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-400">Active • ${stats.tvl} TVL</span>
            </div>
          </button>
        </motion.div>

        {/* Links */}
        <motion.div
          className="text-center mt-8 flex items-center justify-center gap-6 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <a href="https://docs.47eagle.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500">Docs</a>
          <a href="https://t.me/Eagle_community_47" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500">Community</a>
          <a href="https://x.com/teameagle47" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500">Twitter</a>
        </motion.div>
      </div>
    </div>
  );
}
