import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { BrowserProvider } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import ModernHeader from './components/ModernHeader';
import EagleEcosystemWithRoutes from './components/EagleEcosystemWithRoutes';
import { ICONS } from './config/icons';
import { SafeProvider } from './components/SafeProvider';
import { useSafeApp } from './hooks/useSafeApp';
import { useEthersProvider } from './hooks/useEthersProvider';
import { applySEO, getDefaultOrgJsonLd } from './utils/seo';
import { CONTRACTS } from './config/contracts';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  txHash?: string;
}

function AppContent() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const location = useLocation();
  
  // Use wagmi's connection state
  const { address: wagmiAddress, isConnected } = useAccount();
  const wagmiProvider = useEthersProvider();
  
  // Safe App detection
  const { isSafeApp, safeAddress } = useSafeApp();
  
  // Determine which account and provider to use
  const account = isSafeApp && safeAddress ? safeAddress : (wagmiAddress || '');
  const provider = wagmiProvider;

  const showToast = (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Log connection status for debugging
  useEffect(() => {
    console.log('🔌 Connection Status:', {
      isConnected,
      wagmiAddress,
      isSafeApp,
      safeAddress,
      finalAccount: account,
      hasProvider: !!provider
    });
    
    if (isSafeApp && safeAddress) {
      console.log('🔐 Running as Safe App:', safeAddress);
      showToast({
        message: '🔐 Connected via Safe App',
        type: 'success'
      });
    } else if (isConnected && wagmiAddress) {
      console.log('✅ Connected via wallet:', wagmiAddress);
    }
  }, [isConnected, wagmiAddress, isSafeApp, safeAddress, account, provider]);

  // SEO: dynamic metadata per route
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const shareImage = 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy';
    const path = location.pathname || '/';
    const url = `${baseUrl}${path}`;

    const orgJsonLd = getDefaultOrgJsonLd(baseUrl);

    if (path.startsWith('/lp')) {
      applySEO({
        title: 'Eagle / ETH Liquidity Pool | Provide Liquidity & Earn Fees',
        description: 'Provide liquidity to the Eagle/ETH pool and earn trading fees with dynamic strategy support.',
        url,
        canonical: url,
        image: shareImage,
        keywords: ['Eagle', 'LP', 'liquidity', 'ETH', 'DeFi'],
        jsonLd: orgJsonLd,
      });
      return;
    }

    if (path.startsWith('/bridge')) {
      applySEO({
        title: 'Eagle Bridge | Omnichain Transfers with Yield on Ethereum',
        description: 'Bridge assets across chains while keeping yield on Ethereum with Eagle’s omnichain vault.',
        url,
        canonical: url,
        image: shareImage,
        keywords: ['Eagle', 'Bridge', 'Omnichain', 'LayerZero', 'DeFi'],
        jsonLd: orgJsonLd,
      });
      return;
    }

    // Default vault/app metadata (includes strategies + activity)
    applySEO({
      title: 'Eagle Omnichain Vault | WLFI Strategies (USD1 & WETH)',
      description: `Live vault with strategies at ${CONTRACTS.STRATEGY_USD1} (USD1/WLFI) and ${CONTRACTS.STRATEGY_WETH} (WETH/WLFI). View allocations, activity, and analytics.`,
      url,
      canonical: url,
      image: shareImage,
      keywords: ['Eagle', 'Vault', 'WLFI', 'WETH', 'USD1', 'Charm', 'LayerZero', 'DeFi'],
      jsonLd: orgJsonLd,
    });
  }, [location.pathname]);

  return (
    <motion.div 
      className="h-screen flex flex-col transition-colors duration-300 bg-[#0a0a0a]" // Match LandingPage bg
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Fixed Header */}
      <div className="relative z-20 flex-shrink-0">
        <ModernHeader />
      </div>

      {/* Main Content - 3-Floor Navigation */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <EagleEcosystemWithRoutes 
          provider={provider}
          account={account}
          onToast={showToast}
        />
      </div>

      {/* Fixed Footer - Ultra Compact on Mobile */}
      <footer className="relative z-20 flex-shrink-0 border-t border-gray-300/30 dark:border-gray-700/30 bg-neo-bg-light/80 dark:bg-neo-bg-dark/80 backdrop-blur-sm transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-6 py-1.5 sm:py-4">
          <div className="flex flex-row justify-between items-center gap-2 sm:gap-3 text-center">
            <div className="flex items-center gap-1.5 sm:gap-3">
              <img 
                src={ICONS.EAGLE} 
                alt="Eagle" 
                className="w-3 h-3 sm:w-6 sm:h-6"
              />
              <span className="text-[8px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                © 2025 Eagle
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">
              <a 
                href="https://docs.47eagle.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] sm:text-xs text-gray-600 dark:text-gray-400 hover:text-[#F2D57C] dark:hover:text-[#FFE7A3] transition-colors font-medium"
              >
                Docs
              </a>
              <a 
                href="https://x.com/teameagle47" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] sm:text-xs text-gray-600 dark:text-gray-400 hover:text-[#F2D57C] dark:hover:text-[#FFE7A3] transition-colors font-medium"
              >
                X
              </a>
              <a 
                href="https://t.me/EagleDeFi" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] sm:text-xs text-gray-600 dark:text-gray-400 hover:text-[#F2D57C] dark:hover:text-[#FFE7A3] transition-colors font-medium"
              >
                TG
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <div className="fixed bottom-16 sm:bottom-24 right-3 sm:right-6 z-50 space-y-2 sm:space-y-3 max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`
                px-3 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl backdrop-blur-xl border
                ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50' : ''}
                ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/50' : ''}
                ${toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/50' : ''}
              `}
            >
              <p className="text-xs sm:text-sm font-medium text-white break-words">{toast.message}</p>
              {toast.txHash && (
                <a
                  href={`https://etherscan.io/tx/${toast.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] sm:text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block break-all"
                >
                  View on Etherscan →
                </a>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <SafeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AnimatedRoutes />
      </BrowserRouter>
    </SafeProvider>
  );
}
