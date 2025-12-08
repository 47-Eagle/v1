import React, { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { useEagleComposer } from '../hooks/useEagleComposer';
import { NeoCard, NeoButton, NeoInput, NeoTabs } from './neumorphic';

/**
 * Composer Panel Component
 * Provides UI for one-click WLFI ↔ EAGLE conversions
 */
export function ComposerPanel() {
  const {
    previewDeposit,
    previewRedeem,
    depositWLFI,
    redeemEAGLE,
    getBalances,
    checkAllowance,
    approveToken,
    checkMaxSupply,
    loading,
    error,
    isConnected
  } = useEagleComposer();
  
  // State
  const [activeTab, setActiveTab] = useState<'deposit' | 'redeem'>('deposit');
  const [inputAmount, setInputAmount] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [balances, setBalances] = useState({ wlfi: 0n, eagle: 0n });
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [maxSupplyInfo, setMaxSupplyInfo] = useState<any>(null);
  const [isMaxSupplyReached, setIsMaxSupplyReached] = useState(false);
  
  // Load balances
  useEffect(() => {
    if (isConnected) {
      getBalances().then(setBalances);
    }
  }, [isConnected, getBalances]);
  
  // Check max supply on mount and when switching to deposit tab
  useEffect(() => {
    if (isConnected && activeTab === 'deposit') {
      checkMaxSupply().then(info => {
        setMaxSupplyInfo(info);
        setIsMaxSupplyReached(info.isMaxReached);
      });
    }
  }, [isConnected, activeTab, checkMaxSupply]);
  
  // Auto-preview when amount changes + check allowance
  useEffect(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0) {
      setPreview(null);
      setNeedsApproval(false);
      return;
    }
    
    const amountBigInt = parseEther(inputAmount);
    
    if (activeTab === 'deposit') {
      previewDeposit(amountBigInt).then(setPreview);
      checkAllowance('wlfi', amountBigInt).then(approved => setNeedsApproval(!approved));
    } else {
      previewRedeem(amountBigInt).then(setPreview);
      checkAllowance('eagle', amountBigInt).then(approved => setNeedsApproval(!approved));
    }
  }, [inputAmount, activeTab, previewDeposit, previewRedeem, checkAllowance]);
  
  // Handle approval
  const handleApprove = async () => {
    if (!inputAmount) return;
    
    setTxStatus('Requesting approval...');
    const amount = parseEther(inputAmount);
    const token = activeTab === 'deposit' ? 'wlfi' : 'eagle';
    
    await approveToken(
      token,
      amount,
      () => {
        setTxStatus('✅ Approved!');
        setNeedsApproval(false);
        setTimeout(() => setTxStatus(null), 2000);
      },
      (error) => {
        setTxStatus(`❌ ${error}`);
        setTimeout(() => setTxStatus(null), 5000);
      }
    );
  };
  
  // Handle deposit
  const handleDeposit = async () => {
    if (!inputAmount) return;
    
    setTxStatus('Depositing...');
    const amount = parseEther(inputAmount);
    
    await depositWLFI(
      amount,
      (tx) => {
        setTxStatus('✅ Success!');
        setInputAmount('');
        setTimeout(() => setTxStatus(null), 3000);
        // Refresh balances
        getBalances().then(setBalances);
      },
      (error) => {
        setTxStatus(`❌ ${error}`);
        setTimeout(() => setTxStatus(null), 5000);
      }
    );
  };
  
  // Handle redeem
  const handleRedeem = async () => {
    if (!inputAmount) return;
    
    setTxStatus('Redeeming...');
    const amount = parseEther(inputAmount);
    
    await redeemEAGLE(
      amount,
      (tx) => {
        setTxStatus('✅ Success!');
        setInputAmount('');
        setTimeout(() => setTxStatus(null), 3000);
        // Refresh balances
        getBalances().then(setBalances);
      },
      (error) => {
        setTxStatus(`❌ ${error}`);
        setTimeout(() => setTxStatus(null), 5000);
      }
    );
  };
  
  // Set max amount
  const handleMaxClick = () => {
    if (activeTab === 'deposit') {
      setInputAmount(formatEther(balances.wlfi));
    } else {
      setInputAmount(formatEther(balances.eagle));
    }
  };
  
  return (
    <NeoCard className="mt-3 sm:mt-6">
      {/* Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-300/50 dark:border-gray-700/30">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Eagle Composer</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">One-click vault operations</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-4 sm:px-6 pt-4">
        <NeoTabs
          tabs={[
            { id: 'deposit', label: 'Deposit' },
            { id: 'redeem', label: 'Redeem' }
          ]}
          defaultTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab as 'deposit' | 'redeem');
            setInputAmount('');
            setPreview(null);
          }}
        />
      </div>
      
      {/* Content */}
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              Connect your wallet to use Composer
            </p>
          </div>
        ) : (
          <>
            {/* Max Supply Warning - only show for deposits */}
            {activeTab === 'deposit' && isMaxSupplyReached && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-4 sm:p-5 animate-pulse">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-2xl flex-shrink-0">🚫</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-sm mb-2 sm:mb-1">
                      Deposits Disabled
                    </h4>
                    <p className="text-sm sm:text-xs text-red-700 dark:text-red-300 leading-relaxed">
                      Maximum supply of {maxSupplyInfo ? (Number(maxSupplyInfo.maxSupply) / 1e18).toLocaleString() : '50,000,000'} EAGLE has been reached.
                    </p>
                    <p className="text-sm sm:text-xs text-red-600 dark:text-red-400 mt-3 sm:mt-2 leading-relaxed">
                      You can still redeem EAGLE tokens for WLFI.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Balance Display with Fee */}
            <div className="flex justify-between items-center text-sm sm:text-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Balance:</span>
                <span className="font-mono text-gray-900 dark:text-white truncate">
                  {activeTab === 'deposit' 
                    ? `${Number(formatEther(balances.wlfi)).toFixed(2)} WLFI`
                    : `${Number(formatEther(balances.eagle)).toFixed(2)} EAGLE`
                  }
                </span>
              </div>
              <div className={`text-xs sm:text-xs font-medium px-3 py-1.5 sm:px-2 sm:py-0.5 rounded-lg sm:rounded flex-shrink-0 ${
                activeTab === 'deposit'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
              }`}>
                {activeTab === 'deposit' ? '1%' : '2%'} fee
              </div>
            </div>
            
            {/* Input */}
            <div className="relative">
              <NeoInput
                type="number"
                placeholder="0.0"
                value={inputAmount}
                onChange={setInputAmount}
                className="pr-20 sm:pr-16 text-2xl sm:text-xl font-semibold text-center amount-input"
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-sm sm:text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-[#A27D46] dark:hover:text-[#D4B474] active:scale-95 transition-all uppercase tracking-wider bg-gray-100 dark:bg-gray-800 sm:bg-transparent rounded-lg sm:rounded-none px-3 sm:px-0"
              >
                Max
              </button>
            </div>
            
            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
            
            {/* Preview */}
            {preview && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-4 space-y-3 sm:space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm sm:text-sm text-gray-600 dark:text-gray-400">You'll receive:</span>
                  <span className="font-bold text-lg sm:text-base text-gray-900 dark:text-white tabular-nums">
                    {Number(formatEther(preview.outputAmount)).toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                    {activeTab === 'deposit' ? 'EAGLE' : 'WLFI'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm sm:text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-500">Conversion rate:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {preview.conversionRate.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex justify-between text-sm sm:text-xs">
                  <span className="text-gray-500 dark:text-gray-500">Fees:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    ~{preview.feePercentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            
            {/* Status */}
            {txStatus && (
              <div className={`p-4 sm:p-3 rounded-xl sm:rounded-lg text-base sm:text-sm text-center leading-relaxed ${
                txStatus.includes('✅') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : txStatus.includes('❌')
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
              }`}>
                {txStatus}
              </div>
            )}
            
            {/* Error */}
            {error && (
              <div className="p-4 sm:p-3 rounded-xl sm:rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-base sm:text-sm leading-relaxed">
                {error}
              </div>
            )}
            
            {/* Action Button */}
            <NeoButton
              onClick={needsApproval ? handleApprove : (activeTab === 'deposit' ? handleDeposit : handleRedeem)}
              disabled={loading || !inputAmount || parseFloat(inputAmount) <= 0 || (activeTab === 'deposit' && isMaxSupplyReached)}
              className="w-full"
            >
              {loading 
                ? 'Processing...'
                : needsApproval
                  ? `Approve ${activeTab === 'deposit' ? 'WLFI' : 'EAGLE'}`
                  : activeTab === 'deposit' && isMaxSupplyReached
                    ? 'Deposits Disabled (Max Supply Reached)'
                    : activeTab === 'deposit'
                      ? 'Deposit'
                      : 'Redeem'
              }
            </NeoButton>
            
            {/* Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {activeTab === 'deposit' ? (
                <>
                  <p>• Converts WLFI → vEAGLE → EAGLE in one transaction</p>
                  <p>• Includes vault deposit fee + wrapper fee</p>
                  <p>• EAGLE can be used for cross-chain operations</p>
                  {maxSupplyInfo && !isMaxSupplyReached && (
                    <p>• Remaining supply: {(Number(maxSupplyInfo.remaining) / 1e18).toLocaleString()} EAGLE</p>
                  )}
                  {isMaxSupplyReached && (
                    <p className="text-red-500 dark:text-red-400">⚠️ Max supply reached - deposits disabled</p>
                  )}
                </>
              ) : (
                <>
                  <p>• Converts EAGLE → vEAGLE → WLFI in one transaction</p>
                  <p>• Includes wrapper fee + vault withdrawal fee</p>
                  <p>• Receive WLFI directly in your wallet</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </NeoCard>
  );
}


                ? 'Processing...'
                : needsApproval
                  ? `Approve ${activeTab === 'deposit' ? 'WLFI' : 'EAGLE'}`
                  : activeTab === 'deposit' && isMaxSupplyReached
                    ? 'Deposits Disabled (Max Supply Reached)'
                    : activeTab === 'deposit'
                      ? 'Deposit'
                      : 'Redeem'
              }
            </NeoButton>
            
            {/* Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {activeTab === 'deposit' ? (
                <>
                  <p>• Converts WLFI → vEAGLE → EAGLE in one transaction</p>
                  <p>• Includes vault deposit fee + wrapper fee</p>
                  <p>• EAGLE can be used for cross-chain operations</p>
                  {maxSupplyInfo && !isMaxSupplyReached && (
                    <p>• Remaining supply: {(Number(maxSupplyInfo.remaining) / 1e18).toLocaleString()} EAGLE</p>
                  )}
                  {isMaxSupplyReached && (
                    <p className="text-red-500 dark:text-red-400">⚠️ Max supply reached - deposits disabled</p>
                  )}
                </>
              ) : (
                <>
                  <p>• Converts EAGLE → vEAGLE → WLFI in one transaction</p>
                  <p>• Includes wrapper fee + vault withdrawal fee</p>
                  <p>• Receive WLFI directly in your wallet</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </NeoCard>
  );
}

