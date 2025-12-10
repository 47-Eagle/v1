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
        ) : activeTab === 'deposit' && isMaxSupplyReached ? (
          /* Max Supply Reached - Elegant Uniswap CTA */
          <div className="text-center py-6 space-y-6">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-sm font-medium">50M EAGLE Cap Reached</span>
            </div>
            
            {/* Message */}
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Deposits Temporarily Unavailable
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                The maximum supply has been reached. You can acquire EAGLE by swapping on Uniswap.
              </p>
            </div>
            
            {/* Uniswap Button */}
            <a 
              href="https://app.uniswap.org/swap?outputCurrency=0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E&chain=ethereum"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 w-full max-w-xs mx-auto px-6 py-4 bg-gradient-to-r from-[#FF007A] to-[#FF5CAA] hover:from-[#E5006D] hover:to-[#FF4499] text-white font-semibold rounded-2xl shadow-lg shadow-pink-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
                <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="white" fillOpacity="0.2"/>
                <path d="M15.23 10.75C15.49 10.46 15.93 10.46 16.19 10.75L20 14.89L23.81 10.75C24.07 10.46 24.51 10.46 24.77 10.75C25.03 11.04 25.03 11.51 24.77 11.8L20.48 16.47C20.22 16.76 19.78 16.76 19.52 16.47L15.23 11.8C14.97 11.51 14.97 11.04 15.23 10.75Z" fill="white"/>
                <path d="M15.23 17.75C15.49 17.46 15.93 17.46 16.19 17.75L20 21.89L23.81 17.75C24.07 17.46 24.51 17.46 24.77 17.75C25.03 18.04 25.03 18.51 24.77 18.8L20.48 23.47C20.22 23.76 19.78 23.76 19.52 23.47L15.23 18.8C14.97 18.51 14.97 18.04 15.23 17.75Z" fill="white"/>
                <path d="M20 29.25C20.41 29.25 20.75 28.91 20.75 28.5V24.5C20.75 24.09 20.41 23.75 20 23.75C19.59 23.75 19.25 24.09 19.25 24.5V28.5C19.25 28.91 19.59 29.25 20 29.25Z" fill="white"/>
              </svg>
              <span>Buy EAGLE on Uniswap</span>
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            {/* Alternative */}
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Or switch to the <button onClick={() => setActiveTab('redeem')} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Redeem</button> tab to convert EAGLE → WLFI
            </p>
          </div>
        ) : (
          <>
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
                -{activeTab === 'deposit' ? '1' : '2'}%
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
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">You'll receive:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg sm:text-base text-gray-900 dark:text-white tabular-nums">
                      {Number(formatEther(preview.outputAmount)).toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                      {activeTab === 'deposit' ? 'EAGLE' : 'WLFI'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      activeTab === 'deposit'
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                        : 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                      -{activeTab === 'deposit' ? '1' : '2'}%
                    </span>
                  </div>
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
            {error && error !== 'MAX_SUPPLY_REACHED' && (
              <div className="p-4 sm:p-3 rounded-xl sm:rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-base sm:text-sm leading-relaxed">
                {error}
              </div>
            )}
            
            {/* Action Button */}
            <NeoButton
              onClick={needsApproval ? handleApprove : (activeTab === 'deposit' ? handleDeposit : handleRedeem)}
              disabled={loading || !inputAmount || parseFloat(inputAmount) <= 0}
              className="w-full"
            >
              {loading 
                ? 'Processing...'
                : needsApproval
                  ? `Approve ${activeTab === 'deposit' ? 'WLFI' : 'EAGLE'}`
                  : activeTab === 'deposit'
                    ? 'Deposit WLFI'
                    : 'Redeem EAGLE'
              }
            </NeoButton>
            
            {/* Info */}
            <div className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 space-y-2 sm:space-y-1 leading-relaxed">
              {activeTab === 'deposit' ? (
                <>
                  <p>• Converts WLFI → vEAGLE → EAGLE in one transaction</p>
                  <p>• EAGLE can be used for cross-chain operations</p>
                  {maxSupplyInfo && !isMaxSupplyReached && (
                    <p className="text-green-600 dark:text-green-400">• Remaining: {(Number(maxSupplyInfo.remaining) / 1e18).toLocaleString()} EAGLE available</p>
                  )}
                </>
              ) : (
                <>
                  <p>• Converts EAGLE → vEAGLE → WLFI in one transaction</p>
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
