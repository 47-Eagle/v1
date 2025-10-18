import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';

interface PortfolioViewProps {
  provider: BrowserProvider | null;
  account: string;
}

const VAULT_ABI = ['function balanceOf(address) view returns (uint256)'];
const OFT_ABI = ['function balanceOf(address) view returns (uint256)'];

export default function PortfolioView({ provider, account }: PortfolioViewProps) {
  const [vEagleBalance, setVEagleBalance] = useState('0');
  const [eagleBalance, setEagleBalance] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider || !account) return;

    const fetchData = async () => {
      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const oft = new Contract(CONTRACTS.OFT, OFT_ABI, provider);

        const [vEagle, eagle] = await Promise.all([
          vault.balanceOf(account),
          oft.balanceOf(account),
        ]);

        setVEagleBalance(formatEther(vEagle));
        setEagleBalance(formatEther(eagle));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [provider, account]);

  const totalShares = Number(vEagleBalance) + Number(eagleBalance);
  const totalValue = totalShares / 80000; // 80,000 shares per $1
  const costBasis = totalValue; // For now, assume no PnL (would track from deposits)
  const pnl = 0;
  const pnlPercent = 0;

  if (!account) {
    return (
      <div className="text-center text-gray-400 py-12">
        Connect your wallet to view your portfolio
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Card */}
      <div className="bg-gradient-to-br from-eagle-gold/10 via-blue-500/5 to-purple-500/5 rounded-xl border border-eagle-gold/30 p-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Your Eagle Portfolio</h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-800 rounded w-48"></div>
            <div className="h-6 bg-gray-800 rounded w-32"></div>
          </div>
        ) : (
          <>
            {/* Total Value */}
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">Total Value</p>
              <p className="text-5xl font-bold text-white mb-2">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">
                  Cost Basis: ${costBasis.toFixed(2)}
                </span>
                <span className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% PnL
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* vEAGLE in Vault */}
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">vEAGLE in Vault</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                    Earning
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {Number(vEagleBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ${(Number(vEagleBalance) / 80000).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Earning from Charm Finance WLFI/WETH pool
                </p>
              </div>

              {/* EAGLE (Tradeable) */}
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">EAGLE (Tradeable)</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                    Liquid
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {Number(eagleBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ${(Number(eagleBalance) / 80000).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Can trade on DEXes or bridge via LayerZero
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all">
                Wrap to EAGLE
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-all">
                Export CSV
              </button>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        
        <div className="space-y-3">
          {totalShares > 0 ? (
            <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Deposited</p>
                <p className="text-xs text-gray-400">{Number(wlfiAmount || 0).toFixed(2)} WLFI</p>
              </div>
              <span className="text-xs text-gray-500">Recently</span>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No activity yet</p>
              <p className="text-sm mt-2">Make your first deposit to start earning!</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Est. APY</p>
            <p className="text-2xl font-bold text-green-400">12.0%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Time Held</p>
            <p className="text-2xl font-bold text-white">0d</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Fees Earned</p>
            <p className="text-2xl font-bold text-eagle-gold-light">$0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

