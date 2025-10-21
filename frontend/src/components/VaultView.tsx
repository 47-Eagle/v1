import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits, formatEther } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { CONTRACTS } from '../config/contracts';

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function deposit(uint256 wlfiAmount, uint256 usd1Amount, address receiver) returns (uint256)',
  'function withdraw(uint256 shares, address receiver, address owner) returns (uint256, uint256)',
  'function previewDeposit(uint256 wlfiAmount, uint256 usd1Amount) view returns (uint256)',
  'function previewWithdraw(uint256 shares) view returns (uint256, uint256)',
];

const TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
  onNavigateUp: () => void;
}

export default function VaultView({ provider, account, onToast, onNavigateUp }: Props) {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [balances, setBalances] = useState({
    wlfi: '0',
    usd1: '0',
    vEagle: '0',
    totalAssets: '0',
    totalSupply: '0',
  });

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!provider || !account) return;
      
      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const wlfi = new Contract(CONTRACTS.WLFI, TOKEN_ABI, provider);
        const usd1 = new Contract(CONTRACTS.USD1, TOKEN_ABI, provider);

        const [wlfiBal, usd1Bal, vEagleBal, totalAssets, totalSupply] = await Promise.all([
          wlfi.balanceOf(account),
          usd1.balanceOf(account),
          vault.balanceOf(account),
          vault.totalAssets(),
          vault.totalSupply(),
        ]);

        setBalances({
          wlfi: formatEther(wlfiBal),
          usd1: formatUnits(usd1Bal, 18),
          vEagle: formatEther(vEagleBal),
          totalAssets: formatEther(totalAssets),
          totalSupply: formatEther(totalSupply),
        });
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [provider, account]);

  const handleDeposit = async () => {
    if (!provider || !account) {
      onToast({ message: 'Please connect your wallet', type: 'error' });
      return;
    }

    if (!wlfiAmount && !usd1Amount) {
      onToast({ message: 'Please enter an amount', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      
      const wlfiAmt = wlfiAmount ? parseUnits(wlfiAmount, 18) : 0n;
      const usd1Amt = usd1Amount ? parseUnits(usd1Amount, 18) : 0n;

      // Approve tokens if needed
      if (wlfiAmt > 0n) {
        const wlfi = new Contract(CONTRACTS.WLFI, TOKEN_ABI, signer);
        const allowance = await wlfi.allowance(account, CONTRACTS.VAULT);
        if (allowance < wlfiAmt) {
          const approveTx = await wlfi.approve(CONTRACTS.VAULT, wlfiAmt);
          await approveTx.wait();
        }
      }

      if (usd1Amt > 0n) {
        const usd1 = new Contract(CONTRACTS.USD1, TOKEN_ABI, signer);
        const allowance = await usd1.allowance(account, CONTRACTS.VAULT);
        if (allowance < usd1Amt) {
          const approveTx = await usd1.approve(CONTRACTS.VAULT, usd1Amt);
          await approveTx.wait();
        }
      }

      const tx = await vault.deposit(wlfiAmt, usd1Amt, account);
      onToast({ message: 'Depositing...', type: 'info', txHash: tx.hash });
      
      const receipt = await tx.wait();
      onToast({ message: 'Deposit successful!', type: 'success', txHash: receipt.hash });
      
      setWlfiAmount('');
      setUsd1Amount('');
    } catch (error: any) {
      console.error('Deposit error:', error);
      onToast({ message: error.message || 'Deposit failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!provider || !account) {
      onToast({ message: 'Please connect your wallet', type: 'error' });
      return;
    }

    if (!withdrawShares) {
      onToast({ message: 'Please enter shares amount', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      
      const shares = parseUnits(withdrawShares, 18);
      const tx = await vault.withdraw(shares, account, account);
      
      onToast({ message: 'Withdrawing...', type: 'info', txHash: tx.hash });
      const receipt = await tx.wait();
      onToast({ message: 'Withdrawal successful!', type: 'success', txHash: receipt.hash });
      
      setWithdrawShares('');
    } catch (error: any) {
      console.error('Withdraw error:', error);
      onToast({ message: error.message || 'Withdrawal failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const tvl = Number(balances.totalAssets);
  const userVaultValue = Number(balances.vEagle);
  const sharePrice = tvl > 0 && Number(balances.totalSupply) > 0 
    ? tvl / Number(balances.totalSupply) 
    : 1;

  return (
    <div className="h-full bg-[#0a0a0a] overflow-y-auto">
      <div className="container mx-auto px-8 py-8 max-w-6xl">
        {/* Back Button */}
        <motion.button 
          onClick={onNavigateUp}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="text-sm">Back to Home</span>
        </motion.button>

        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-3">
            <img 
              src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
              alt="vEAGLE"
              className="w-12 h-12"
            />
            <h1 className="text-4xl font-bold text-white">vEAGLE Vault</h1>
          </div>
          <p className="text-gray-400">
            Deposit WLFI + USD1 to earn yield through automated strategies
          </p>
        </motion.div>

        {/* Stats Row - Yearn Style */}
        <motion.div 
          className="grid grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="text-sm text-gray-500 mb-1">Total Assets</div>
            <div className="text-2xl font-semibold text-white">${tvl.toFixed(2)}</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="text-sm text-gray-500 mb-1">Share Price</div>
            <div className="text-2xl font-semibold text-white">${sharePrice.toFixed(4)}</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="text-sm text-gray-500 mb-1">APY</div>
            <div className="text-2xl font-semibold text-yellow-500">22.22%</div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left - Deposit/Withdraw */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
              {/* Tabs */}
              <div className="border-b border-[#2a2a2a] p-1">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTab('deposit')}
                    className={`flex-1 py-3 px-4 text-sm font-medium rounded transition-colors ${
                      tab === 'deposit'
                        ? 'bg-[#2a2a2a] text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setTab('withdraw')}
                    className={`flex-1 py-3 px-4 text-sm font-medium rounded transition-colors ${
                      tab === 'withdraw'
                        ? 'bg-[#2a2a2a] text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {/* Deposit */}
                  {tab === 'deposit' && (
                    <motion.div
                      key="deposit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      {/* Your Balance */}
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-3">Your Wallet Balance</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">WLFI</div>
                            <div className="text-lg font-medium text-white">{Number(balances.wlfi).toFixed(4)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">USD1</div>
                            <div className="text-lg font-medium text-white">{Number(balances.usd1).toFixed(4)}</div>
                          </div>
                        </div>
                      </div>

                      {/* WLFI Input */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm text-gray-400">WLFI Amount</label>
                          <button
                            onClick={() => setWlfiAmount(balances.wlfi)}
                            className="text-xs text-gray-500 hover:text-yellow-500 transition-colors"
                          >
                            Max
                          </button>
                        </div>
                        <input
                          type="number"
                          value={wlfiAmount}
                          onChange={(e) => setWlfiAmount(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        />
                      </div>

                      {/* USD1 Input */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm text-gray-400">USD1 Amount</label>
                          <button
                            onClick={() => setUsd1Amount(balances.usd1)}
                            className="text-xs text-gray-500 hover:text-yellow-500 transition-colors"
                          >
                            Max
                          </button>
                        </div>
                        <input
                          type="number"
                          value={usd1Amount}
                          onChange={(e) => setUsd1Amount(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        />
                      </div>

                      {/* Expected vEAGLE */}
                      {(wlfiAmount || usd1Amount) && (
                        <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">You will receive</span>
                            <span className="text-lg font-semibold text-yellow-500">
                              ~{(Number(wlfiAmount || 0) + Number(usd1Amount || 0)).toFixed(4)} vEAGLE
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Deposit Button */}
                      <button
                        onClick={handleDeposit}
                        disabled={isLoading || (!wlfiAmount && !usd1Amount)}
                        className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold rounded-lg transition-colors"
                      >
                        {isLoading ? 'Processing...' : 'Deposit'}
                      </button>
                    </motion.div>
                  )}

                  {/* Withdraw */}
                  {tab === 'withdraw' && (
                    <motion.div
                      key="withdraw"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      {/* Your Position */}
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Your Position</div>
                        <div className="text-2xl font-semibold text-white">{userVaultValue.toFixed(4)} vEAGLE</div>
                        <div className="text-sm text-gray-600 mt-1">
                          ≈ ${(userVaultValue * sharePrice).toFixed(2)}
                        </div>
                      </div>

                      {/* vEAGLE Input */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm text-gray-400">vEAGLE Amount</label>
                          <button
                            onClick={() => setWithdrawShares(balances.vEagle)}
                            className="text-xs text-gray-500 hover:text-yellow-500 transition-colors"
                          >
                            Max
                          </button>
                        </div>
                        <input
                          type="number"
                          value={withdrawShares}
                          onChange={(e) => setWithdrawShares(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        />
                      </div>

                      {/* Expected Output */}
                      {withdrawShares && (
                        <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-3">You will receive (approx)</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">WLFI</span>
                              <span className="text-sm font-semibold text-white">~{(Number(withdrawShares) * 0.5).toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">USD1</span>
                              <span className="text-sm font-semibold text-white">~{(Number(withdrawShares) * 0.5).toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Withdraw Button */}
                      <button
                        onClick={handleWithdraw}
                        disabled={isLoading || !withdrawShares}
                        className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold rounded-lg transition-colors"
                      >
                        {isLoading ? 'Processing...' : 'Withdraw'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Right - Info */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Description */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-white mb-3">About</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                This vault accepts WLFI and USD1 deposits, automatically deploying assets to yield-generating strategies on Uniswap V3 via Charm Finance.
              </p>
            </div>

            {/* Strategy */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Strategy</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Protocol</span>
                  <span className="text-gray-300">Charm Finance</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="text-gray-300">Automated LP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pool</span>
                  <span className="text-gray-300">WLFI/USD1</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fee Tier</span>
                  <span className="text-gray-300">1%</span>
                </div>
              </div>
            </div>

            {/* Fees */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Deposit</span>
                  <span className="text-gray-300">0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Withdrawal</span>
                  <span className="text-gray-300">0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Performance</span>
                  <span className="text-gray-300">10%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Management</span>
                  <span className="text-gray-300">2% yearly</span>
                </div>
              </div>
            </div>

            {/* Contract */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Contract</h3>
              <a 
                href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-yellow-500 transition-colors break-all"
              >
                {CONTRACTS.VAULT}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
