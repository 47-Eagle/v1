import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther, formatUnits, MaxUint256 } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import TransactionSimulator from './TransactionSimulator';
import NetworkChecker from './NetworkChecker';

const VAULT_ABI = [
  'function depositDual(uint256 wlfiAmount, uint256 usd1Amount, address receiver) returns (uint256)',
  'function withdrawDual(uint256 shares, address receiver) returns (uint256 wlfiAmount, uint256 usd1Amount)',
  'function balanceOf(address) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function previewDepositDual(uint256 wlfiAmount, uint256 usd1Amount) view returns (uint256 shares, uint256 usdValue)',
  'function getWLFIPrice() view returns (uint256)',
  'function getUSD1Price() view returns (uint256)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onConnect: () => void;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
}

export default function VaultActions({ provider, account, onConnect, onToast }: Props) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [wlfiBalance, setWlfiBalance] = useState('0');
  const [usd1Balance, setUsd1Balance] = useState('0');
  const [vEagleBalance, setVEagleBalance] = useState('0');
  const [previewShares, setPreviewShares] = useState('0');
  const [previewUsdValue, setPreviewUsdValue] = useState('0');
  const [showSimulator, setShowSimulator] = useState(false);
  const [approvalStep, setApprovalStep] = useState<'idle' | 'checking' | 'approving-wlfi' | 'approving-usd1' | 'depositing'>('idle');

  useEffect(() => {
    if (!provider || !account) return;

    const fetchBalances = async () => {
      try {
        const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, provider);
        const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, provider);
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);

        const [wlfiB, usd1B, vEagleB, totalAssets, totalSupply] = await Promise.all([
          wlfi.balanceOf(account),
          usd1.balanceOf(account),
          vault.balanceOf(account),
          vault.totalAssets(),
          vault.totalSupply(),
        ]);

        setWlfiBalance(formatEther(wlfiB));
        setUsd1Balance(formatEther(usd1B)); // USD1 is 18 decimals
        setVEagleBalance(formatEther(vEagleB));
        
        // Calculate share price
        // Share price (not currently used in UI)
        // const price = Number(totalSupply) > 0 
        //   ? (Number(totalAssets) / Number(totalSupply))
        //   : 1;
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [provider, account]);

  // Preview deposit in real-time
  useEffect(() => {
    if (!provider || (!wlfiAmount && !usd1Amount)) {
      setPreviewShares('0');
      setPreviewUsdValue('0');
      return;
    }

    const previewDeposit = async () => {
      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const wlfiWei = wlfiAmount ? parseEther(wlfiAmount) : 0n;
        const usd1Wei = usd1Amount ? parseEther(usd1Amount) : 0n; // USD1 is 18 decimals (verified on Etherscan)

        const [shares, usdValue] = await vault.previewDepositDual(wlfiWei, usd1Wei);
        setPreviewShares(formatEther(shares));
        setPreviewUsdValue((Number(usdValue) / 1e18).toFixed(2));
      } catch (error) {
        console.error('Error previewing deposit:', error);
      }
    };

    const debounce = setTimeout(() => {
      previewDeposit();
    }, 500); // Debounce 500ms

    return () => clearTimeout(debounce);
  }, [provider, wlfiAmount, usd1Amount]);

  const confirmAndDeposit = async () => {
    console.log('🚀 confirmAndDeposit called');
    console.log('WLFI:', wlfiAmount, 'USD1:', usd1Amount);
    
    if (!provider || (!wlfiAmount && !usd1Amount)) {
      console.log('❌ Validation failed - no provider or amounts');
      return;
    }

    // ✅ VALIDATE BALANCES BEFORE DEPOSIT
    const wlfiNum = Number(wlfiAmount || '0');
    const usd1Num = Number(usd1Amount || '0');
    const wlfiBalNum = Number(wlfiBalance);
    const usd1BalNum = Number(usd1Balance);

    if (wlfiNum > wlfiBalNum) {
      onToast({ 
        message: `Insufficient WLFI balance. You have ${wlfiBalNum.toFixed(4)} but trying to deposit ${wlfiNum.toFixed(4)}`, 
        type: 'error' 
      });
      setShowSimulator(false);
      return;
    }

    if (usd1Num > usd1BalNum) {
      onToast({ 
        message: `Insufficient USD1 balance. You have ${usd1BalNum.toFixed(4)} but trying to deposit ${usd1Num.toFixed(4)}`, 
        type: 'error' 
      });
      setShowSimulator(false);
      return;
    }

    setShowSimulator(false);
    setLoading(true);
    setApprovalStep('checking');
    
    try {
      console.log('Getting signer...');
      const signer = await provider.getSigner();
      
      console.log('💼 Contract addresses being used:');
      console.log('  Vault:', CONTRACTS.VAULT);
      console.log('  WLFI:', CONTRACTS.WLFI);
      console.log('  USD1:', CONTRACTS.USD1);
      
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, signer);
      const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, signer);

      // ✅ USE ACTUAL BALANCES (prevent rounding errors)
      const wlfiWei = parseEther(wlfiAmount || '0');
      const usd1Wei = parseEther(usd1Amount || '0'); // USD1 is 18 decimals (verified on Etherscan)
      
      console.log('Amounts in wei:', wlfiWei.toString(), usd1Wei.toString());
      console.log('Account (receiver):', account);

      // Check and approve WLFI if needed
      console.log('🔍 Checking WLFI allowance...');
      const wlfiAllowance = await wlfi.allowance(account, CONTRACTS.VAULT);
      console.log('  Current allowance:', wlfiAllowance.toString());
      console.log('  Need:', wlfiWei.toString());
      
      if (wlfiAllowance < wlfiWei) {
        console.log('⚠️  Need to approve WLFI');
        setApprovalStep('approving-wlfi');
        onToast({ message: 'Approving WLFI...', type: 'info' });
        const maxApproval = MaxUint256; // Approve max to avoid future approvals
        const wlfiApproveTx = await wlfi.approve(CONTRACTS.VAULT, maxApproval);
        console.log('  Approval TX sent:', wlfiApproveTx.hash);
        await wlfiApproveTx.wait();
        console.log('  ✅ WLFI approved!');
        onToast({ message: 'WLFI approved!', type: 'success' });
      } else {
        console.log('  ✅ WLFI already approved');
      }
      
      // Check and approve USD1 if needed
      if (Number(usd1Amount) > 0) {
        console.log('🔍 Checking USD1 allowance...');
        const usd1Allowance = await usd1.allowance(account, CONTRACTS.VAULT);
        console.log('  Current allowance:', usd1Allowance.toString());
        
        if (usd1Allowance < usd1Wei) {
          console.log('⚠️  Need to approve USD1');
          setApprovalStep('approving-usd1');
          onToast({ message: 'Approving USD1...', type: 'info' });
          const maxApproval = MaxUint256;
          const usd1ApproveTx = await usd1.approve(CONTRACTS.VAULT, maxApproval);
          console.log('  Approval TX sent:', usd1ApproveTx.hash);
          await usd1ApproveTx.wait();
          console.log('  ✅ USD1 approved!');
          onToast({ message: 'USD1 approved!', type: 'success' });
        } else {
          console.log('  ✅ USD1 already approved');
        }
      }

      console.log('🚀 Calling depositDual...');
      console.log('  Function: depositDual(', wlfiWei.toString(), ',', usd1Wei.toString(), ',', account, ')');
      
      setApprovalStep('depositing');
      onToast({ message: 'Depositing to vault...', type: 'info' });
      const depositTx = await vault.depositDual(wlfiWei, usd1Wei, account);
      console.log('  Deposit TX sent:', depositTx.hash);
      const receipt = await depositTx.wait();
      console.log('  ✅ Deposit confirmed! Block:', receipt.blockNumber);

      onToast({ 
        message: 'Deposit successful! You received vEAGLE shares', 
        type: 'success',
        txHash: receipt?.hash 
      });
      setWlfiAmount('');
      setUsd1Amount('');
    } catch (error: any) {
      console.error('❌ Deposit error:', error);
      onToast({ message: `Deposit failed: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
      setApprovalStep('idle');
    }
  };

  const handleDeposit = () => {
    console.log('🎯 handleDeposit clicked');
    console.log('Amounts:', wlfiAmount, usd1Amount);
    
    if (!wlfiAmount && !usd1Amount) {
      console.log('❌ No amounts entered');
      onToast({ message: 'Please enter an amount to deposit', type: 'error' });
      return;
    }

    // ✅ VALIDATE BALANCES
    const wlfiNum = Number(wlfiAmount || '0');
    const usd1Num = Number(usd1Amount || '0');
    const wlfiBalNum = Number(wlfiBalance);
    const usd1BalNum = Number(usd1Balance);

    if (wlfiNum > wlfiBalNum) {
      onToast({ 
        message: `Insufficient WLFI balance. You have ${wlfiBalNum.toFixed(4)} WLFI`, 
        type: 'error' 
      });
      return;
    }

    if (usd1Num > usd1BalNum) {
      onToast({ 
        message: `Insufficient USD1 balance. You have ${usd1BalNum.toFixed(4)} USD1`, 
        type: 'error' 
      });
      return;
    }
    
    console.log('✅ Showing simulator');
    setShowSimulator(true);
  };

  const handleWithdraw = async () => {
    if (!provider || !withdrawAmount) return;

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);

      const shares = parseEther(withdrawAmount);
      onToast({ message: 'Withdrawing from vault...', type: 'info' });
      const withdrawTx = await vault.withdrawDual(shares, account);
      const receipt = await withdrawTx.wait();

      onToast({ 
        message: 'Withdrawal successful! You received WLFI + USD1', 
        type: 'success',
        txHash: receipt?.hash 
      });
      setWithdrawAmount('');
    } catch (error: any) {
      onToast({ message: `Withdrawal failed: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="bg-[#0a0a0a]/60 rounded-xl border border-eagle-gold/30 backdrop-blur-md p-12 mb-6 text-center">
        <p className="text-gray-400 mb-4">Connect your wallet to interact with the vault</p>
        <button
          onClick={onConnect}
          className="px-6 py-2.5 bg-eagle-gold hover:bg-eagle-gold-dark text-black font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-eagle-gold/20"
        >
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Network Checker - Removed full screen modal, now using header selector instead */}
      {/* <NetworkChecker provider={provider} expectedChainId={1} /> */}
      
      {/* Transaction Simulator Modal - Only show on deposit tab */}
      {showSimulator && activeTab === 'deposit' && (
        <TransactionSimulator
          wlfiAmount={wlfiAmount}
          usd1Amount={usd1Amount}
          shares={previewShares}
          usdValue={previewUsdValue}
          onConfirm={confirmAndDeposit}
          onCancel={() => setShowSimulator(false)}
          provider={provider}
        />
      )}

      <div className="bg-[#0a0a0a]/60 rounded-xl border border-eagle-gold/30 backdrop-blur-md mb-6">
      {/* Approval Progress */}
      {loading && approvalStep !== 'idle' && (
        <div className="mx-6 mt-6 mb-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {approvalStep === 'checking' || approvalStep === 'approving-wlfi' ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium text-white">
                {approvalStep === 'checking' && 'Checking allowances...'}
                {approvalStep === 'approving-wlfi' && 'Approving WLFI...'}
                {(approvalStep === 'approving-usd1' || approvalStep === 'depositing') && 'Approved!'}
              </span>
            </div>
            
            <div className="h-px flex-1 bg-gray-700 mx-2" />
            
            <div className="flex items-center gap-2">
              {approvalStep === 'approving-usd1' ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : approvalStep === 'depositing' ? (
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
              )}
              <span className="text-sm font-medium text-white">
                {approvalStep === 'approving-usd1' && 'Approving USD1...'}
                {approvalStep === 'depositing' && 'Depositing...'}
                {approvalStep !== 'approving-usd1' && approvalStep !== 'depositing' && 'Approve'}
              </span>
            </div>
            
            <div className="h-px flex-1 bg-gray-700 mx-2" />
            
            <div className="flex items-center gap-2">
              {approvalStep === 'depositing' ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
              )}
              <span className="text-sm font-medium text-white">Deposit</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 px-6 py-4 font-medium transition-all duration-200 ${
            activeTab === 'deposit'
              ? 'text-eagle-gold-lightest border-b-2 border-eagle-gold'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 px-6 py-4 font-medium transition-all duration-200 ${
            activeTab === 'withdraw'
              ? 'text-eagle-gold-lightest border-b-2 border-eagle-gold'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Withdraw
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'deposit' ? (
          <div className="space-y-4">
            {/* From Wallet */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-eagle-gold-light font-medium">Amount</label>
                <span className="text-sm text-gray-500">
                  You have {Number(wlfiBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} WLFI
                </span>
              </div>
              
              <div className="relative">
                <input
                  id="wlfi-amount"
                  name="wlfiAmount"
                  type="number"
                  value={wlfiAmount}
                  onChange={(e) => setWlfiAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-eagle-gold/50 focus:ring-1 focus:ring-eagle-gold/50 transition-all"
                />
                <button 
                  onClick={() => setWlfiAmount(wlfiBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 font-medium transition-colors"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">WLFI amount</p>
            </div>

            {/* USD1 Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-eagle-gold-light font-medium">USD1 Amount</label>
                <span className="text-sm text-gray-500">
                  You have {Number(usd1Balance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD1
                </span>
              </div>
              
              <div className="relative">
                <input
                  id="usd1-amount"
                  name="usd1Amount"
                  type="number"
                  value={usd1Amount}
                  onChange={(e) => setUsd1Amount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-eagle-gold/50 focus:ring-1 focus:ring-eagle-gold/50 transition-all"
                />
                <button 
                  onClick={() => setUsd1Amount(usd1Balance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 font-medium transition-colors"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">USD1 stablecoin amount</p>
            </div>

            {/* Deposit Preview - Uses Real Oracle Prices */}
            {(wlfiAmount || usd1Amount) && Number(previewShares) > 0 && (
              <div className="p-4 bg-eagle-gold/5 border border-eagle-gold/20 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">You will receive:</span>
                  <span className="text-white font-semibold">
                    ~{Number(previewShares).toLocaleString(undefined, { maximumFractionDigits: 0 })} vEAGLE
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Estimated value:</span>
                  <span className="text-gray-400">
                    ${previewUsdValue}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">Based on live oracle prices</span>
                </div>
              </div>
            )}

            {/* Arrow */}
            <div className="flex justify-center my-2">
              <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-800">
                <svg className="w-5 h-5 text-eagle-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m0 0l10.89-10.89" />
                </svg>
              </div>
            </div>

            {/* To Vault */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-eagle-gold-light font-medium">To vault</label>
                <span className="text-sm text-gray-500">You will receive</span>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                    alt="vEAGLE"
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-white font-medium">vEAGLE</span>
                </div>
              </div>
            </div>

            {/* Deposit Button */}
            <button
              onClick={handleDeposit}
              disabled={loading || (!wlfiAmount && !usd1Amount)}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
            >
              {loading ? 'Depositing...' : 'Deposit and Stake'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-eagle-gold-light font-medium">Amount</label>
                <span className="text-sm text-gray-500">
                  Available: {Number(vEagleBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} vEAGLE
                </span>
              </div>
              
              <div className="relative">
                <input
                  id="withdraw-amount"
                  name="withdrawAmount"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-eagle-gold/50 focus:ring-1 focus:ring-eagle-gold/50 transition-all"
                />
                <button 
                  onClick={() => setWithdrawAmount(vEagleBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 font-medium transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading || !withdrawAmount}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
            >
              {loading ? 'Withdrawing...' : 'Claim + Exit'}
            </button>
          </div>
        )}

      </div>
    </div>
    </>
  );
}

