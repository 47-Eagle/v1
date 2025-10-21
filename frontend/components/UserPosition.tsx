'use client';

import type { FC } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { VAULT_ABI, ADDRESSES } from '@/config/contracts';

const UserPosition: FC = () => {
  const { address, isConnected } = useAccount();

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

  if (!isConnected || !userShares || userShares === 0n) {
    return null; // Don't show if no position
  }

  const shares = userShares || 0n;
  const userValue = totalAssets && totalSupply && totalSupply > 0n
    ? (totalAssets * shares) / totalSupply
    : 0n;

  return (
    <div className="glass-card p-6 mt-8">
      <h3 className="text-lg font-semibold text-white mb-6">Your Position</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Your vEAGLE</p>
          <p className="text-2xl font-bold golden-text mb-1">
            {parseFloat(formatEther(shares)).toLocaleString()}
          </p>
          <p className="text-sm text-dark-400">EAGLE Shares</p>
        </div>
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Current Value</p>
          <p className="text-2xl font-bold golden-text mb-1">
            ${parseFloat(formatEther(userValue)).toLocaleString()}
          </p>
          <p className="text-sm text-dark-400">USD Value</p>
        </div>
      </div>
    </div>
  );
};

export default UserPosition;
