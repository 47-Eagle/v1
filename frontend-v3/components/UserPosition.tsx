'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { VAULT_ABI, ERC20_ABI, ADDRESSES } from '@/config/contracts';

export default function UserPosition() {
  const { address, isConnected } = useAccount();

  // Read user data
  const { data: userShares } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

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

  const { data: wlfiBalance } = useReadContract({
    address: ADDRESSES.WLFI,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: usd1Balance } = useReadContract({
    address: ADDRESSES.USD1,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  if (!isConnected) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">🔌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600">
          Connect your wallet to view your position and interact with the vault
        </p>
      </div>
    );
  }

  // Calculate user metrics
  const shares = userShares || 0n;
  const userValue = totalAssets && totalSupply && totalSupply > 0n
    ? (totalAssets * shares) / totalSupply
    : 0n;

  const ownershipPercent = totalSupply && totalSupply > 0n
    ? Number((shares * 10000n) / totalSupply) / 100
    : 0;

  const userWlfiEntitled = vaultBalances && totalSupply && totalSupply > 0n
    ? (vaultBalances[0] * shares) / totalSupply
    : 0n;

  const userUsd1Entitled = vaultBalances && totalSupply && totalSupply > 0n
    ? (vaultBalances[1] * shares) / totalSupply
    : 0n;

  const hasPosition = shares > 0n;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span>👤</span> Your Position
      </h2>

      {hasPosition ? (
        <div className="space-y-6">
          {/* Main Position Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Your EAGLE Shares</p>
              <p className="text-3xl font-bold">
                {parseFloat(formatEther(shares)).toLocaleString()}
              </p>
              <p className="text-xs opacity-75 mt-2">
                {ownershipPercent.toFixed(4)}% of vault
              </p>
            </div>

            <div className="p-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">Current Value</p>
              <p className="text-3xl font-bold">
                ${parseFloat(formatEther(userValue)).toLocaleString()}
              </p>
              <p className="text-xs opacity-75 mt-2">
                Based on oracle prices
              </p>
            </div>
          </div>

          {/* Entitled Tokens */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Your Proportional Holdings</h3>
            <div className="space-y-3">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">WLFI Entitled</p>
                    <p className="text-xs text-gray-500">From direct vault holdings</p>
                  </div>
                  <p className="text-lg font-bold text-purple-700">
                    {parseFloat(formatEther(userWlfiEntitled)).toLocaleString()} WLFI
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">USD1 Entitled</p>
                    <p className="text-xs text-gray-500">From direct vault holdings</p>
                  </div>
                  <p className="text-lg font-bold text-blue-700">
                    {parseFloat(formatEther(userUsd1Entitled)).toLocaleString()} USD1
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Balances */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Wallet Balances (Not in Vault)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">WLFI</p>
                <p className="text-lg font-bold text-gray-900">
                  {wlfiBalance ? parseFloat(formatEther(wlfiBalance)).toLocaleString() : '0'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">USD1</p>
                <p className="text-lg font-bold text-gray-900">
                  {usd1Balance ? parseFloat(formatEther(usd1Balance)).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Performance Info */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Position Tracking</h4>
                <p className="text-sm text-gray-600">
                  Your share value updates in real-time based on vault performance and oracle prices.
                  Withdraw anytime to receive your proportional share of vault assets.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Position Yet</h3>
          <p className="text-gray-600 mb-6">
            You don't have any EAGLE shares. Make a deposit to start earning!
          </p>
          
          {/* Show wallet balances if they have tokens */}
          {(wlfiBalance && wlfiBalance > 0n) || (usd1Balance && usd1Balance > 0n) ? (
            <div className="max-w-md mx-auto">
              <h4 className="font-semibold text-gray-900 mb-3">Your Wallet Balances</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-600 mb-1">WLFI Available</p>
                  <p className="text-xl font-bold text-purple-700">
                    {wlfiBalance ? parseFloat(formatEther(wlfiBalance)).toLocaleString() : '0'}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">USD1 Available</p>
                  <p className="text-xl font-bold text-blue-700">
                    {usd1Balance ? parseFloat(formatEther(usd1Balance)).toLocaleString() : '0'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                💡 You have tokens available to deposit!
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-amber-800">
                You need WLFI and/or USD1 tokens to make a deposit
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

