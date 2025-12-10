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
  
  // Sync error state with isMaxSupplyReached
  useEffect(() => {
    if (error === 'MAX_SUPPLY_REACHED' || (error && (error.includes('revert') || error.includes('require') || error.includes('execution')))) {
      setIsMaxSupplyReached(true);
    }
  }, [error]);
  
  // Helper to check if deposits are blocked
  const depositsBlocked = isMaxSupplyReached || error === 'MAX_SUPPLY_REACHED' || (error && (error.includes('revert') || error.includes('require') || error.includes('execution')));
  
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
      <div className="p-4 sm:p-6">
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              Connect your wallet to use Composer
            </p>
          </div>
        ) : activeTab === 'deposit' && depositsBlocked ? (
          /* Max Supply Reached - Simple, elegant message */
          <div className="py-4 space-y-6">
            <div className="text-center space-y-3">
              <p className="text-4xl font-extralight tracking-tight text-gray-900 dark:text-white">
                50,000,000
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                EAGLE tokens have been minted
              </p>
            </div>
            
            <div className="h-px bg-gray-200 dark:bg-gray-800" />
            
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Get EAGLE on Uniswap
              </p>
              
              <a 
                href="https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E&chain=ethereum"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#FF007A] hover:bg-[#E5006D] text-white font-medium rounded-xl transition-colors"
              >
                <span>Swap ETH for EAGLE</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
              
              <button 
                onClick={() => setActiveTab('redeem')}
                className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Or redeem EAGLE for WLFI →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Balance Display with Fee */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Balance:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {activeTab === 'deposit' 
                    ? `${Number(formatEther(balances.wlfi)).toFixed(2)} WLFI`
                    : `${Number(formatEther(balances.eagle)).toFixed(2)} EAGLE`
                  }
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {activeTab === 'deposit' ? '-1%' : '-2%'} fee
              </span>
            </div>
            
            {/* Input */}
            <div className="relative">
              <NeoInput
                type="number"
                placeholder="0.0"
                value={inputAmount}
                onChange={setInputAmount}
                className="pr-16 text-xl font-medium text-center"
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 uppercase tracking-wide transition-colors"
              >
                Max
              </button>
            </div>
            
            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
            
            {/* Preview */}
            {preview ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">You receive</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Number(formatEther(preview.outputAmount)).toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                    {activeTab === 'deposit' ? 'EAGLE' : 'WLFI'}
                  </span>
                </div>
              </div>
            ) : null}
            
            {/* Status */}
            {txStatus && (
              <div className={`p-3 rounded-xl text-sm text-center ${
                txStatus.includes('✅') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : txStatus.includes('❌')
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              }`}>
                {txStatus}
              </div>
            )}
            
            {/* Action Button */}
            {!(activeTab === 'deposit' && depositsBlocked) && (
              <button
                onClick={needsApproval ? handleApprove : (activeTab === 'deposit' ? handleDeposit : handleRedeem)}
                disabled={loading || !inputAmount || parseFloat(inputAmount) <= 0}
                className="w-full py-3.5 bg-[#A27D46] hover:bg-[#8B6A3D] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {loading 
                  ? 'Processing...'
                  : needsApproval
                    ? `Approve ${activeTab === 'deposit' ? 'WLFI' : 'EAGLE'}`
                    : activeTab === 'deposit'
                      ? 'Deposit'
                      : 'Redeem'
                }
              </button>
            )}
          </div>
        )}
      </div>
    </NeoCard>
  );
}
