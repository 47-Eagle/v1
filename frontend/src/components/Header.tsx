import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import NetworkSelector from './NetworkSelector';

interface HeaderProps {
  account: string;
  onConnect: () => void;
  provider?: BrowserProvider | null;
}

const VAULT_ABI = ['function getWLFIPrice() view returns (uint256)'];

export default function Header({ account, onConnect, provider }: HeaderProps) {
  const [wlfiPrice, setWlfiPrice] = useState<string>('0.130');
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleDisconnect = () => {
    // Clear state
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

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800">
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
          {/* Network Selector - Shows current network and allows switching */}
          {account && provider && <NetworkSelector provider={provider} />}
          
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
                  <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-xs text-gray-400 mb-1">Connected Wallet</p>
                      <p className="text-sm font-medium text-white font-mono">{account}</p>
                    </div>

                    {/* Actions */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(account);
                          setShowAccountMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Address
                      </button>
                      
                      <a
                        href={`https://etherscan.io/address/${account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                        onClick={() => setShowAccountMenu(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View on Etherscan
                      </a>
                    </div>

                    {/* Disconnect */}
                    <div className="border-t border-gray-800">
                      <button
                        onClick={() => {
                          handleDisconnect();
                          setShowAccountMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Disconnect
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

