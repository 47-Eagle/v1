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
            <div className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg border border-green-500/30 font-mono text-sm">
              {account.slice(0, 6)}...{account.slice(-4)}
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

