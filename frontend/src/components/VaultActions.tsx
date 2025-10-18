import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther, formatUnits, MaxUint256 } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import TransactionSimulator from './TransactionSimulator';

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
    if (!provider || !wlfiAmount || !usd1Amount) return;

    setShowSimulator(false);
    setLoading(true);
    setApprovalStep('checking');
    
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, signer);
      const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, signer);

      const wlfiWei = parseEther(wlfiAmount);
      const usd1Wei = parseEther(usd1Amount); // USD1 is 18 decimals (verified on Etherscan)

      // Check and approve WLFI if needed
      const wlfiAllowance = await wlfi.allowance(account, CONTRACTS.VAULT);
      if (wlfiAllowance < wlfiWei) {
        setApprovalStep('approving-wlfi');
        onToast({ message: 'Approving WLFI...', type: 'info' });
        const maxApproval = MaxUint256; // Approve max to avoid future approvals
        const wlfiApproveTx = await wlfi.approve(CONTRACTS.VAULT, maxApproval);
        await wlfiApproveTx.wait();
        onToast({ message: 'WLFI approved!', type: 'success' });
      }
      
      // Check and approve USD1 if needed
      if (Number(usd1Amount) > 0) {
        const usd1Allowance = await usd1.allowance(account, CONTRACTS.VAULT);
        if (usd1Allowance < usd1Wei) {
          setApprovalStep('approving-usd1');
          onToast({ message: 'Approving USD1...', type: 'info' });
          const maxApproval = MaxUint256;
          const usd1ApproveTx = await usd1.approve(CONTRACTS.VAULT, maxApproval);
          await usd1ApproveTx.wait();
          onToast({ message: 'USD1 approved!', type: 'success' });
        }
      }

      setApprovalStep('depositing');
      onToast({ message: 'Depositing to vault...', type: 'info' });
      const depositTx = await vault.depositDual(wlfiWei, usd1Wei, account);
      const receipt = await depositTx.wait();

      onToast({ 
        message: 'Deposit successful! You received vEAGLE shares', 
        type: 'success',
        txHash: receipt?.hash 
      });
      setWlfiAmount('');
      setUsd1Amount('');
    } catch (error: any) {
      onToast({ message: `Deposit failed: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
      setApprovalStep('idle');
    }
  };

  const handleDeposit = () => {
    if (!wlfiAmount || !usd1Amount) return;
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
    <div className="bg-[#0a0a0a]/60 rounded-xl border border-eagle-gold/30 backdrop-blur-md mb-6">
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
              disabled={loading || !wlfiAmount || !usd1Amount}
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
  );
}

