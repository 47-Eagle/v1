import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits, formatEther } from 'ethers';
import { motion } from 'framer-motion';
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

type InfoTab = 'about' | 'strategies' | 'info';

export default function VaultView({ provider, account, onToast, onNavigateUp }: Props) {
  const [depositTab, setDepositTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [infoTab, setInfoTab] = useState<InfoTab>('about');
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
      <div className="container mx-auto px-8 py-6 pb-20 max-w-6xl">
        {/* Back Button */}
        <motion.button 
          onClick={onNavigateUp}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="text-sm">Back to Home</span>
        </motion.button>

        {/* Header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
            alt="vEAGLE"
            className="w-14 h-14 mx-auto mb-3"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Eagle vEAGLE Vault</h1>
          <p className="text-gray-500 text-sm">
            {CONTRACTS.VAULT.slice(0, 6)}...{CONTRACTS.VAULT.slice(-4)} • Ethereum
          </p>
        </motion.div>

        {/* Network Badges */}
        <motion.div 
          className="flex justify-center gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2">
            <span className="text-sm text-gray-400">vEAGLE</span>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2">
            <span className="text-sm text-gray-400">Ethereum</span>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div 
          className="grid grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Total Deposited</div>
            <div className="text-2xl font-bold text-white">${tvl.toFixed(2)}</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Historical APY</div>
            <div className="text-2xl font-bold text-white">22.25%</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Your Position</div>
            <div className="text-2xl font-bold text-white">{userVaultValue.toFixed(2)}</div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Max Supply</div>
            <div className="text-2xl font-bold text-white">50M</div>
          </div>
        </motion.div>

        {/* Main Grid - Info Left (larger), Deposit/Withdraw Right (smaller) */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left - Info Sidebar (2/3 width) */}
          <motion.div 
            className="lg:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
          {/* Content - No tabs, just stacked info */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">About</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Deposit WLFI and USD1 to earn yield through automated strategies on Uniswap V3 via{' '}
                <a href="https://worldlibertyfinancial.com/" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
                  World Liberty Financial
                </a>.
              </p>
            </div>

            {/* Strategy */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Strategy</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Protocol</span>
                  <span className="text-white">Charm Finance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="text-white">Auto LP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pool</span>
                  <span className="text-white">WLFI/USD1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee Tier</span>
                  <span className="text-white">1%</span>
                </div>
              </div>
            </div>

            {/* Fees */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Fees</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Deposit</span>
                  <span className="text-white">0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Withdrawal</span>
                  <span className="text-white">0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Performance</span>
                  <span className="text-white">10%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Management</span>
                  <span className="text-white">2% yearly</span>
                </div>
              </div>
            </div>

            {/* APY Breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">APY Breakdown</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Weekly</span>
                  <span className="text-white">32.39%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly</span>
                  <span className="text-white">22.25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Inception</span>
                  <span className="text-white">117.92%</span>
                </div>
              </div>
            </div>

            {/* Contracts */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Contracts</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-gray-500 mb-1">Vault</div>
                  <a 
                    href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-500 hover:underline break-all"
                  >
                    {CONTRACTS.VAULT.slice(0, 10)}...{CONTRACTS.VAULT.slice(-8)}
                  </a>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Strategy</div>
                  <a 
                    href={`https://etherscan.io/address/${CONTRACTS.STRATEGY}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-500 hover:underline break-all"
                  >
                    {CONTRACTS.STRATEGY.slice(0, 10)}...{CONTRACTS.STRATEGY.slice(-8)}
                  </a>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Resources</h3>
              <div className="space-y-2">
                <a 
                  href="https://docs.47eagle.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <span>Documentation</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a 
                  href="https://t.me/Eagle_community_47" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <span>Community</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

          {/* Right - Deposit/Withdraw Card (1/3 width) */}
          <motion.div 
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
          {/* Tabs */}
          <div className="border-b border-[#2a2a2a]">
            <div className="flex">
              <button
                onClick={() => setDepositTab('deposit')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  depositTab === 'deposit'
                    ? 'text-white border-b-2 border-yellow-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setDepositTab('withdraw')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  depositTab === 'withdraw'
                    ? 'text-white border-b-2 border-yellow-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {depositTab === 'deposit' ? (
              <div className="grid grid-cols-2 gap-6">
                {/* From Wallet */}
                <div>
                  <div className="text-sm text-gray-500 mb-4">From wallet</div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">WLFI</span>
                      <button
                        onClick={() => setWlfiAmount(balances.wlfi)}
                        className="text-xs text-gray-600 hover:text-yellow-500"
                      >
                        Max
                      </button>
                    </div>
                    <input
                      type="number"
                      value={wlfiAmount}
                      onChange={(e) => setWlfiAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {Number(balances.wlfi).toFixed(4)} in wallet
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">USD1</span>
                      <button
                        onClick={() => setUsd1Amount(balances.usd1)}
                        className="text-xs text-gray-600 hover:text-yellow-500"
                      >
                        Max
                      </button>
                    </div>
                    <input
                      type="number"
                      value={usd1Amount}
                      onChange={(e) => setUsd1Amount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {Number(balances.usd1).toFixed(4)} in wallet
                    </div>
                  </div>
                </div>

                {/* To Vault */}
                <div>
                  <div className="text-sm text-gray-500 mb-4">To vault</div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-4 h-full">
                    <div className="text-sm text-gray-400 mb-2">You will receive</div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {(Number(wlfiAmount || 0) + Number(usd1Amount || 0)).toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-600">vEAGLE shares</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {/* From Vault */}
                <div>
                  <div className="text-sm text-gray-500 mb-4">From vault</div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">vEAGLE</span>
                      <button
                        onClick={() => setWithdrawShares(balances.vEagle)}
                        className="text-xs text-gray-600 hover:text-yellow-500"
                      >
                        Max
                      </button>
                    </div>
                    <input
                      type="number"
                      value={withdrawShares}
                      onChange={(e) => setWithdrawShares(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {Number(balances.vEagle).toFixed(4)} in vault
                    </div>
                  </div>
                </div>

                {/* You will receive */}
                <div>
                  <div className="text-sm text-gray-500 mb-4">You will receive</div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">WLFI</span>
                        <span className="text-sm text-white font-medium">
                          {(Number(withdrawShares || 0) * 0.5).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">USD1</span>
                        <span className="text-sm text-white font-medium">
                          {(Number(withdrawShares || 0) * 0.5).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={depositTab === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={isLoading || (depositTab === 'deposit' ? (!wlfiAmount && !usd1Amount) : !withdrawShares)}
              className="w-full mt-6 py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold rounded transition-colors"
            >
              {isLoading ? 'Processing...' : depositTab === 'deposit' ? 'Deposit' : 'Withdraw'}
            </button>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
