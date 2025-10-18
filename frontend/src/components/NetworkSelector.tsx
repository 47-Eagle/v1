import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

interface Props {
  provider: BrowserProvider | null;
}

const NETWORKS = {
  1: { name: 'Ethereum', color: 'from-blue-500 to-cyan-500', icon: '⟠' },
  146: { name: 'Sonic', color: 'from-purple-500 to-pink-500', icon: '◈' },
  42161: { name: 'Arbitrum', color: 'from-blue-400 to-blue-600', icon: '◆' },
  10: { name: 'Optimism', color: 'from-red-500 to-pink-500', icon: '◉' },
  8453: { name: 'Base', color: 'from-blue-500 to-blue-400', icon: '◎' },
  137: { name: 'Polygon', color: 'from-purple-600 to-purple-400', icon: '◊' },
};

export default function NetworkSelector({ provider }: Props) {
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!provider) return;
      
      try {
        const network = await provider.getNetwork();
        setCurrentChainId(Number(network.chainId));
      } catch (error) {
        console.error('Failed to get network:', error);
      }
    };

    checkNetwork();

    // Listen for network changes
    if ((window as any).ethereum) {
      const handleChainChanged = () => {
        checkNetwork();
      };

      (window as any).ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [provider]);

  const switchNetwork = async (chainId: number) => {
    setSwitching(true);
    setShowDropdown(false);
    
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      
      // Network not added to MetaMask
      if (error.code === 4902) {
        alert(`${NETWORKS[chainId as keyof typeof NETWORKS]?.name || 'This network'} is not configured in your wallet. Please add it manually.`);
      }
    } finally {
      setSwitching(false);
    }
  };

  if (!currentChainId) return null;

  const currentNetwork = NETWORKS[currentChainId as keyof typeof NETWORKS];
  const isCorrectNetwork = currentChainId === 1; // Ethereum mainnet

  return (
    <div className="relative">
      {/* Network Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
          isCorrectNetwork
            ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
            : 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50 animate-pulse'
        }`}
        disabled={switching}
      >
        {/* Network Icon & Name */}
        <div className="flex items-center gap-2">
          {currentNetwork ? (
            <>
              <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-400' : 'bg-orange-400'}`}></div>
              <span className="text-sm font-medium text-white">{currentNetwork.name}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-sm font-medium text-white">Chain {currentChainId}</span>
            </>
          )}
        </div>

        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Warning Badge - Shows if wrong network */}
      {!isCorrectNetwork && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
      )}

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Select Network</p>
              {!isCorrectNetwork && (
                <p className="text-xs text-orange-400 mt-1">⚠️ Eagle Vault is on Ethereum</p>
              )}
            </div>

            {/* Network List */}
            <div className="py-2">
              {Object.entries(NETWORKS).map(([chainId, network]) => {
                const id = Number(chainId);
                const isCurrent = id === currentChainId;
                const isEthereum = id === 1;
                
                return (
                  <button
                    key={chainId}
                    onClick={() => switchNetwork(id)}
                    disabled={isCurrent || switching}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrent ? 'bg-gray-800/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Network Icon */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${network.color} flex items-center justify-center text-white font-bold text-sm`}>
                        {network.icon}
                      </div>
                      
                      {/* Network Name */}
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{network.name}</p>
                        {isEthereum && (
                          <p className="text-xs text-green-400">Recommended</p>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    {isCurrent ? (
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span>Active</span>
                      </div>
                    ) : (
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Info */}
            {!isCorrectNetwork && (
              <div className="px-4 py-3 bg-orange-500/5 border-t border-orange-500/20">
                <p className="text-xs text-orange-400">
                  Switch to Ethereum to use Eagle Vault
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Switching Overlay */}
      {switching && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}

