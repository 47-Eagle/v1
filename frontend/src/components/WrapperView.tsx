import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { CONTRACTS, TOKENS } from '../config/contracts';
import { ICONS } from '../config/icons';
import { NeoButton, NeoInput, NeoCard, NeoTabs, NeoStatCard } from './neumorphic';
import { LayerZeroBadge } from './tech-stack';

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
  onNavigateDown?: () => void;
  onNavigateUp?: () => void;
}

// Wrapper Contract ABI
const WRAPPER_ABI = [
  'function wrap(uint256 shares) external',
  'function unwrap(uint256 tokens) external',
  'function totalLocked() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function WRAP_FEE() view returns (uint256)',
  'function UNWRAP_FEE() view returns (uint256)',
];

// Vault/OFT ABI for balanceOf and transfers
const VAULT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

export default function WrapperView({ provider, account, onToast, onNavigateDown, onNavigateUp }: Props) {
  const [activeTab, setActiveTab] = useState<'wrap' | 'unwrap'>('wrap');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Balances
  const [vaultShareBalance, setVaultShareBalance] = useState('0');
  const [oftBalance, setOftBalance] = useState('0');
  const [totalLocked, setTotalLocked] = useState('0');
  const [totalOftSupply, setTotalOftSupply] = useState('0');
  
  // Fees
  const [wrapFee, setWrapFee] = useState('1');
  const [unwrapFee, setUnwrapFee] = useState('2');

  // Fetch balances and stats
  const fetchData = useCallback(async () => {
    console.log('WrapperView fetchData called:', { 
      hasProvider: !!provider, 
      account: account,
      accountLength: account?.length 
    });
    
    if (!provider || !account) {
      console.log('WrapperView: Missing provider or account');
      return;
    }

    try {
      const wrapperContract = new Contract(CONTRACTS.WRAPPER, WRAPPER_ABI, provider);
      const vaultContract = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
      const oftContract = new Contract(CONTRACTS.OFT, VAULT_ABI, provider); // OFT uses same ABI as vault for balanceOf

      console.log('Fetching balances for account:', account);
      console.log('Contract addresses:', {
        vault: CONTRACTS.VAULT,
        wrapper: CONTRACTS.WRAPPER,
        oft: CONTRACTS.OFT
      });

      const [
        vaultShares,
        oftTokens,
        locked,
        supply,
      ] = await Promise.all([
        vaultContract.balanceOf(account),
        oftContract.balanceOf(account), // Get OFT balance from OFT contract
        wrapperContract.totalLocked(), // Total vault shares locked in wrapper
        oftContract.totalSupply(), // Total OFT tokens minted (from OFT contract, not wrapper)
      ]);

      console.log('Raw balances:', {
        vaultShares: vaultShares.toString(),
        oftTokens: oftTokens.toString(),
        locked: locked.toString(),
        supply: supply.toString(),
      });

      setVaultShareBalance(formatEther(vaultShares));
      setOftBalance(formatEther(oftTokens));
      setTotalLocked(formatEther(locked));
      setTotalOftSupply(formatEther(supply));

      // Fetch fees
      try {
        const [wFee, uFee] = await Promise.all([
          wrapperContract.WRAP_FEE(),
          wrapperContract.UNWRAP_FEE(),
        ]);
        setWrapFee(wFee.toString());
        setUnwrapFee(uFee.toString());
      } catch (e) {
        console.log('Fees not available or contract version does not support them');
      }
    } catch (error) {
      console.error('Error fetching wrapper data:', error);
    }
  }, [provider, account]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Wrap function
  const handleWrap = async () => {
    if (!provider || !account || !amount) return;

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wrapperContract = new Contract(CONTRACTS.WRAPPER, WRAPPER_ABI, signer);
      const vaultContract = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      
      const amountWei = parseEther(amount);

      // Check allowance
      const allowance = await vaultContract.allowance(account, CONTRACTS.WRAPPER);
      
      if (allowance < amountWei) {
        onToast({
          message: 'Approving vault shares...',
          type: 'info',
        });
        
        const approveTx = await vaultContract.approve(CONTRACTS.WRAPPER, amountWei);
        await approveTx.wait();
        
        onToast({
          message: 'Approval successful!',
          type: 'success',
          txHash: approveTx.hash,
        });
      }

      // Wrap
      onToast({
        message: 'Wrapping shares to OFT tokens...',
        type: 'info',
      });

      const wrapTx = await wrapperContract.wrap(amountWei);
      await wrapTx.wait();

      onToast({
        message: `Successfully wrapped ${amount} vEAGLE to EAGLE OFT!`,
        type: 'success',
        txHash: wrapTx.hash,
      });

      setAmount('');
      await fetchData();
    } catch (error: any) {
      console.error('Wrap error:', error);
      onToast({
        message: error.message || 'Failed to wrap shares',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Unwrap function
  const handleUnwrap = async () => {
    if (!provider || !account || !amount) return;

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wrapperContract = new Contract(CONTRACTS.WRAPPER, WRAPPER_ABI, signer);
      const oftContract = new Contract(CONTRACTS.OFT, VAULT_ABI, signer);
      
      const amountWei = parseEther(amount);

      // Check allowance for OFT tokens
      const allowance = await oftContract.allowance(account, CONTRACTS.WRAPPER);
      
      if (allowance < amountWei) {
        onToast({
          message: 'Approving OFT tokens...',
          type: 'info',
        });
        
        const approveTx = await oftContract.approve(CONTRACTS.WRAPPER, amountWei);
        await approveTx.wait();
        
        onToast({
          message: 'Approval successful!',
          type: 'success',
          txHash: approveTx.hash,
        });
      }

      onToast({
        message: 'Unwrapping OFT tokens to shares...',
        type: 'info',
      });

      const unwrapTx = await wrapperContract.unwrap(amountWei);
      await unwrapTx.wait();

      onToast({
        message: `Successfully unwrapped ${amount} EAGLE OFT to vEAGLE!`,
        type: 'success',
        txHash: unwrapTx.hash,
      });

      setAmount('');
      await fetchData();
    } catch (error: any) {
      console.error('Unwrap error:', error);
      onToast({
        message: error.message || 'Failed to unwrap tokens',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleMaxClick = () => {
    if (activeTab === 'wrap') {
      setAmount(vaultShareBalance);
    } else {
      setAmount(oftBalance);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-black dark:to-gray-900 min-h-screen flex flex-col transition-colors">
      {/* Top Navigation */}
      <div className="flex justify-center pt-4 sm:pt-6 pb-3 sm:pb-4 px-4">
        {onNavigateUp && (
          <NeoButton 
            onClick={onNavigateUp}
            label="EAGLE/ETH LP"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            }
          />
        )}
      </div>

      {/* Centered Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 sm:py-0">
        <div className="max-w-2xl w-full">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 min-w-0">
              <img src={ICONS.EAGLE} alt="EAGLE" className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">Eagle Wrapper</h1>
                  <div className="flex-shrink-0">
                    <LayerZeroBadge />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 truncate">1:1 Cross-Chain Conversion</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <NeoButton
                onClick={handleRefresh}
                disabled={refreshing}
                label=""
                icon={
                  <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Compact Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
            <NeoStatCard
              label="Your Vault Shares"
              value={parseFloat(vaultShareBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              subtext="vEAGLE"
            />
            <NeoStatCard
              label="Your OFT Tokens"
              value={parseFloat(oftBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              subtext="EAGLE"
            />
          </div>

          {/* Main Wrapper Interface */}
          <NeoCard className="relative z-10">
            <div className="p-4 sm:p-5 md:p-6 relative z-10">
              <NeoTabs
                tabs={[
                  { id: 'wrap', label: 'Wrap' },
                  { id: 'unwrap', label: 'Unwrap' }
                ]}
                activeTab={activeTab}
                onChange={(tab) => setActiveTab(tab as 'wrap' | 'unwrap')}
              />

              <div className="mt-4 sm:mt-5 md:mt-6 space-y-3 sm:space-y-4">
                {/* Amount Input */}
                <NeoInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0.0"
                  type="text"
                  label={activeTab === 'wrap' ? 'Wrap Amount' : 'Unwrap Amount'}
                  maxLabel={`MAX (${activeTab === 'wrap' 
                    ? parseFloat(vaultShareBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : parseFloat(oftBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })
                  })`}
                  onMaxClick={handleMaxClick}
                />

                {/* Action Button */}
                <NeoButton
                  onClick={activeTab === 'wrap' ? handleWrap : handleUnwrap}
                  disabled={!account || !amount || loading}
                  label={loading ? 'Processing...' : (!account ? 'Connect Wallet' : activeTab === 'wrap' ? 'Wrap to OFT' : 'Unwrap to Shares')}
                  className="w-full relative z-10 cursor-pointer"
                />
                
                <p className="text-[10px] sm:text-xs text-center text-gray-500 dark:text-gray-500">
                  Fee: {activeTab === 'wrap' ? wrapFee : unwrapFee}% • 1:1 Ratio • LayerZero Compatible
                </p>
              </div>
            </div>
          </NeoCard>
        </div>
      </div>

      {/* Bottom Navigation - Down to Vault */}
      <div className="flex flex-col items-center justify-center pt-3 sm:pt-4 pb-4 sm:pb-6 px-4 relative z-10">
        {onNavigateDown && (
          <>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <NeoButton 
              onClick={onNavigateDown}
              label="Eagle Vault (WLFI/USD1)"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              }
              className="cursor-pointer"
            />
          </>
        )}
      </div>
    </div>
  );
}

