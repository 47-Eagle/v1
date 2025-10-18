import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

interface TransactionSimulatorProps {
  wlfiAmount: string;
  usd1Amount: string;
  shares: string;
  usdValue: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TransactionSimulator({ 
  wlfiAmount, 
  usd1Amount, 
  shares, 
  usdValue,
  onConfirm,
  onCancel 
}: TransactionSimulatorProps) {
  const [estimatedGas, setEstimatedGas] = useState('0.003');
  const [ethPrice, setEthPrice] = useState(3855);
  
  const totalShares = Number(shares);
  const depositValue = Number(usdValue);
  
  // APY assumption (12% annual)
  const APY = 0.12;
  const monthlyReturn = depositValue * (APY / 12);
  const afterOneMonth = depositValue + monthlyReturn;
  
  // Gas cost in USD
  const gasCostUSD = Number(estimatedGas) * ethPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl border border-eagle-gold/30 p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Transaction Preview</h3>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4 mb-6">
          {/* You deposit */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">You deposit</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu" 
                  alt="WLFI"
                  className="h-5 w-5"
                />
                <span className="text-white font-medium">{Number(wlfiAmount).toLocaleString()} WLFI</span>
              </div>
            </div>
            {Number(usd1Amount) > 0 && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <img 
                    src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreic74no55hhm544qjraibffhrb4h7zldae5sfsyipvu6dvfyqubppy" 
                    alt="USD1"
                    className="h-5 w-5"
                  />
                  <span className="text-white font-medium">{Number(usd1Amount).toLocaleString()} USD1</span>
                </div>
              </div>
            )}
          </div>

          {/* You receive */}
          <div className="p-4 bg-gradient-to-br from-eagle-gold/10 to-blue-500/10 rounded-lg border border-eagle-gold/30">
            <p className="text-sm text-gray-400 mb-2">You receive</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-eagle-gold-light">
                {totalShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-sm text-gray-400">vEAGLE</span>
            </div>
          </div>

          {/* Transaction costs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-xs text-gray-400">Estimated Gas</p>
              </div>
              <p className="text-sm font-semibold text-white">${gasCostUSD.toFixed(2)}</p>
              <p className="text-xs text-gray-500">~{estimatedGas} ETH</p>
            </div>
            
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-400">Est. Time</p>
              </div>
              <p className="text-sm font-semibold text-white">~30 sec</p>
              <p className="text-xs text-gray-500">2-3 blocks</p>
            </div>
          </div>

          {/* Projected earnings */}
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/30">
            <p className="text-sm font-medium text-green-400 mb-3">After 1 month (est. 12% APY)</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Your position</span>
                <span className="text-white font-semibold">${afterOneMonth.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Fees earned</span>
                <span className="text-green-400 font-semibold">+${monthlyReturn.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">ROI</span>
                <span className="text-green-400 font-semibold">+{((monthlyReturn / depositValue) * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/20"
          >
            Confirm Deposit
          </button>
        </div>
      </div>
    </div>
  );
}

