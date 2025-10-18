import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

interface Props {
  provider: BrowserProvider | null;
  expectedChainId: number; // 1 for Ethereum mainnet
}

export default function NetworkChecker({ provider, expectedChainId }: Props) {
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!provider) return;

      try {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        setCurrentChainId(chainId);
        setIsWrongNetwork(chainId !== expectedChainId);
      } catch (error) {
        console.error('Failed to check network:', error);
      }
    };

    checkNetwork();

    // Listen for network changes
    if (provider && (window as any).ethereum) {
      const handleChainChanged = () => {
        checkNetwork();
        window.location.reload(); // Recommended by MetaMask
      };

      (window as any).ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [provider, expectedChainId]);

  const switchToEthereum = async () => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }], // 0x1 = 1 in hex (Ethereum mainnet)
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      if (error.code === 4902) {
        alert('Ethereum mainnet is not configured in your wallet. Please add it manually.');
      }
    }
  };

  if (!isWrongNetwork || !provider) {
    return null; // Don't show anything if on correct network
  }

  const networkNames: { [key: number]: string } = {
    1: 'Ethereum Mainnet',
    42161: 'Arbitrum',
    10: 'Optimism',
    8453: 'Base',
    137: 'Polygon',
  };

  const currentNetworkName = currentChainId ? (networkNames[currentChainId] || `Chain ${currentChainId}`) : 'Unknown';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-lg">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10 rounded-2xl border-2 border-red-500/50 p-8 shadow-2xl">
          {/* Warning Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Wrong Network
          </h2>
          
          {/* Message */}
          <p className="text-gray-300 text-center mb-6">
            You're connected to <span className="text-red-400 font-semibold">{currentNetworkName}</span>
            <br />
            but Eagle Vault is on <span className="text-green-400 font-semibold">Ethereum Mainnet</span>
          </p>

          {/* Details Box */}
          <div className="bg-black/40 rounded-lg p-4 mb-6 border border-gray-800">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Network:</span>
                <span className="text-red-400 font-medium">{currentNetworkName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Required Network:</span>
                <span className="text-green-400 font-medium">Ethereum Mainnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Chain ID:</span>
                <span className="text-white font-mono">{currentChainId} → 1</span>
              </div>
            </div>
          </div>

          {/* Switch Button */}
          <button
            onClick={switchToEthereum}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Switch to Ethereum Mainnet
          </button>

          {/* Help Text */}
          <p className="text-center text-xs text-gray-500 mt-4">
            Click the button above to automatically switch networks in MetaMask
          </p>
        </div>
      </div>
    </div>
  );
}

// Network name helper
export const NETWORK_NAMES: { [key: number]: string } = {
  1: 'Ethereum',
  5: 'Goerli',
  42161: 'Arbitrum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  43114: 'Avalanche',
  56: 'BNB Chain',
};

export function getNetworkName(chainId: number): string {
  return NETWORK_NAMES[chainId] || `Chain ${chainId}`;
}

