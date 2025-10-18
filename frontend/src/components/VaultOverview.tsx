import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

const OFT_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

interface Props {
  provider: BrowserProvider | null;
  account: string;
}

export default function VaultOverview({ provider, account }: Props) {
  const [totalAssets, setTotalAssets] = useState('0');
  const [totalSupply, setTotalSupply] = useState('0');
  const [vEagleBalance, setVEagleBalance] = useState('0');
  const [eagleBalance, setEagleBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!provider) return;
    
    const fetchData = async () => {
      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const oft = new Contract(CONTRACTS.OFT, OFT_ABI, provider);
        
        const [assets, supply] = await Promise.all([
          vault.totalAssets(),
          vault.totalSupply(),
        ]);
        
        const assetsFormatted = formatEther(assets);
        const supplyFormatted = formatEther(supply);
        
        setTotalAssets(assetsFormatted);
        setTotalSupply(supplyFormatted);
        
        if (account) {
          const [vEagle, eagle] = await Promise.all([
            vault.balanceOf(account),
            oft.balanceOf(account),
          ]);
          setVEagleBalance(formatEther(vEagle));
          setEagleBalance(formatEther(eagle));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [provider, account]);

  return (
    <div className="relative bg-gradient-to-br from-eagle-gold/10 via-indigo/5 to-purple/5 rounded-xl border border-eagle-gold/30 backdrop-blur-md p-8 mb-6">
      {/* Vault Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
            alt="EAGLE"
            className="w-16 h-16 object-contain"
          />
          <div>
            <h1 className="text-3xl font-semibold bg-gradient-to-r from-eagle-gold-lightest to-eagle-gold bg-clip-text text-transparent">
              EAGLE
            </h1>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">
              {CONTRACTS.VAULT.slice(0, 8)}...{CONTRACTS.VAULT.slice(-6)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-eagle-gold/20 rounded-lg border border-eagle-gold/30">
            <img 
              src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu" 
              alt="WLFI"
              className="h-5 w-5"
            />
            <span className="text-xs font-medium text-eagle-gold-lightest">WLFI</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
            <img 
              src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreic74no55hhm544qjraibffhrb4h7zldae5sfsyipvu6dvfyqubppy" 
              alt="USD1"
              className="h-5 w-5"
            />
            <span className="text-xs font-medium text-green-200">USD1</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Simplified to 3 Key Metrics */}
      <div className="grid grid-cols-3 gap-8">
        {/* Your Position (Combined) */}
        <div>
          <p className="text-xs text-eagle-gold-light mb-1.5 uppercase tracking-wider font-medium">Your Position</p>
          {loading ? (
            <div className="h-8 w-32 bg-gray-800 animate-pulse rounded" />
          ) : (
            <>
              <p className="text-3xl font-bold text-white">
                ${((Number(vEagleBalance) + Number(eagleBalance)) / 80000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="text-sm text-gray-500 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>vEAGLE:</span>
                  <span className="text-gray-400">{Number(vEagleBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>EAGLE:</span>
                  <span className="text-gray-400">{Number(eagleBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Share Price */}
        <div>
          <p className="text-xs text-eagle-gold-light mb-1.5 uppercase tracking-wider font-medium">Share Price</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-800 animate-pulse rounded" />
          ) : (
            <>
              <p className="text-3xl font-bold bg-gradient-to-r from-eagle-gold-lightest to-eagle-gold bg-clip-text text-transparent">
                ${(1 / 80000).toFixed(8)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                1 vEAGLE = $0.0000125
              </p>
            </>
          )}
        </div>
        
        {/* Total TVL */}
        <div>
          <p className="text-xs text-eagle-gold-light mb-1.5 uppercase tracking-wider font-medium">Total TVL</p>
          {loading ? (
            <div className="h-8 w-28 bg-gray-800 animate-pulse rounded" />
          ) : (
            <>
              <p className="text-3xl font-bold text-white">
                ${Number(totalAssets).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {Number(totalSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })} total shares
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

