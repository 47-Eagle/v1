import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { motion } from 'framer-motion';
import { CONTRACTS } from '../config/contracts';

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function depositDual(uint256 wlfiAmount, uint256 usd1Amount, address receiver) returns (uint256)',
  'function withdrawDual(uint256 shares, address receiver) returns (uint256, uint256)',
  'function getWLFIPrice() view returns (uint256)',
  'function getUSD1Price() view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
];

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
  onNavigateUp?: () => void;
}

export default function VaultView({ provider, account, onToast, onNavigateUp }: Props) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [infoTab, setInfoTab] = useState<'about' | 'strategies' | 'info'>('about');
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    totalAssets: '0',
    totalSupply: '0',
    userBalance: '0',
    wlfiBalance: '0',
    usd1Balance: '0',
    wlfiPrice: '0.132',
    usd1Price: '1.000',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!provider) return;

      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, provider);
        const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, provider);

        const [totalAssets, totalSupply, wlfiPrice, usd1Price] = await Promise.all([
          vault.totalAssets(),
          vault.totalSupply(),
          vault.getWLFIPrice(),
          vault.getUSD1Price(),
        ]);

        let userBalance = '0';
        let wlfiBalance = '0';
        let usd1Balance = '0';

        if (account) {
          const [vEagle, wlfiBal, usd1Bal] = await Promise.all([
            vault.balanceOf(account),
            wlfi.balanceOf(account),
            usd1.balanceOf(account),
          ]);
          userBalance = formatEther(vEagle);
          wlfiBalance = formatEther(wlfiBal);
          usd1Balance = formatEther(usd1Bal);
        }

        setData({
          totalAssets: formatEther(totalAssets),
          totalSupply: formatEther(totalSupply),
          userBalance,
          wlfiBalance,
          usd1Balance,
          wlfiPrice: Number(formatEther(wlfiPrice)).toFixed(3),
          usd1Price: Number(formatEther(usd1Price)).toFixed(3),
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [provider, account]);

  const handleDeposit = async () => {
    if (!provider || !account) {
      onToast({ message: 'Connect wallet to deposit', type: 'error' });
      return;
    }

    if (!wlfiAmount && !usd1Amount) {
      onToast({ message: 'Enter deposit amount', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wlfiAmt = wlfiAmount ? parseEther(wlfiAmount) : 0n;
      const usd1Amt = usd1Amount ? parseEther(usd1Amount) : 0n;

      // Approve if needed
      if (wlfiAmt > 0n) {
        const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, signer);
        const allowance = await wlfi.allowance(account, CONTRACTS.VAULT);
        if (allowance < wlfiAmt) {
          const tx = await wlfi.approve(CONTRACTS.VAULT, wlfiAmt);
          await tx.wait();
        }
      }

      if (usd1Amt > 0n) {
        const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, signer);
        const allowance = await usd1.allowance(account, CONTRACTS.VAULT);
        if (allowance < usd1Amt) {
          const tx = await usd1.approve(CONTRACTS.VAULT, usd1Amt);
          await tx.wait();
        }
      }

      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const tx = await vault.depositDual(wlfiAmt, usd1Amt, account);
      onToast({ message: 'Depositing...', type: 'info', txHash: tx.hash });

      await tx.wait();
      onToast({ message: '✅ Deposit successful!', type: 'success', txHash: tx.hash });

      setWlfiAmount('');
      setUsd1Amount('');
    } catch (error: any) {
      console.error('Deposit error:', error);
      onToast({ message: error.message || 'Deposit failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!provider || !account) {
      onToast({ message: 'Connect wallet to withdraw', type: 'error' });
      return;
    }

    if (!withdrawAmount) {
      onToast({ message: 'Enter withdrawal amount', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);

      const shares = parseEther(withdrawAmount);
      const tx = await vault.withdrawDual(shares, account);
      onToast({ message: 'Withdrawing...', type: 'info', txHash: tx.hash });

      await tx.wait();
      onToast({ message: '✅ Withdrawal successful!', type: 'success', txHash: tx.hash });

      setWithdrawAmount('');
    } catch (error: any) {
      console.error('Withdraw error:', error);
      onToast({ message: error.message || 'Withdrawal failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-12">
        {/* Back Button */}
        {onNavigateUp ? (
          <button 
            onClick={onNavigateUp}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-6 transition-colors text-sm inline-flex"
          >
            <svg className="w-4 h-4 -rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Back to Home
          </button>
        ) : (
          <Link 
            to="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-6 transition-colors text-sm inline-flex"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to vaults
          </Link>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
            alt="vEAGLE"
            className="w-16 h-16 rounded-2xl"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">Eagle Vault</h1>
            <p className="text-sm text-gray-500">{CONTRACTS.VAULT}</p>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-xs text-gray-400">vEAGLE</span>
            </div>
            <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-xs text-gray-400">Ethereum</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Total deposited</div>
            <div className="text-3xl font-bold text-white mb-1">
              {Number(data.totalAssets).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-600">${Number(data.totalAssets).toFixed(2)}</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Historical APY</div>
            <div className="text-3xl font-bold text-white">22.22%</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Your position</div>
            <div className="text-3xl font-bold text-white">
              {account ? Number(data.userBalance).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-gray-600">
              {account ? `${Number(data.userBalance).toLocaleString()} vEAGLE` : 'Connect wallet'}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Deposit/Withdraw */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'deposit'
                      ? 'text-white bg-white/5 border-b-2 border-yellow-500'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'withdraw'
                      ? 'text-white bg-white/5 border-b-2 border-yellow-500'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'deposit' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">From wallet</p>
                    
                    {/* WLFI Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">WLFI</label>
                        <button
                          onClick={() => setWlfiAmount(data.wlfiBalance)}
                          className="text-xs text-gray-600 hover:text-yellow-500"
                        >
                          {Number(data.wlfiBalance).toFixed(4)}
                        </button>
                      </div>
                      <input
                        type="number"
                        value={wlfiAmount}
                        onChange={(e) => setWlfiAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>

                    {/* USD1 Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">USD1</label>
                        <button
                          onClick={() => setUsd1Amount(data.usd1Balance)}
                          className="text-xs text-gray-600 hover:text-yellow-500"
                        >
                          {Number(data.usd1Balance).toFixed(4)}
                        </button>
                      </div>
                      <input
                        type="number"
                        value={usd1Amount}
                        onChange={(e) => setUsd1Amount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>

                    {/* Deposit Button */}
                    <button
                      onClick={handleDeposit}
                      disabled={loading || !account || (!wlfiAmount && !usd1Amount)}
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold rounded-lg transition-colors"
                    >
                      {loading ? 'Depositing...' : !account ? 'Connect Wallet' : 'Deposit'}
                    </button>

                    {/* Preview */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-xs text-gray-500 mb-2">You will receive</div>
                      <div className="flex items-center gap-2">
                        <img 
                          src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                          alt="vEAGLE"
                          className="w-6 h-6"
                        />
                        <div>
                          <div className="text-white font-semibold">vEAGLE</div>
                          <div className="text-xs text-gray-500">Vault Shares</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">To wallet</p>
                    
                    {/* vEAGLE Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">vEAGLE</label>
                        <button
                          onClick={() => setWithdrawAmount(data.userBalance)}
                          className="text-xs text-gray-600 hover:text-yellow-500"
                        >
                          {Number(data.userBalance).toFixed(4)}
                        </button>
                      </div>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>

                    {/* Withdraw Button */}
                    <button
                      onClick={handleWithdraw}
                      disabled={loading || !account || !withdrawAmount}
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold rounded-lg transition-colors"
                    >
                      {loading ? 'Withdrawing...' : !account ? 'Connect Wallet' : 'Withdraw'}
                    </button>

                    {/* Preview */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-xs text-gray-500 mb-2">You will receive</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">WLFI</span>
                          <span className="text-white font-medium">~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">USD1</span>
                          <span className="text-white font-medium">~{(Number(withdrawAmount || 0) * 0.5).toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Info Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Tab Headers */}
              <div className="border-b border-white/10 px-6">
                <div className="flex gap-6">
                  <button
                    onClick={() => setInfoTab('about')}
                    className={`py-4 text-sm font-medium transition-colors ${
                      infoTab === 'about'
                        ? 'text-white border-b-2 border-yellow-500'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    About
                  </button>
                  <button
                    onClick={() => setInfoTab('strategies')}
                    className={`py-4 text-sm font-medium transition-colors ${
                      infoTab === 'strategies'
                        ? 'text-white border-b-2 border-yellow-500'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Strategies
                  </button>
                  <button
                    onClick={() => setInfoTab('info')}
                    className={`py-4 text-sm font-medium transition-colors ${
                      infoTab === 'info'
                        ? 'text-white border-b-2 border-yellow-500'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Info
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {infoTab === 'about' && (
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-white font-semibold mb-3">Description</h3>
                      <p className="text-sm text-gray-400 leading-relaxed mb-6">
                        Deposit your{' '}
                        <a href="https://worldlibertyfinancial.com/" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
                          WLFI
                        </a>{' '}
                        and{' '}
                        <a href="https://worldlibertyfinancial.com/usd1" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
                          USD1
                        </a>{' '}
                        into Eagle's auto-compounding vault and start earning yield immediately.
                      </p>

                      <h3 className="text-white font-semibold mb-3">Vault Fees</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Deposit/Withdrawal fee</span>
                          <span className="text-white">0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Management fee</span>
                          <span className="text-white">0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Performance fee</span>
                          <span className="text-white">10%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-white font-semibold mb-3">APY</h3>
                      <div className="space-y-2 text-sm mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Weekly APY</span>
                          <span className="text-white">32.27%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Monthly APY</span>
                          <span className="text-white">22.22%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Inception APY</span>
                          <span className="text-white">117.91%</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10">
                          <span className="text-gray-300 font-medium">Net APY</span>
                          <span className="text-yellow-500 font-semibold">22.22%</span>
                        </div>
                      </div>

                      <h3 className="text-white font-semibold mb-3">Cumulative Earnings</h3>
                      <div className="bg-black/40 border border-white/10 rounded-lg p-4 h-32">
                        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="line" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
                            </linearGradient>
                          </defs>
                          <polyline
                            points="0,30 20,25 40,22 60,18 80,12 100,8"
                            fill="none"
                            stroke="url(#line)"
                            strokeWidth="1"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {infoTab === 'strategies' && (
                  <div>
                    <h3 className="text-white font-semibold mb-4">Active Strategies</h3>
                    <div className="bg-black/40 border border-white/10 rounded-lg p-6">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Protocol</span>
                          <span className="text-white">Charm Finance</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type</span>
                          <span className="text-white">Automated Uniswap V3 LP</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pool</span>
                          <span className="text-white">WLFI/USD1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fee Tier</span>
                          <span className="text-white">1%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Allocation</span>
                          <span className="text-white">100%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-emerald-400">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="text-white text-sm font-semibold mb-3">Strategy Description</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        This strategy provides concentrated liquidity to the WLFI/USD1 pool on Uniswap V3 through 
                        Charm Finance's AlphaVault. Automated rebalancing maximizes fee earnings while managing impermanent loss.
                      </p>
                    </div>
                  </div>
                )}

                {infoTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-white font-semibold mb-4">Vault Info</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Version</span>
                          <span className="text-white">0.4.6</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Vault Contract</span>
                          <a 
                            href={`https://etherscan.io/address/${CONTRACTS.VAULT}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-500 hover:underline text-xs"
                          >
                            {CONTRACTS.VAULT.slice(0, 6)}...{CONTRACTS.VAULT.slice(-4)}
                          </a>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Strategy Contract</span>
                          <a 
                            href={`https://etherscan.io/address/${CONTRACTS.STRATEGY}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-500 hover:underline text-xs"
                          >
                            {CONTRACTS.STRATEGY.slice(0, 6)}...{CONTRACTS.STRATEGY.slice(-4)}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-white font-semibold mb-3">Resources</h3>
                      <div className="space-y-2">
                        <a 
                          href="https://docs.47eagle.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-yellow-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Documentation
                        </a>
                        <a 
                          href="https://t.me/Eagle_community_47" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-yellow-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          Telegram Community
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
