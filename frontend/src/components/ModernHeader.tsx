import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { Contract, formatEther } from 'ethers';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { useEthersProvider } from '../hooks/useEthersProvider';
import { CONTRACTS } from '../config/contracts';
import { ICONS } from '../config/icons';
import { NeoStatusIndicator } from './neumorphic';
import { ThemeToggle } from './ThemeToggle';

const VAULT_ABI = ['function getWLFIPrice() view returns (uint256)', 'function getUSD1Price() view returns (uint256)'];

export default function ModernHeader() {
  const [wlfiPrice, setWlfiPrice] = useState<string>('--');
  const [usd1Price, setUsd1Price] = useState<string>('--');
  const [priceChanged, setPriceChanged] = useState<'wlfi' | 'usd1' | null>(null);
  const provider = useEthersProvider();

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

  return (
    <header className="sticky top-0 z-50 bg-neo-bg-light/95 dark:bg-neo-bg-dark/95 backdrop-blur-xl border-b border-gray-300 dark:border-gray-700 shadow-neo-pressed dark:shadow-neo-pressed-dark transition-colors duration-300">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <img 
              src={ICONS.EAGLE} 
              alt="47 Eagle"
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">47 Eagle</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">Omnichain WLFI Yield Strategies</p>
            </div>
          </div>

          {/* Center - Price Tickers with Neumorphic Style */}
          <div className="hidden lg:flex items-center gap-2">
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 bg-neo-bg-light dark:bg-neo-bg-dark rounded-full shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark transition-all duration-300"
              whileHover={{ scale: 1.05, y: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              animate={priceChanged === 'wlfi' ? { scale: [1, 1.1, 1] } : {}}
            >
              <img 
                src={ICONS.WLFI} 
                alt="WLFI"
                className="w-5 h-5"
              />
              <AnimatePresence mode="wait">
                <motion.span 
                  key={wlfiPrice}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-mono text-gray-800 dark:text-gray-200 font-semibold min-w-[60px]"
                >
                  {wlfiPrice === '--' ? '--' : `$${wlfiPrice}`}
                </motion.span>
              </AnimatePresence>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 bg-neo-bg-light dark:bg-neo-bg-dark rounded-full shadow-neo-raised dark:shadow-neo-raised-dark hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark transition-all duration-300"
              whileHover={{ scale: 1.05, y: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              animate={priceChanged === 'usd1' ? { scale: [1, 1.1, 1] } : {}}
            >
              <img 
                src={ICONS.USD1} 
                alt="USD1"
                className="w-5 h-5"
              />
              <AnimatePresence mode="wait">
                <motion.span 
                  key={usd1Price}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-mono text-gray-800 dark:text-gray-200 font-semibold min-w-[60px]"
                >
                  {usd1Price === '--' ? '--' : `$${usd1Price}`}
                </motion.span>
              </AnimatePresence>
            </motion.div>
            <motion.div
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark border border-emerald-200 dark:border-emerald-700 transition-all duration-300"
              whileHover={{ scale: 1.05, y: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <img 
                src={ICONS.ETHEREUM}
                alt="Ethereum"
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm text-gray-800 dark:text-gray-200 font-semibold">Ethereum</span>
            </motion.div>
          </div>

          {/* Right Side - Theme Toggle + Connect Button */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
    </header>
  );
}

