'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { VAULT_ABI, ADDRESSES } from '@/config/contracts';

export default function WithdrawalInterface() {
  const { address } = useAccount();
  const [shareAmount, setShareAmount] = useState('');
  const [withdrawPercentage, setWithdrawPercentage] = useState(0);

  // Read user's share balance
  const { data: userShares } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  // Read total assets and supply for calculations
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

  // Get vault balances
  const { data: vaultBalances } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'getVaultBalances'
  });

  // Withdraw contract call
  const { writeContract: withdraw, data: withdrawHash } = useWriteContract();
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Calculate estimated withdrawal amounts
  const calculateWithdrawal = () => {
    if (!shareAmount || !totalAssets || !totalSupply || !userShares) {
      return { wlfi: '0', usd1: '0', usdValue: '0' };
    }

    const shares = parseEther(shareAmount);
    if (shares > userShares) {
      return { wlfi: '0', usd1: '0', usdValue: '0' };
    }

    const userValue = (totalAssets * shares) / totalSupply;
    
    // Estimate token amounts (proportional to vault balances)
    if (vaultBalances) {
      const wlfiAmount = (vaultBalances[0] * shares) / totalSupply;
      const usd1Amount = (vaultBalances[1] * shares) / totalSupply;
      
      return {
        wlfi: formatEther(wlfiAmount),
        usd1: formatEther(usd1Amount),
        usdValue: formatEther(userValue)
      };
    }

    return { wlfi: '0', usd1: '0', usdValue: formatEther(userValue) };
  };

  const estimated = calculateWithdrawal();

  const handleWithdraw = () => {
    if (!address || !shareAmount) return;
    
    withdraw({
      address: ADDRESSES.VAULT,
      abi: VAULT_ABI,
      functionName: 'withdrawDual',
      args: [parseEther(shareAmount), address]
    });
  };

  const setPercentage = (percent: number) => {
    setWithdrawPercentage(percent);
    if (userShares) {
      const amount = (userShares * BigInt(percent)) / 100n;
      setShareAmount(formatEther(amount));
    }
  };

  const shareValue = userShares && totalAssets && totalSupply
    ? formatEther((totalAssets * userShares) / totalSupply)
    : '0';

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          💸 Withdraw Assets
        </h2>
        <p className="text-gray-600 mt-2">
          Burn EAGLE shares to withdraw WLFI and USD1
        </p>
      </div>

      {/* User Position Summary */}
      {address && userShares && (
        <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
          <h3 className="font-semibold text-gray-900 mb-3">Your Position</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">EAGLE Shares</p>
              <p className="text-xl font-bold text-purple-700">
                {parseFloat(formatEther(userShares)).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Value</p>
              <p className="text-xl font-bold text-blue-700">
                ${parseFloat(shareValue).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Percentage Buttons */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Select
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => setPercentage(percent)}
              className={`py-2 px-4 rounded-lg font-medium transition-all ${
                withdrawPercentage === percent
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {percent}%
            </button>
          ))}
        </div>
      </div>

      {/* Share Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          EAGLE Shares to Withdraw
        </label>
        <div className="relative">
          <input
            type="number"
            value={shareAmount}
            onChange={(e) => {
              setShareAmount(e.target.value);
              setWithdrawPercentage(0);
            }}
            placeholder="0.0"
            className="w-full px-4 py-3 pr-24 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-lg"
          />
          <button
            onClick={() => userShares && setPercentage(100)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
          >
            MAX
          </button>
        </div>
        {address && userShares && (
          <p className="mt-1 text-sm text-gray-500">
            Available: {parseFloat(formatEther(userShares)).toLocaleString()} EAGLE
          </p>
        )}
      </div>

      {/* Withdrawal Preview */}
      {shareAmount && parseFloat(shareAmount) > 0 && (
        <div className="mb-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <span>📊</span> Estimated Withdrawal
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-700 font-medium">WLFI Tokens</span>
              <span className="font-bold text-green-700">
                {parseFloat(estimated.wlfi).toLocaleString()} WLFI
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-700 font-medium">USD1 Tokens</span>
              <span className="font-bold text-blue-700">
                {parseFloat(estimated.usd1).toLocaleString()} USD1
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-300">
              <span className="text-gray-900 font-semibold">Total USD Value</span>
              <span className="font-bold text-xl text-green-800">
                ${parseFloat(estimated.usdValue).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Button */}
      {!address ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-800">Please connect your wallet to withdraw</p>
        </div>
      ) : (
        <button
          onClick={handleWithdraw}
          disabled={!shareAmount || parseFloat(shareAmount) <= 0 || isWithdrawing || 
                   (userShares && parseEther(shareAmount) > userShares)}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
        >
          {isWithdrawing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Withdrawing...
            </span>
          ) : (
            'Withdraw Tokens'
          )}
        </button>
      )}

      {/* Info Notices */}
      <div className="mt-6 space-y-3">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>⚡ Instant Withdrawal:</strong> If vault has sufficient liquidity, withdrawal is instant.
            Otherwise, funds are pulled from strategies.
          </p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>⚠️ Note:</strong> Actual amounts may vary slightly based on current oracle prices
            and vault composition at withdrawal time.
          </p>
        </div>
      </div>
    </div>
  );
}

