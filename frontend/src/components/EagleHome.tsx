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

export default function EagleHome({ onNavigateUp, onNavigateDown, provider }: Props) {
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
    <div className="h-full bg-[#0a0a0a] overflow-y-auto overflow-x-hidden">
      <div className="h-full flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full flex flex-col justify-center">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-600/20 blur-2xl rounded-full"></div>
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                  alt="Eagle"
                  className="relative w-24 h-24"
                />
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-3">
              <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                EAGLE
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-2">Multi-Chain Yield Aggregator Ecosystem</p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Live on Ethereum</span>
              </div>
              <span>•</span>
              <a 
                href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-500 transition-colors"
              >
                View Contracts ↗
              </a>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
              <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 text-center">
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Total Value Locked</div>
                <div className="text-3xl font-bold text-white mb-1">${stats.tvl}</div>
                <div className="text-xs text-gray-600">Across all strategies</div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
              <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 text-center">
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Token Holders</div>
                <div className="text-3xl font-bold text-white mb-1">{stats.holders}</div>
                <div className="text-xs text-gray-600">vEAGLE holders</div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
              <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 text-center">
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Average APY</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent mb-1">
                  {stats.apy}%
                </div>
                <div className="text-xs text-gray-600">Historical returns</div>
              </div>
            </div>
          </motion.div>

          {/* Products Section */}
          <div className="mb-12">
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-white mb-2">Our Products</h2>
              <p className="text-gray-500">Choose how you want to earn with Eagle</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {/* EAGLE/ETH LP */}
              <motion.button
                onClick={onNavigateUp}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative text-left"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl opacity-50 group-hover:opacity-75 blur-xl transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-blue-500/30 group-hover:border-blue-500/50 rounded-3xl p-8 transition-all duration-300">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">EAGLE/ETH LP</h3>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-orange-400">Coming Soon</span>
                        </div>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-blue-400 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Provide liquidity to the EAGLE/ETH pair on Uniswap V3. Earn trading fees from every swap plus additional rewards.
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">Protocol</div>
                      <div className="text-sm font-semibold text-white">Uniswap V3</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">Fee Tier</div>
                      <div className="text-sm font-semibold text-white">1%</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">Est. APR</div>
                      <div className="text-sm font-semibold text-blue-400">TBD</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">Your Position</div>
                      <div className="text-sm font-semibold text-white">$0.00</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Learn more about LPs</span>
                    </div>
                    <div className="text-blue-400 font-medium text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore Pool
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Vault Engine */}
              <motion.button
                onClick={onNavigateDown}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="group relative text-left"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-3xl opacity-50 group-hover:opacity-75 blur-xl transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-yellow-500/30 group-hover:border-yellow-500/50 rounded-3xl p-8 transition-all duration-300">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">Vault Engine</h3>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-emerald-400">Active & Earning</span>
                        </div>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-yellow-400 opacity-0 group-hover:opacity-100 group-hover:translate-y-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Deposit WLFI + USD1 to receive vEAGLE shares. Automated strategies maximize your yield with auto-compounding.
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">Protocol</div>
                      <div className="text-sm font-semibold text-white">Charm Finance</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">Strategy</div>
                      <div className="text-sm font-semibold text-white">Auto LP</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">Current APY</div>
                      <div className="text-sm font-semibold text-yellow-400">22.22%</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-gray-500 mb-1">TVL</div>
                      <div className="text-sm font-semibold text-white">${stats.tvl}</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Audited & Secure</span>
                    </div>
                    <div className="text-yellow-400 font-medium text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Enter Vault
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Bottom Info */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <a 
                href="https://docs.47eagle.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-yellow-500 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documentation
              </a>
              <a 
                href="https://t.me/Eagle_community_47" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-yellow-500 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                Community
              </a>
              <a 
                href="https://x.com/teameagle47" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-yellow-500 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Twitter
              </a>
            </div>
            
            <p className="text-xs text-gray-600">
              Built on Ethereum • Powered by{' '}
              <a href="https://worldlibertyfinancial.com/" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
                World Liberty Financial
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
