'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { VAULT_ABI, ERC20_ABI, ADDRESSES } from '@/config/contracts';

export default function DepositInterface() {
  const { address } = useAccount();
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [activeTab, setActiveTab] = useState<'dual' | 'wlfi-only'>('dual');

  // Read balances
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

  // Read allowances
  const { data: wlfiAllowance } = useReadContract({
    address: ADDRESSES.WLFI,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ADDRESSES.VAULT] : undefined,
    query: { enabled: !!address }
  });

  const { data: usd1Allowance } = useReadContract({
    address: ADDRESSES.USD1,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ADDRESSES.VAULT] : undefined,
    query: { enabled: !!address }
  });

  // Preview deposit
  const { data: depositPreview } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'previewDepositDual',
    args: [
      wlfiAmount ? parseEther(wlfiAmount) : 0n,
      usd1Amount ? parseEther(usd1Amount) : 0n
    ],
    query: { enabled: !!(wlfiAmount || usd1Amount) }
  });

  // Get current prices
  const { data: prices } = useReadContract({
    address: ADDRESSES.VAULT,
    abi: VAULT_ABI,
    functionName: 'getCurrentPrices'
  });

  // Contract writes
  const { writeContract: approveWlfi, data: approveWlfiHash } = useWriteContract();
  const { writeContract: approveUsd1, data: approveUsd1Hash } = useWriteContract();
  const { writeContract: depositDual, data: depositHash } = useWriteContract();
  const { writeContract: depositSingle, data: depositSingleHash } = useWriteContract();

  // Transaction status
  const { isLoading: isApprovingWlfi } = useWaitForTransactionReceipt({ hash: approveWlfiHash });
  const { isLoading: isApprovingUsd1 } = useWaitForTransactionReceipt({ hash: approveUsd1Hash });
  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ 
    hash: depositHash || depositSingleHash 
  });

  const wlfiPrice = prices ? formatEther(prices[0]) : '0';
  const usd1Price = prices ? formatEther(prices[1]) : '0';

  const needsWlfiApproval = wlfiAmount && wlfiAllowance !== undefined && 
    parseEther(wlfiAmount) > wlfiAllowance;
  const needsUsd1Approval = usd1Amount && usd1Allowance !== undefined && 
    parseEther(usd1Amount) > usd1Allowance;

  const handleApproveWlfi = () => {
    if (!wlfiAmount) return;
    approveWlfi({
      address: ADDRESSES.WLFI,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ADDRESSES.VAULT, parseEther(wlfiAmount)]
    });
  };

  const handleApproveUsd1 = () => {
    if (!usd1Amount) return;
    approveUsd1({
      address: ADDRESSES.USD1,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ADDRESSES.VAULT, parseEther(usd1Amount)]
    });
  };

  const handleDeposit = () => {
    if (!address) return;

    if (activeTab === 'dual') {
      if (!wlfiAmount && !usd1Amount) return;
      depositDual({
        address: ADDRESSES.VAULT,
        abi: VAULT_ABI,
        functionName: 'depositDual',
        args: [
          wlfiAmount ? parseEther(wlfiAmount) : 0n,
          usd1Amount ? parseEther(usd1Amount) : 0n,
          address
        ]
      });
    } else {
      if (!wlfiAmount) return;
      depositSingle({
        address: ADDRESSES.VAULT,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [parseEther(wlfiAmount), address]
      });
    }
  };

  const canDeposit = activeTab === 'dual' 
    ? (!needsWlfiApproval || !wlfiAmount) && (!needsUsd1Approval || !usd1Amount) && (wlfiAmount || usd1Amount)
    : !needsWlfiApproval && wlfiAmount;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          💰 Deposit Assets
        </h2>
        <p className="text-gray-600 mt-2">
          Deposit WLFI and USD1 to receive EAGLE vault shares
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('dual')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'dual'
              ? 'bg-eagle-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Dual Deposit (Recommended)
        </button>
        <button
          onClick={() => setActiveTab('wlfi-only')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'wlfi-only'
              ? 'bg-eagle-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          WLFI Only
        </button>
      </div>

      {/* Current Prices */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-eagle-50 to-primary-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-600">WLFI Price (TWAP)</p>
          <p className="text-lg font-bold text-eagle-700">${parseFloat(wlfiPrice).toFixed(4)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">USD1 Price (Chainlink)</p>
          <p className="text-lg font-bold text-primary-700">${parseFloat(usd1Price).toFixed(4)}</p>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-4 mb-6">
        {/* WLFI Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WLFI Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={wlfiAmount}
              onChange={(e) => setWlfiAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 pr-24 border-2 border-gray-200 rounded-lg focus:border-eagle-500 focus:outline-none text-lg"
            />
            <button
              onClick={() => wlfiBalance && setWlfiAmount(formatEther(wlfiBalance))}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              MAX
            </button>
          </div>
          {address && wlfiBalance && (
            <p className="mt-1 text-sm text-gray-500">
              Balance: {parseFloat(formatEther(wlfiBalance)).toLocaleString()} WLFI
            </p>
          )}
          {wlfiAmount && (
            <p className="mt-1 text-sm text-eagle-600 font-medium">
              ≈ ${(parseFloat(wlfiAmount) * parseFloat(wlfiPrice)).toFixed(2)} USD
            </p>
          )}
        </div>

        {/* USD1 Input (only for dual deposit) */}
        {activeTab === 'dual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              USD1 Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={usd1Amount}
                onChange={(e) => setUsd1Amount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 pr-24 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none text-lg"
              />
              <button
                onClick={() => usd1Balance && setUsd1Amount(formatEther(usd1Balance))}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              >
                MAX
              </button>
            </div>
            {address && usd1Balance && (
              <p className="mt-1 text-sm text-gray-500">
                Balance: {parseFloat(formatEther(usd1Balance)).toLocaleString()} USD1
              </p>
            )}
            {usd1Amount && (
              <p className="mt-1 text-sm text-primary-600 font-medium">
                ≈ ${(parseFloat(usd1Amount) * parseFloat(usd1Price)).toFixed(2)} USD
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      {depositPreview && (wlfiAmount || usd1Amount) && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Expected Output</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">EAGLE Shares:</span>
              <span className="font-bold text-green-900">
                {parseFloat(formatEther(depositPreview[0])).toLocaleString()} EAGLE
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Total USD Value:</span>
              <span className="font-bold text-green-900">
                ${parseFloat(formatEther(depositPreview[1])).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!address ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-800">Please connect your wallet to deposit</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Approval Buttons */}
          {needsWlfiApproval && (
            <button
              onClick={handleApproveWlfi}
              disabled={isApprovingWlfi}
              className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isApprovingWlfi ? 'Approving WLFI...' : 'Approve WLFI'}
            </button>
          )}
          
          {activeTab === 'dual' && needsUsd1Approval && (
            <button
              onClick={handleApproveUsd1}
              disabled={isApprovingUsd1}
              className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isApprovingUsd1 ? 'Approving USD1...' : 'Approve USD1'}
            </button>
          )}

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            disabled={!canDeposit || isDepositing}
            className="w-full py-4 px-6 bg-gradient-to-r from-eagle-600 to-eagle-700 hover:from-eagle-700 hover:to-eagle-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
          >
            {isDepositing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Depositing...
              </span>
            ) : (
              `Deposit ${activeTab === 'dual' ? 'Both Tokens' : 'WLFI'}`
            )}
          </button>
        </div>
      )}

      {/* Info Notice */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 How it works:</strong> Your deposit is valued in USD using live oracle prices.
          You receive EAGLE shares proportional to your USD value contribution.
        </p>
      </div>
    </div>
  );
}

