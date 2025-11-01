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
    <div className="bg-neo-bg dark:bg-black min-h-screen pb-24 transition-colors">
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-24">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-4 mb-6">
          {onNavigateDown && (
            <NeoButton 
              onClick={onNavigateDown}
              label="Back to Vault"
              icon={
                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              }
            />
          )}
          {onNavigateUp && (
            <NeoButton 
              onClick={onNavigateUp}
              label="Continue to LP Pool"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              }
            />
          )}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <img 
            src={ICONS.EAGLE}
            alt="EAGLE"
            className="w-16 h-16 rounded-2xl"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Eagle Vault Wrapper</h1>
              <LayerZeroBadge />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{CONTRACTS.WRAPPER}</p>
          </div>
          <NeoButton
            onClick={handleRefresh}
            disabled={refreshing}
            label=""
            icon={
              <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
        </div>

        {/* Description */}
        <NeoCard className="mb-6">
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Convert between Vault EAGLE shares (vEAGLE) and OFT EAGLE tokens at a 1:1 ratio. 
              OFT tokens can be bridged cross-chain via LayerZero, enabling seamless vault share transfers across multiple networks.
            </p>
          </div>
        </NeoCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <NeoStatCard
            label="Total Locked"
            value={parseFloat(totalLocked).toFixed(2)}
            subtext="Vault shares"
          />
          <NeoStatCard
            label="Total OFT Minted"
            value={parseFloat(totalOftSupply).toFixed(2)}
            subtext="OFT tokens"
          />
          <NeoStatCard
            label="1:1 Peg Status"
            value={parseFloat(totalLocked) === parseFloat(totalOftSupply) ? '✓ Active' : '⚠ Checking'}
            subtext={parseFloat(totalLocked) === parseFloat(totalOftSupply) ? 'Perfect ratio' : 'Syncing...'}
          />
        </div>

        {/* Main Wrapper Interface */}
        <NeoCard className="mb-6">
          <div className="p-6">
            <NeoTabs
              tabs={[
                { id: 'wrap', label: 'Wrap to OFT' },
                { id: 'unwrap', label: 'Unwrap to Shares' }
              ]}
              activeTab={activeTab}
              onChange={(tab) => setActiveTab(tab as 'wrap' | 'unwrap')}
            />

            <div className="mt-6">
              {activeTab === 'wrap' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Wrap Vault Shares → OFT Tokens</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Lock your vault EAGLE shares and receive OFT EAGLE tokens at 1:1 ratio.
                      OFT tokens can be bridged cross-chain via LayerZero.
                    </p>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <NeoInput
                      value={amount}
                      onChange={setAmount}
                      placeholder="0.0"
                      type="text"
                      label="Amount to Wrap"
                      maxLabel={`MAX (${parseFloat(vaultShareBalance).toFixed(2)} vEAGLE)`}
                      onMaxClick={handleMaxClick}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Wrap Fee: {wrapFee}%
                    </p>
                  </div>

                  {/* Wrap Button */}
                  <NeoButton
                    onClick={handleWrap}
                    disabled={!account || !amount || loading}
                    label={loading ? 'Processing...' : (!account ? 'Connect Wallet' : 'Wrap to OFT')}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Unwrap OFT Tokens → Vault Shares</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Burn your OFT EAGLE tokens and receive vault EAGLE shares at 1:1 ratio.
                      You can then withdraw from the vault.
                    </p>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <NeoInput
                      value={amount}
                      onChange={setAmount}
                      placeholder="0.0"
                      type="text"
                      label="Amount to Unwrap"
                      maxLabel={`MAX (${parseFloat(oftBalance).toFixed(2)} EAGLE)`}
                      onMaxClick={handleMaxClick}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Unwrap Fee: {unwrapFee}%
                    </p>
                  </div>

                  {/* Unwrap Button */}
                  <NeoButton
                    onClick={handleUnwrap}
                    disabled={!account || !amount || loading}
                    label={loading ? 'Processing...' : (!account ? 'Connect Wallet' : 'Unwrap to Shares')}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </NeoCard>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* How it Works */}
          <NeoCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How it Works
              </h3>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">→</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Wrap:</strong> Lock vault shares, mint OFT tokens at 1:1 ratio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">→</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Bridge:</strong> Send OFT tokens to other chains via LayerZero</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">→</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Unwrap:</strong> Burn OFT tokens, receive vault shares back</span>
                </li>
              </ul>
            </div>
          </NeoCard>

          {/* Features */}
          <NeoCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Features
              </h3>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                  <span>1:1 peg maintained at all times</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                  <span>Cross-chain compatible via LayerZero</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                  <span>Secure and non-custodial</span>
                </li>
              </ul>
            </div>
          </NeoCard>
        </div>
      </div>
    </div>
  );
}

