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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xcf728b099b672c72d61f6ec4c4928c2f2a96cefdfd518c3470519d76545ed333', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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
      } catch (error: any) {
        // Silently fail for network errors - DEXScreener API may be rate-limited or unavailable
        if (error.name !== 'AbortError') {
          console.warn('DexScreener API unavailable, keeping placeholder price');
        }
      }
    };

    fetchEaglePrice();
    const interval = setInterval(fetchEaglePrice, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-neo-bg-light/80 dark:bg-neo-bg-dark/80 border-b border-gray-300/20 dark:border-gray-700/20 backdrop-blur-xl transition-all duration-300">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5">
        <div className="flex items-center justify-between">
          {/* Logo & Title - Changes based on page */}
          {location.pathname === '/vault' || location.pathname === '/vault/' ? (
            /* Eagle Omnichain Vault Info (on vault page only) */
          <div className="flex items-center gap-2">
              <img 
                src={ICONS.EAGLE}
                alt="Eagle Omnichain Vault"
                className="w-6 h-6 sm:w-7 sm:h-7"
              />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  Eagle Omnichain Vault
                </h1>
              </div>
            </div>
          ) : location.pathname.startsWith('/lp') || location.pathname === '/lp/' ? (
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
          ) : location.pathname.startsWith('/wrapper') || location.pathname === '/wrapper/' ? (
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
          ) : location.pathname.startsWith('/bridge') || location.pathname === '/bridge/' ? (
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
          ) : location.pathname.startsWith('/analytics') || location.pathname === '/analytics/' ? (
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

          {/* Right Side - Theme Toggle + Connect Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="scale-75 sm:scale-90">
              <ThemeToggle />
            </div>
            <div className="scale-75 sm:scale-90 md:scale-95">
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
        
      </div>
    </header>
  );
}

