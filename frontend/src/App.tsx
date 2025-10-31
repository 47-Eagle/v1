import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BrowserProvider } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import ModernHeader from './components/ModernHeader';
import EagleEcosystemWithRoutes from './components/EagleEcosystemWithRoutes';
import { Showcase } from './pages/Showcase';
import { ICONS } from './config/icons';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  txHash?: string;
}

function AppContent() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const provider = new BrowserProvider(window.ethereum);
            setProvider(provider);
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
          setProvider(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const showToast = (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  return (
    <div className="h-screen flex flex-col bg-neo-bg-light dark:bg-neo-bg-dark transition-colors duration-300">
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

      {/* Fixed Footer */}
      <footer className="relative z-20 flex-shrink-0 border-t border-gray-300 dark:border-gray-700 bg-neo-bg-light/95 dark:bg-neo-bg-dark/95 backdrop-blur-xl shadow-neo-pressed dark:shadow-neo-pressed-dark transition-colors duration-300">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <img 
                src={ICONS.EAGLE} 
                alt="Eagle" 
                className="w-6 h-6"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                © 2025 Eagle Vault. All rights reserved.
              </span>
            </div>

            <div className="flex items-center gap-6">
              <a 
                href="https://docs.47eagle.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-eagle-gold dark:hover:text-eagle-gold-light transition-colors font-medium"
              >
                Docs
              </a>
              <a 
                href="https://x.com/teameagle47" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-eagle-gold dark:hover:text-eagle-gold-light transition-colors font-medium"
              >
                Twitter
              </a>
              <a 
                href="https://t.me/Eagle_community_47" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-eagle-gold dark:hover:text-eagle-gold-light transition-colors font-medium"
              >
                Telegram
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <div className="fixed bottom-24 right-6 z-50 space-y-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`
                px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border
                ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50' : ''}
                ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/50' : ''}
                ${toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/50' : ''}
              `}
            >
              <p className="text-sm font-medium text-white">{toast.message}</p>
              {toast.txHash && (
                <a
                  href={`https://etherscan.io/tx/${toast.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                >
                  View on Etherscan →
                </a>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}
