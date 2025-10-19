import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

interface TransactionSimulatorProps {
  wlfiAmount: string;
  usd1Amount: string;
  shares: string;
  usdValue: string;
  onConfirm: () => void;
  onCancel: () => void;
  provider?: BrowserProvider | null;
}

export default function TransactionSimulator({ 
  wlfiAmount, 
  usd1Amount, 
  shares, 
  usdValue,
  onConfirm,
  onCancel,
  provider 
}: TransactionSimulatorProps) {
  const [estimatedGas, setEstimatedGas] = useState('0.003');
  const [ethPrice, setEthPrice] = useState(3855);
  const [loadingGas, setLoadingGas] = useState(false);
  const [apyData, setApyData] = useState({ current: 12, historical: 14.5, projected: 11.2 });

  // Fetch real ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        if (data.ethereum?.usd) {
          setEthPrice(data.ethereum.usd);
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };
    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Estimate gas (in real implementation, this would call the actual contract)
  useEffect(() => {
    const estimateGas = async () => {
      setLoadingGas(true);
      try {
        // Simulating gas estimation - in production, estimate from actual contract call
        // For deposits > $100 (triggers Charm deployment): ~500k gas
        // For deposits < $100: ~250k gas
        const depositValue = Number(usdValue);
        const gasLimit = depositValue > 100 ? 500000 : 250000;
        
        if (provider) {
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || BigInt(30000000000); // 30 gwei fallback
          const estimatedCost = (gasPrice * BigInt(gasLimit)) / BigInt(10**18);
          setEstimatedGas(Number(estimatedCost).toFixed(6));
        }
      } catch (error) {
        console.error('Gas estimation failed:', error);
      } finally {
        setLoadingGas(false);
      }
    };
    
    if (provider && wlfiAmount) {
      estimateGas();
    }
  }, [provider, wlfiAmount, usd1Amount, usdValue]);
  
  const totalShares = Number(shares);
  const depositValue = Number(usdValue);
  
  // APY assumption (12% annual)
  const APY = 0.12;
  const monthlyReturn = depositValue * (APY / 12);
  const afterOneMonth = depositValue + monthlyReturn;
  
  // Gas cost in USD
  const gasCostUSD = Number(estimatedGas) * ethPrice;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-eagle-gold/20 p-8 max-w-lg w-full shadow-2xl shadow-black/50 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Transaction Preview</h3>
            <p className="text-sm text-gray-500 mt-1">Review before confirming</p>
          </div>
          <button 
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3 mb-8">
          {/* You deposit */}
          <div className="p-5 bg-black/40 rounded-xl border border-gray-800/50 backdrop-blur-sm">
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
          <div className="p-5 bg-gradient-to-br from-eagle-gold/5 via-transparent to-blue-500/5 rounded-xl border border-eagle-gold/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-eagle-gold/5 to-transparent opacity-50"></div>
            <div className="relative">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">You receive</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-eagle-gold-light to-eagle-gold bg-clip-text text-transparent">
                {totalShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-lg text-gray-400 font-medium">vEAGLE</span>
            </div>
            </div>
          </div>

          {/* Transaction costs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-black/20 rounded-xl border border-gray-800/30">
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-xs text-gray-400">Estimated Gas</p>
              </div>
              <p className="text-sm font-semibold text-white">${gasCostUSD.toFixed(2)}</p>
              <p className="text-xs text-gray-500">~{estimatedGas} ETH</p>
            </div>
            
            <div className="p-4 bg-black/20 rounded-xl border border-gray-800/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Est. Time</p>
              </div>
              <p className="text-base font-bold text-white">~30 sec</p>
              <p className="text-xs text-gray-600 mt-1">2-3 blocks</p>
            </div>
          </div>

          {/* Projected earnings */}
          <div className="p-5 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-xl border border-green-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl"></div>
            <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-green-400">Projected Earnings (1 month)</p>
            </div>
            <div className="space-y-2.5">
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
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-8"></div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onCancel}
            className="group px-6 py-4 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-gray-700/50 hover:border-gray-600"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </span>
          </button>
          <button
            onClick={onConfirm}
            className="group px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]"
          >
            <span className="flex items-center justify-center gap-2">
              Confirm Deposit
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Your transaction will be sent to the blockchain. Always verify amounts before confirming.
        </p>
      </div>
    </div>
  );
}

