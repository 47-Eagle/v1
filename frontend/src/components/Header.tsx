import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';

interface HeaderProps {
  account: string;
  onConnect: () => void;
  provider?: BrowserProvider | null;
}

const VAULT_ABI = ['function getWLFIPrice() view returns (uint256)'];

export default function Header({ account, onConnect, provider }: HeaderProps) {
  const [wlfiPrice, setWlfiPrice] = useState<string>('0.130');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [chainId, setChainId] = useState<number>(1);

  const handleDisconnect = () => {
    // Set disconnect flag in localStorage to prevent auto-reconnect
    localStorage.setItem('wallet_disconnected', 'true');
    // Clear state and reload
    window.location.reload();
  };

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const provider = new BrowserProvider((window as any).ethereum);
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const price = await vault.getWLFIPrice();
        setWlfiPrice(Number(formatEther(price)).toFixed(3));
      } catch (error) {
        console.error('Error fetching WLFI price:', error);
      }
    };

    const checkNetwork = async () => {
      if (!provider) return;
      try {
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      } catch (error) {
        console.error('Failed to get network:', error);
      }
    };

    fetchPrice();
    checkNetwork();
    const interval = setInterval(fetchPrice, 30000); // Update every 30s
    
    // Listen for network changes
    if ((window as any).ethereum) {
      (window as any).ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => clearInterval(interval);
  }, [provider]);

  return (
    <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800 z-[9999]">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-4">
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
            alt="Eagle Finance"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold text-white">47 Eagle Finance</h1>
            <p className="text-xs text-gray-500">Omnichain Vault</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-3">
          {/* WLFI Price Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-eagle-gold/10 border border-eagle-gold/30 rounded-lg">
            <img 
              src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu" 
              alt="WLFI"
              className="h-4 w-4"
            />
            <span className="text-xs font-medium text-gray-300">WLFI</span>
            <span className="text-sm font-semibold text-eagle-gold-light">${wlfiPrice}</span>
          </div>

          <a href="#" className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50">Docs</a>
          <a href="#" className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50">Analytics</a>
        </nav>

        <div className="flex items-center gap-3">
          {/* Wrong Network Warning */}
          {account && chainId !== 1 && (
            <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
              <span className="text-xs font-medium text-orange-400">Wrong Network - Switch to Ethereum</span>
            </div>
          )}
          
          {account ? (
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg border border-green-500/30 font-mono text-sm hover:bg-green-500/20 transition-all duration-200 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                {account.slice(0, 6)}...{account.slice(-4)}
                <svg className={`w-4 h-4 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Account Dropdown */}
              {showAccountMenu && (
                <>
                  <div className="fixed inset-0 z-[99998]" onClick={() => setShowAccountMenu(false)} />
                  <div className="fixed right-4 top-16 w-80 bg-[#1a1d2e] rounded-xl border border-gray-700 shadow-2xl z-[99999] overflow-hidden">
                    {/* User Info */}
                    <div className="px-5 py-4 border-b border-gray-700 bg-[#0f1118]">
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">Connected Wallet</p>
                      <p className="text-xs font-mono text-white break-all leading-relaxed">{account}</p>
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(account);
                          setShowAccountMenu(false);
                        }}
                        className="w-full px-5 py-3 text-left text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Address</span>
                      </button>
                      
                      <a
                        href={`https://etherscan.io/address/${account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-5 py-3 text-left text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-3"
                        onClick={() => setShowAccountMenu(false)}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>View on Etherscan</span>
                      </a>
                    </div>

                    {/* Disconnect */}
                    <div className="border-t border-gray-700">
                      <button
                        onClick={() => {
                          handleDisconnect();
                          setShowAccountMenu(false);
                        }}
                        className="w-full px-5 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="px-5 py-2 bg-eagle-gold hover:bg-eagle-gold-dark text-black font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-eagle-gold/20"
            >
              Connect wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

