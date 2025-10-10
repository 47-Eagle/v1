'use client';

import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { VAULT_ABI, ADDRESSES } from '@/config/contracts';

export default function VaultAnalytics() {
  // Read vault data
  const { data: totalAssets } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'totalAssets'
  });

  const { data: totalSupply } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'totalSupply'
  });

  const { data: vaultBalances } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'getVaultBalances'
  });

  const { data: prices } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'getCurrentPrices'
  });

  const { data: isPaused } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'paused'
  });

  const { data: totalStrategyWeight } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'totalStrategyWeight'
  });

  // Calculate metrics
  const tvl = totalAssets ? formatEther(totalAssets) : '0';
  const supply = totalSupply ? formatEther(totalSupply) : '0';
  const sharePrice = totalSupply && totalAssets && totalSupply > 0n
    ? formatEther((totalAssets * 10000n) / totalSupply)
    : '1.0000';

  const wlfiPrice = prices ? formatEther(prices[0]) : '0';
  const usd1Price = prices ? formatEther(prices[1]) : '0';

  const vaultWlfi = vaultBalances ? formatEther(vaultBalances[0]) : '0';
  const vaultUsd1 = vaultBalances ? formatEther(vaultBalances[1]) : '0';

  const directValue = vaultBalances && prices
    ? (vaultBalances[0] * prices[0] + vaultBalances[1] * prices[1]) / (10n ** 18n)
    : 0n;

  const strategyValue = totalAssets && directValue
    ? totalAssets - directValue
    : 0n;

  const liquidityPercent = totalAssets && totalAssets > 0n
    ? Number((directValue * 10000n) / totalAssets) / 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Value Locked */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Value Locked</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            ${parseFloat(tvl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm opacity-80">
            Oracle-Priced Assets
          </p>
        </div>

        {/* EAGLE Share Price */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">EAGLE Price</h3>
            <span className="text-2xl">🦅</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            ${parseFloat(sharePrice).toFixed(4)}
          </p>
          <p className="text-sm opacity-80">
            {parseFloat(supply).toLocaleString()} Total Supply
          </p>
        </div>

        {/* Status */}
        <div className={`bg-gradient-to-br ${isPaused ? 'from-orange-500 to-red-600' : 'from-blue-500 to-blue-700'} rounded-2xl shadow-xl p-6 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Vault Status</h3>
            <span className="text-2xl">{isPaused ? '⚠️' : '✅'}</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {isPaused ? 'Paused' : 'Active'}
          </p>
          <p className="text-sm opacity-80">
            {isPaused ? 'Deposits Disabled' : 'Fully Operational'}
          </p>
        </div>
      </div>

      {/* Oracle Prices */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📊</span> Oracle Prices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WLFI Price */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600 font-medium">WLFI Token</p>
                <p className="text-xs text-gray-500">Uniswap V3 TWAP</p>
              </div>
              <div className="h-10 w-10 bg-purple-200 rounded-full flex items-center justify-center text-xl">
                🔮
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              ${parseFloat(wlfiPrice).toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">30-minute time-weighted average</p>
          </div>

          {/* USD1 Price */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600 font-medium">USD1 Token</p>
                <p className="text-xs text-gray-500">Chainlink Oracle</p>
              </div>
              <div className="h-10 w-10 bg-blue-200 rounded-full flex items-center justify-center text-xl">
                ⛓️
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              ${parseFloat(usd1Price).toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Real-time stablecoin price</p>
          </div>
        </div>
      </div>

      {/* Asset Composition */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🎯</span> Asset Composition
        </h2>
        
        <div className="space-y-4">
          {/* Direct Holdings */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Direct Holdings</span>
              <span className="text-sm font-bold text-green-600">
                ${parseFloat(formatEther(directValue)).toLocaleString()}
              </span>
            </div>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">WLFI:</span>
                <span className="font-mono font-medium">
                  {parseFloat(vaultWlfi).toLocaleString()} 
                  <span className="text-gray-400 ml-2">
                    (${(parseFloat(vaultWlfi) * parseFloat(wlfiPrice)).toFixed(2)})
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">USD1:</span>
                <span className="font-mono font-medium">
                  {parseFloat(vaultUsd1).toLocaleString()}
                  <span className="text-gray-400 ml-2">
                    (${(parseFloat(vaultUsd1) * parseFloat(usd1Price)).toFixed(2)})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Deployed to Strategies */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Deployed to Strategies</span>
              <span className="text-sm font-bold text-purple-600">
                ${parseFloat(formatEther(strategyValue)).toLocaleString()}
              </span>
            </div>
            {totalStrategyWeight && totalStrategyWeight > 0n ? (
              <p className="text-xs text-gray-500 pl-4">
                {strategyValue > 0n ? 'Assets actively earning yield' : 'No assets deployed yet'}
              </p>
            ) : (
              <p className="text-xs text-gray-500 pl-4">
                No strategies configured
              </p>
            )}
          </div>

          {/* Liquidity Bar */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Instant Withdrawal Liquidity</span>
              <span className="text-sm font-bold text-blue-600">
                {liquidityPercent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  liquidityPercent > 50 ? 'bg-green-500' :
                  liquidityPercent > 25 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${liquidityPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {liquidityPercent > 50 
                ? '✅ High liquidity - instant withdrawals available'
                : liquidityPercent > 25
                ? '⚡ Moderate liquidity - most withdrawals instant'
                : '⚠️ Lower liquidity - large withdrawals may need strategy exit'}
            </p>
          </div>
        </div>
      </div>

      {/* Strategy Management */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📈</span> Strategy Management
        </h2>
        
        {totalStrategyWeight && totalStrategyWeight > 0n ? (
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">Total Strategy Weight</span>
                <span className="text-lg font-bold text-blue-700">
                  {(Number(totalStrategyWeight) / 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Vault supports up to 5 simultaneous strategies with customizable allocations.
            </p>
          </div>
        ) : (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-gray-600 mb-2">No strategies configured yet</p>
            <p className="text-sm text-gray-500">
              Vault can support up to 5 yield-generating strategies
            </p>
          </div>
        )}
      </div>

      {/* Key Features */}
      <div className="bg-gradient-to-br from-eagle-50 to-primary-50 rounded-2xl shadow-xl p-6 border border-eagle-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>⚡</span> Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔮</span>
            <div>
              <h3 className="font-semibold text-gray-900">Oracle Pricing</h3>
              <p className="text-sm text-gray-600">
                Chainlink + Uniswap V3 TWAP for accurate USD valuation
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <h3 className="font-semibold text-gray-900">Dual-Token Support</h3>
              <p className="text-sm text-gray-600">
                Deposit WLFI and USD1 in any ratio
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="font-semibold text-gray-900">Strategy Diversification</h3>
              <p className="text-sm text-gray-600">
                Up to 5 strategies with custom weights
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h3 className="font-semibold text-gray-900">ERC4626 Standard</h3>
              <p className="text-sm text-gray-600">
                Compatible with DeFi ecosystem
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

