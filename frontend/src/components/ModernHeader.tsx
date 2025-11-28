import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { Contract, formatEther } from 'ethers';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEthersProvider } from '../hooks/useEthersProvider';
import { CONTRACTS } from '../config/contracts';
import { ICONS } from '../config/icons';
import { TokenIcon } from './TokenIcon';
import { NeoStatusIndicator } from './neumorphic';
import { ThemeToggle } from './ThemeToggle';

const VAULT_ABI = ['function getWLFIPrice() view returns (uint256)', 'function getUSD1Price() view returns (uint256)'];

export default function ModernHeader() {
  const [wlfiPrice, setWlfiPrice] = useState<string>('--');
  const [usd1Price, setUsd1Price] = useState<string>('--');
  const [eaglePrice, setEaglePrice] = useState<string>('--');
  const [priceChanged, setPriceChanged] = useState<'wlfi' | 'usd1' | 'eagle' | null>(null);
  const provider = useEthersProvider();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        if (!provider) return;
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const [wlfi, usd1] = await Promise.all([
          vault.getWLFIPrice(),
          vault.getUSD1Price()
        ]);
        
        // Format prices properly - WLFI might be a small number, USD1 should be ~1
        const wlfiNum = Number(formatEther(wlfi));
        const usd1Num = Number(formatEther(usd1));
        
        const newWlfiPrice = wlfiNum < 0.01 ? wlfiNum.toFixed(4) : wlfiNum.toFixed(3);
        const newUsd1Price = usd1Num.toFixed(3);
        
        // Trigger animation on price change
        setWlfiPrice((prev) => {
          if (prev !== '--' && prev !== newWlfiPrice) {
            setPriceChanged('wlfi');
            setTimeout(() => setPriceChanged(null), 2000);
          }
          return newWlfiPrice;
        });
        
        setUsd1Price((prev) => {
          if (prev !== '--' && prev !== newUsd1Price) {
            setPriceChanged('usd1');
            setTimeout(() => setPriceChanged(null), 2000);
          }
          return newUsd1Price;
        });
      } catch (error) {
        console.error('Error fetching prices:', error);
        // Keep showing last known prices on error
      }
    };

    if (provider) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [provider]);

  // Fetch EAGLE price from DexScreener
  useEffect(() => {
    const fetchEaglePrice = async () => {
      try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333');
        const data = await response.json();
        if (data?.pair?.priceUsd) {
          const newEaglePrice = parseFloat(data.pair.priceUsd).toFixed(6);
          setEaglePrice((prev) => {
            if (prev !== '--' && prev !== newEaglePrice) {
              setPriceChanged('eagle');
              setTimeout(() => setPriceChanged(null), 2000);
            }
            return newEaglePrice;
          });
        }
      } catch (error) {
        console.error('Error fetching EAGLE price:', error);
      }
    };

    fetchEaglePrice();
    const interval = setInterval(fetchEaglePrice, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-neo-bg-light to-gray-50 dark:from-neo-bg-dark dark:to-gray-900 border-b border-gray-300/50 dark:border-gray-700/30 shadow-neo-inset dark:shadow-neo-inset-dark backdrop-blur-xl transition-all duration-500">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title - Changes based on page */}
          {location.pathname === '/app/vault' || location.pathname === '/app/vault/' ? (
            /* Eagle Omnichain Vault Info (on vault page only) */
          <motion.div 
            className="flex items-center gap-2 sm:gap-3 md:gap-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <motion.img 
                src={ICONS.EAGLE}
                alt="Eagle Omnichain Vault"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 drop-shadow-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate">
                    Eagle Omnichain Vault
                  </h1>
                  <div className="flex items-center gap-1">
                    <TokenIcon symbol="WLFI" address={CONTRACTS.WLFI} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white dark:border-gray-700" />
                    <TokenIcon symbol="USD1" address={CONTRACTS.USD1} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white dark:border-gray-700" />
                  </div>
                </div>
                <a 
                  href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 hover:text-[#D4B474] font-mono transition-colors flex items-center gap-1"
                >
                  {CONTRACTS.VAULT}
                  <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </motion.div>
          ) : location.pathname.startsWith('/app/lp') || location.pathname === '/app/lp/' ? (
            /* Eagle/ETH Liquidity Pool (on LP page) */
            <motion.div 
              className="flex items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => navigate('/app')}
            >
              <motion.img 
                src={ICONS.EAGLE} 
                alt="Eagle/ETH Liquidity Pool"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 drop-shadow-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate">Eagle/ETH Liquidity Pool</h1>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium truncate hidden sm:block">Provide liquidity and earn fees</p>
              </div>
            </motion.div>
          ) : location.pathname.startsWith('/app/wrapper') || location.pathname === '/app/wrapper/' ? (
            /* Wrapper page */
            <motion.div 
              className="flex items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => navigate('/app')}
            >
              <motion.img 
                src={ICONS.EAGLE} 
                alt="Eagle Vault Wrapper"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 drop-shadow-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate">Eagle Vault Wrapper</h1>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium truncate hidden sm:block">Wrap and unwrap vEAGLE tokens</p>
              </div>
            </motion.div>
          ) : location.pathname.startsWith('/app/bridge') || location.pathname === '/app/bridge/' ? (
            /* Eagle Bridge */
            <motion.div 
              className="flex items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => navigate('/app')}
            >
              <motion.img 
                src={ICONS.EAGLE} 
                alt="Eagle Bridge"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 drop-shadow-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate">Eagle Bridge</h1>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium truncate hidden sm:block">Soar Across Chains While Earning on Ethereum</p>
              </div>
            </motion.div>
          ) : location.pathname.startsWith('/app/analytics') || location.pathname === '/app/analytics/' ? (
            /* Analytics page */
            <motion.div 
              className="flex items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => navigate('/app')}
            >
              <motion.img 
                src={ICONS.EAGLE} 
                alt="Analytics"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 drop-shadow-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate">Analytics</h1>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium truncate hidden sm:block">Vault performance metrics</p>
              </div>
            </motion.div>
          ) : (
            /* 47 Eagle Logo (on other pages) */
            <motion.div 
              className="flex items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => navigate('/app')}
          >
            <motion.img 
              src={ICONS.EAGLE} 
              alt="47 Eagle"
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 drop-shadow-lg"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate">47 Eagle</h1>
              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium truncate hidden sm:block">Omnichain WLFI Yield Strategies</p>
            </div>
          </motion.div>
          )}

          {/* Center - EAGLE Price Ticker */}
          <div className="hidden lg:flex items-center gap-3">
            {!location.pathname.startsWith('/app') && (
            <motion.a
              href="https://dexscreener.com/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#FFE7A3]/20 to-[#F2D57C]/10 dark:from-[#A69348]/20 dark:to-[#C9A854]/10 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark border border-[#F2D57C]/30 dark:border-[#F2D57C]/40 hover:border-[#F2D57C]/50 dark:hover:border-[#F2D57C]/60 transition-all duration-400 cursor-pointer"
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              animate={priceChanged === 'eagle' ? { scale: [1, 1.08, 1] } : {}}
              title="View on DexScreener"
            >
              <img 
                src={ICONS.EAGLE}
                alt="EAGLE"
                className="w-5 h-5"
              />
              <AnimatePresence mode="wait">
                <motion.span 
                  key={eaglePrice}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-mono text-gray-800 dark:text-gray-200 font-semibold min-w-[60px]"
                >
                  {eaglePrice === '--' ? '--' : `$${eaglePrice}`}
                </motion.span>
              </AnimatePresence>
            </motion.a>
            )}
          </div>

          {/* Right Side - Theme Toggle + Connect Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="scale-90 sm:scale-95 md:scale-100">
              <ConnectButton 
                chainStatus="icon"
                showBalance={false}
                accountStatus={{
                  smallScreen: 'avatar',
                  largeScreen: 'full',
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Mobile EAGLE Price Ticker - Below header on small screens */}
        <div className="lg:hidden flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          <motion.a
            href="https://dexscreener.com/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-[#FFE7A3]/20 to-[#F2D57C]/10 dark:from-[#A69348]/20 dark:to-[#C9A854]/10 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark border border-[#F2D57C]/30 dark:border-[#F2D57C]/40 whitespace-nowrap flex-shrink-0 cursor-pointer"
            animate={priceChanged === 'eagle' ? { scale: [1, 1.05, 1] } : {}}
            title="View on DexScreener"
          >
            <img 
              src={ICONS.EAGLE} 
              alt="EAGLE" 
              className="w-4 h-4" 
            />
            <AnimatePresence mode="wait">
              <motion.span 
                key={eaglePrice}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs font-mono text-gray-800 dark:text-gray-200 font-semibold"
              >
                {eaglePrice === '--' ? '--' : `$${eaglePrice}`}
              </motion.span>
            </AnimatePresence>
          </motion.a>
        </div>
      </div>
    </header>
  );
}

