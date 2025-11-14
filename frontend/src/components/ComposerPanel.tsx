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
  
  // Load balances
  useEffect(() => {
    if (isConnected) {
      getBalances().then(setBalances);
    }
  }, [isConnected, getBalances]);
  
  // Auto-preview when amount changes
  useEffect(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0) {
      setPreview(null);
      return;
    }
    
    const amountBigInt = parseEther(inputAmount);
    
    if (activeTab === 'deposit') {
      previewDeposit(amountBigInt).then(setPreview);
    } else {
      previewRedeem(amountBigInt).then(setPreview);
    }
  }, [inputAmount, activeTab, previewDeposit, previewRedeem]);
  
  // Handle deposit
  const handleDeposit = async () => {
    if (!inputAmount) return;
    
    setTxStatus('Approving...');
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
    
    setTxStatus('Approving...');
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
    <NeoCard className="mt-6">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-300/50 dark:border-gray-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Eagle Composer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">One-click vault operations</p>
          </div>
          
          {/* Fee - conditional based on active tab */}
          {activeTab === 'deposit' ? (
            <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-400">1% Fee</div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20">
              <div className="text-xs font-bold text-orange-700 dark:text-orange-400">2% Fee</div>
            </div>
          )}
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
      <div className="p-4 sm:p-6 space-y-4">
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              Connect your wallet to use Composer
            </p>
          </div>
        ) : (
          <>
            {/* Balance Display */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Balance: 
              </span>
              <span className="font-mono text-gray-900 dark:text-white">
                {activeTab === 'deposit' 
                  ? `${Number(formatEther(balances.wlfi)).toFixed(2)} WLFI`
                  : `${Number(formatEther(balances.eagle)).toFixed(2)} EAGLE`
                }
              </span>
            </div>
            
            {/* Input */}
            <div className="relative">
              <NeoInput
                type="number"
                placeholder="0.0"
                value={inputAmount}
                onChange={setInputAmount}
                className="pr-20"
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 text-gray-900 text-sm font-black tracking-wide shadow-[0_2px_8px_rgba(251,191,36,0.4)] hover:shadow-[0_4px_12px_rgba(251,191,36,0.6)] transition-all"
              >
                MAX
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
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">You'll receive:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {Number(formatEther(preview.outputAmount)).toFixed(4)}{' '}
                    {activeTab === 'deposit' ? 'EAGLE' : 'WLFI'}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-500">Conversion rate:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {preview.conversionRate.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-500">Fees:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    ~{preview.feePercentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            
            {/* Status */}
            {txStatus && (
              <div className={`p-3 rounded-lg text-sm text-center ${
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
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            
            {/* Action Button */}
            <NeoButton
              onClick={activeTab === 'deposit' ? handleDeposit : handleRedeem}
              disabled={loading || !inputAmount || parseFloat(inputAmount) <= 0}
              className="w-full"
            >
              {loading 
                ? 'Processing...'
                : activeTab === 'deposit'
                  ? '🦅 Deposit & Wrap'
                  : '💰 Unwrap & Redeem'
              }
            </NeoButton>
            
            {/* Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {activeTab === 'deposit' ? (
                <>
                  <p>• Converts WLFI → vEAGLE → EAGLE in one transaction</p>
                  <p>• Includes vault deposit fee + wrapper fee</p>
                  <p>• EAGLE can be used for cross-chain operations</p>
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

