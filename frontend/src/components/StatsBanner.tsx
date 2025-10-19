import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';

const CHARM_VAULT_ABI = [
  'function getTotalAmounts() view returns (uint256, uint256)',
];

export default function StatsBanner() {
  const [stats, setStats] = useState({
    charmTVL: '0',
    wlfiLiquidity: '0',
    usd1Liquidity: '0',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const provider = new BrowserProvider((window as any).ethereum);
        const charmVault = new Contract(CONTRACTS.CHARM_VAULT, CHARM_VAULT_ABI, provider);
        const [usd1, wlfi] = await charmVault.getTotalAmounts();  // Charm vault is USD1/WLFI
        
        const wlfiFormatted = formatEther(wlfi);
        const usd1Formatted = formatEther(usd1);
        const tvl = (Number(wlfiFormatted) * 0.130 + Number(usd1Formatted) * 1.00).toFixed(2);  // USD1 = $1
        
        setStats({
          charmTVL: tvl,
          wlfiLiquidity: Number(wlfiFormatted).toFixed(2),
          usd1Liquidity: Number(usd1Formatted).toFixed(4),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 45000);
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { label: 'Charm Finance TVL', value: `$${Number(stats.charmTVL).toLocaleString()}`, icon: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu' },
    { label: 'WLFI Liquidity', value: `${Number(stats.wlfiLiquidity).toLocaleString()} WLFI`, icon: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu' },
    { label: 'USD1 Liquidity', value: `${stats.usd1Liquidity} USD1`, icon: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreic74no55hhm544qjraibffhrb4h7zldae5sfsyipvu6dvfyqubppy' },
    { label: 'Fee Tier', value: '1%', icon: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreichw4b4wxvinfu4dmkloxajj4mm7672k6q3nyqzvdnvogvlbbycfq' },
  ];

  return (
    <div className="bg-gray-900/50 border-b border-gray-800 overflow-hidden">
      <div className="relative h-10">
        <div className="absolute animate-scroll flex items-center gap-12 whitespace-nowrap py-2">
          {/* Duplicate items for seamless loop */}
          {[...statItems, ...statItems, ...statItems].map((stat, index) => (
            <div key={index} className="flex items-center gap-2 px-4">
              <img src={stat.icon} alt="" className="h-4 w-4" />
              <span className="text-xs text-gray-500">{stat.label}:</span>
              <span className="text-sm font-semibold text-eagle-gold-light">{stat.value}</span>
              <span className="text-gray-700">|</span>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

