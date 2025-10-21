import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEthersProvider } from './hooks/useEthersProvider';
import Toast from './components/Toast';
import { CONTRACTS } from './config/contracts';

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function getWLFIPrice() view returns (uint256)',
  'function getUSD1Price() view returns (uint256)',
  'function depositDual(uint256 wlfiAmount, uint256 usd1Amount, address receiver) returns (uint256)',
  'function withdrawDual(uint256 shares, address receiver) returns (uint256, uint256)',
  'function previewDepositDual(uint256 wlfiAmount, uint256 usd1Amount) view returns (uint256 shares, uint256 usdValue)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const STRATEGY_ABI = [
  'function getTotalAmounts() view returns (uint256, uint256)',
];

function AppModern() {
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const provider = useEthersProvider();

  // UI State
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [infoTab, setInfoTab] = useState<'about' | 'strategies' | 'info'>('about');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; txHash?: string } | null>(null);

  // Form State
  const [wlfiAmount, setWlfiAmount] = useState('');
  const [usd1Amount, setUsd1Amount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Data State
  const [stats, setStats] = useState({
    totalAssets: '0',
    totalSupply: '0',
    userBalance: '0',
    userValue: '0',
    wlfiPrice: '0.132',
    usd1Price: '1.000',
    wlfiBalance: '0',
    usd1Balance: '0',
    strategyWlfi: '0',
    strategyUsd1: '0',
    expectedShares: '0',
  });

  const wrongNetwork = isConnected && chainId !== 1;

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!provider) return;

      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const strategy = new Contract(CONTRACTS.STRATEGY, STRATEGY_ABI, provider);

        const [totalAssets, totalSupply, wlfiPrice, usd1Price, stratAmounts] = await Promise.all([
          vault.totalAssets(),
          vault.totalSupply(),
          vault.getWLFIPrice(),
          vault.getUSD1Price(),
          strategy.getTotalAmounts(),
        ]);

        let userBalance = '0';
        let userValue = '0';
        let wlfiBalance = '0';
        let usd1Balance = '0';

        if (account) {
          const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, provider);
          const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, provider);

          const [vEagle, wlfiBal, usd1Bal] = await Promise.all([
            vault.balanceOf(account),
            wlfi.balanceOf(account),
            usd1.balanceOf(account),
          ]);

          userBalance = formatEther(vEagle);
          userValue = (Number(formatEther(vEagle)) / 80000).toFixed(2);
          wlfiBalance = formatEther(wlfiBal);
          usd1Balance = formatEther(usd1Bal);
        }

        setStats({
          totalAssets: formatEther(totalAssets),
          totalSupply: formatEther(totalSupply),
          userBalance,
          userValue,
          wlfiPrice: Number(formatEther(wlfiPrice)).toFixed(3),
          usd1Price: Number(formatEther(usd1Price)).toFixed(3),
          wlfiBalance,
          usd1Balance,
          strategyWlfi: formatEther(stratAmounts[0]),
          strategyUsd1: formatEther(stratAmounts[1]),
          expectedShares: '0',
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [provider, account]);

  // Calculate expected shares
  useEffect(() => {
    const calculate = async () => {
      if (!provider || (!wlfiAmount && !usd1Amount)) {
        setStats(prev => ({ ...prev, expectedShares: '0' }));
        return;
      }

      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const wlfi = wlfiAmount ? parseEther(wlfiAmount) : 0n;
        const usd1 = usd1Amount ? parseEther(usd1Amount) : 0n;
        
        const [shares] = await vault.previewDepositDual(wlfi, usd1);
        setStats(prev => ({ ...prev, expectedShares: formatEther(shares) }));
      } catch (error) {
        setStats(prev => ({ ...prev, expectedShares: '0' }));
      }
    };

    calculate();
  }, [provider, wlfiAmount, usd1Amount]);

  const handleDeposit = async () => {
    if (!provider || !account) {
      setToast({ message: 'Please connect your wallet', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const signer = await provider.getSigner();
      
      const wlfiAmt = wlfiAmount ? parseEther(wlfiAmount) : 0n;
      const usd1Amt = usd1Amount ? parseEther(usd1Amount) : 0n;

      // Approve tokens if needed
      if (wlfiAmt > 0n) {
        const wlfi = new Contract(CONTRACTS.WLFI, ERC20_ABI, signer);
        const allowance = await wlfi.allowance(account, CONTRACTS.VAULT);
        if (allowance < wlfiAmt) {
          setToast({ message: 'Approving WLFI...', type: 'info' });
          const tx = await wlfi.approve(CONTRACTS.VAULT, wlfiAmt);
          await tx.wait();
        }
      }

      if (usd1Amt > 0n) {
        const usd1 = new Contract(CONTRACTS.USD1, ERC20_ABI, signer);
        const allowance = await usd1.allowance(account, CONTRACTS.VAULT);
        if (allowance < usd1Amt) {
          setToast({ message: 'Approving USD1...', type: 'info' });
          const tx = await usd1.approve(CONTRACTS.VAULT, usd1Amt);
          await tx.wait();
        }
      }

      // Deposit
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const tx = await vault.depositDual(wlfiAmt, usd1Amt, account);
      setToast({ message: 'Depositing...', type: 'info', txHash: tx.hash });

      await tx.wait();
      setToast({ message: '✅ Deposit successful!', type: 'success', txHash: tx.hash });

      setWlfiAmount('');
      setUsd1Amount('');
    } catch (error: any) {
      console.error('Deposit error:', error);
      setToast({ message: error.message || 'Deposit failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!provider || !account) {
      setToast({ message: 'Please connect your wallet', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, signer);

      const shares = parseEther(withdrawAmount);
      const tx = await vault.withdrawDual(shares, account);
      setToast({ message: 'Withdrawing...', type: 'info', txHash: tx.hash });

      await tx.wait();
      setToast({ message: '✅ Withdrawal successful!', type: 'success', txHash: tx.hash });

      setWithdrawAmount('');
    } catch (error: any) {
      console.error('Withdraw error:', error);
      setToast({ message: error.message || 'Withdrawal failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]">
      {/* Wrong Network Banner */}
      {wrongNetwork && (
        <div className="bg-gradient-to-r from-red-500/90 to-orange-500/90 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-white font-medium">Wrong Network - Please switch to Ethereum Mainnet</span>
            </div>
            <button
              onClick={() => switchChain({ chainId: 1 })}
              className="px-6 py-2 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100 transition-all"
            >
              Switch Network
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img 
                src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                alt="Eagle Vault"
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-semibold text-white">Eagle Vault</h1>
                <p className="text-xs text-gray-500">Dual-Asset Yield Strategy</p>
              </div>
            </div>

            {/* Price Tickers */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu" 
                  alt="WLFI"
                  className="w-5 h-5"
                />
                <span className="text-sm font-mono text-gray-300">${stats.wlfiPrice}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreic74no55hhm544qjraibffhrb4h7zldae5sfsyipvu6dvfyqubppy" 
                  alt="USD1"
                  className="w-5 h-5"
                />
                <span className="text-sm font-mono text-gray-300">${stats.usd1Price}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-400">Ethereum</span>
              </div>
            </div>

            {/* Connect Button */}
            <ConnectButton 
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Back Button */}
        <button className="flex items-center gap-2 text-gray-400 hover:text-yellow-500 mb-8 transition-colors group">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">Back to vaults</span>
        </button>

        {/* Vault Header */}
        <div className="mb-8">
          <div className="flex items-center gap-5 mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400/20 to-amber-600/20 rounded-2xl border border-yellow-500/20 flex items-center justify-center">
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                  alt="Eagle Vault"
                  className="w-16 h-16"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 flex gap-1">
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu" 
                  alt="WLFI"
                  className="w-8 h-8 rounded-full border-3 border-[#0a0a0a] shadow-lg"
                />
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreic74no55hhm544qjraibffhrb4h7zldae5sfsyipvu6dvfyqubppy" 
                  alt="USD1"
                  className="w-8 h-8 rounded-full border-3 border-[#0a0a0a] shadow-lg"
                />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-5xl font-bold text-white">Eagle Vault</h1>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                  Active
                </span>
              </div>
              <p className="text-gray-400 font-mono text-sm">
                {CONTRACTS.VAULT}
              </p>
            </div>

            <div className="flex gap-2">
              <div className="px-4 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Network</p>
                <p className="text-white font-medium">Ethereum</p>
              </div>
            </div>
          </div>

          {/* Key Metrics - Modern Design */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Deposited */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 p-6">
              <p className="text-sm text-gray-400 mb-2">Total deposited, vEAGLE</p>
              <p className="text-4xl font-bold text-white mb-1">
                {Number(stats.totalAssets).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500">${Number(stats.totalAssets).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            {/* Historical APY */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-2xl border border-yellow-500/20 p-6">
              <p className="text-sm text-gray-400 mb-2">Historical APY</p>
              <p className="text-4xl font-bold text-yellow-400">22.22%</p>
              <p className="text-sm text-yellow-500/60">Net APY after fees</p>
            </div>

            {/* Your Value */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 p-6">
              <p className="text-sm text-gray-400 mb-2">Value in tokens</p>
              <p className="text-4xl font-bold text-white mb-1">${stats.userValue}</p>
              <p className="text-sm text-gray-500">
                {account && Number(stats.userBalance) > 0 
                  ? `${Number(stats.userBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} vEAGLE`
                  : 'Connect wallet'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid - Deposit/Withdraw + Info Tabs */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Deposit/Withdraw */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                    activeTab === 'deposit'
                      ? 'bg-white/10 text-white border-b-2 border-yellow-500'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                    activeTab === 'withdraw'
                      ? 'bg-white/10 text-white border-b-2 border-yellow-500'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'deposit' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">From wallet</p>

                    {/* WLFI Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">WLFI Amount</label>
                        <span className="text-xs text-gray-500">
                          Balance: {Number(stats.wlfiBalance).toFixed(4)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={wlfiAmount}
                          onChange={(e) => setWlfiAmount(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono pr-16"
                        />
                        <button
                          onClick={() => setWlfiAmount(stats.wlfiBalance)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-all font-semibold"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* USD1 Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">USD1 Amount</label>
                        <span className="text-xs text-gray-500">
                          Balance: {Number(stats.usd1Balance).toFixed(4)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={usd1Amount}
                          onChange={(e) => setUsd1Amount(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono pr-16"
                        />
                        <button
                          onClick={() => setUsd1Amount(stats.usd1Balance)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-all font-semibold"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Deposit Button */}
                    <button
                      onClick={handleDeposit}
                      disabled={loading || !account || (!wlfiAmount && !usd1Amount) || wrongNetwork}
                      className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all text-lg shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Depositing...
                        </div>
                      ) : !account ? (
                        'Connect Wallet'
                      ) : (
                        'Deposit'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">To vault</p>

                    {/* Withdraw Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">vEAGLE Amount</label>
                        <span className="text-xs text-gray-500">
                          Balance: {Number(stats.userBalance).toFixed(2)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono pr-16"
                        />
                        <button
                          onClick={() => setWithdrawAmount(stats.userBalance)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-all font-semibold"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Withdraw Button */}
                    <button
                      onClick={handleWithdraw}
                      disabled={loading || !account || !withdrawAmount || wrongNetwork}
                      className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all text-lg shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Withdrawing...
                        </div>
                      ) : !account ? (
                        'Connect Wallet'
                      ) : (
                        'Withdraw'
                      )}
                    </button>
                  </div>
                )}

                {/* Preview Section */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-400 mb-4">You will receive</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <img 
                          src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" 
                          alt="vEAGLE"
                          className="w-6 h-6"
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {activeTab === 'deposit' ? 'vEAGLE' : 'tokens'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activeTab === 'deposit' ? 'Vault Shares' : 'Tokens'}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-mono font-semibold text-white">
                      {activeTab === 'deposit' 
                        ? Number(stats.expectedShares).toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : '0.00'
                      }
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">0.88% ⚡</span>
                      <span className="text-gray-400">0.88%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Info Tabs (Modern Design) */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
              {/* Tab Headers */}
              <div className="flex border-b border-white/10">
                {[
                  { id: 'about' as const, label: 'About' },
                  { id: 'strategies' as const, label: 'Strategies' },
                  { id: 'info' as const, label: 'Info' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setInfoTab(tab.id)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                      infoTab === tab.id
                        ? 'bg-white/10 text-white border-b-2 border-yellow-500'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {infoTab === 'about' && (
                  <div className="space-y-8">
                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
                      <p className="text-gray-400 leading-relaxed">
                        Deposit your vEAGLE into Eagle's auto-compounding vault and start earning the maximum APY immediately. 
                        The vault handles staking, claiming, and swapping your WLFI and USD1 for you. Your deposited vEAGLE 
                        is managed through Charm Finance's AlphaVault strategy, earning Uniswap V3 trading fees on the USD1/WLFI pool.
                      </p>
                      <p className="text-gray-400 leading-relaxed mt-3">
                        For more details about vEAGLE, check out{' '}
                        <a href="https://docs.47eagle.com" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 underline">Eagle's docs</a>.
                      </p>
                    </div>

                    {/* Vault Fees */}
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-4">Vault Fees</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Deposit/Withdrawal fee</span>
                            <span className="text-white font-mono font-semibold">0 %</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Management fee</span>
                            <span className="text-white font-mono font-semibold">0 %</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Performance fee</span>
                            <span className="text-white font-mono font-semibold">10 %</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-4">APY</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Weekly APY</span>
                            <span className="text-white font-mono font-semibold">32.27%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Monthly APY</span>
                            <span className="text-white font-mono font-semibold">22.22%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Inception APY</span>
                            <span className="text-white font-mono font-semibold">117.91%</span>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-white/10">
                            <span className="text-gray-300 font-medium">Net APY</span>
                            <span className="text-yellow-500 font-mono font-bold">22.22%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cumulative Earnings Chart */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-4">Cumulative Earnings</h4>
                      <div className="h-56 bg-white/[0.02] rounded-xl border border-white/10 p-6">
                        <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
                            </linearGradient>
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#eab308" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Area under curve */}
                          <path
                            d="M 0 160 L 0 140 Q 50 120 100 100 T 200 70 T 300 45 T 400 25 L 400 160 Z"
                            fill="url(#areaGradient)"
                          />
                          
                          {/* Line */}
                          <path
                            d="M 0 140 Q 50 120 100 100 T 200 70 T 300 45 T 400 25"
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          
                          {/* Y-axis labels */}
                          <text x="380" y="30" fill="#6b7280" fontSize="11" textAnchor="end">30%</text>
                          <text x="380" y="95" fill="#6b7280" fontSize="11" textAnchor="end">17%</text>
                          <text x="380" y="155" fill="#6b7280" fontSize="11" textAnchor="end">0%</text>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {infoTab === 'strategies' && (
                  <div className="space-y-6">
                    {/* Strategy Card - Charm Finance */}
                    <div className="bg-white/[0.03] rounded-xl border border-white/10 p-6 hover:bg-white/[0.05] transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu" 
                            alt="Charm Finance"
                            className="w-12 h-12 rounded-xl"
                          />
                          <div>
                            <h4 className="font-semibold text-white text-lg">Charm AlphaVault</h4>
                            <p className="text-sm text-gray-400">USD1/WLFI • 1% Fee Tier</p>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                          Active
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Allocation</p>
                          <p className="text-xl font-semibold text-white">100%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Assets Deployed</p>
                          <p className="text-xl font-semibold text-white">
                            ${(
                              Number(stats.strategyWlfi) * Number(stats.wlfiPrice) +
                              Number(stats.strategyUsd1) * Number(stats.usd1Price)
                            ).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Expected APY</p>
                          <p className="text-xl font-semibold text-yellow-500">22.22%</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10 mb-4">
                        <p className="text-sm text-gray-400 mb-2">Strategy Description</p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          Provides concentrated liquidity to the Uniswap V3 WLFI/USD1 1% fee tier pool through 
                          Charm Finance's automated market making strategy. Earns trading fees while maintaining 
                          optimal price ranges for maximum capital efficiency.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <a 
                          href={`https://etherscan.io/address/${CONTRACTS.STRATEGY}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-500 hover:text-yellow-400 flex items-center gap-1.5 transition-colors"
                        >
                          <span>View Strategy</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <span className="text-gray-600">•</span>
                        <a 
                          href={`https://etherscan.io/address/${CONTRACTS.CHARM_VAULT}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-500 hover:text-yellow-400 flex items-center gap-1.5 transition-colors"
                        >
                          <span>View Charm Vault</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    {/* Strategy Update Notice */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm">
                          <p className="text-yellow-400 font-semibold mb-1">✅ Strategy Updated</p>
                          <p className="text-yellow-200/80">
                            New fixed strategy deployed on Oct 21, 2025. Bug fix ensures correct share calculations. All funds safe.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {infoTab === 'info' && (
                  <div className="space-y-6">
                    {/* Contract Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Contract Information</h3>

                      <div className="space-y-1">
                        {[
                          { label: 'Vault Contract', address: CONTRACTS.VAULT },
                          { label: 'Strategy Contract', address: CONTRACTS.STRATEGY },
                          { label: 'Wrapper Contract', address: CONTRACTS.WRAPPER },
                          { label: 'WLFI Token', address: CONTRACTS.WLFI },
                          { label: 'USD1 Token', address: CONTRACTS.USD1 },
                        ].map((item) => (
                          <div key={item.address} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                            <span className="text-gray-400 text-sm">{item.label}</span>
                            <a 
                              href={`https://etherscan.io/address/${item.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-yellow-500 hover:text-yellow-400 font-mono text-sm flex items-center gap-1.5 transition-colors"
                            >
                              {item.address.slice(0, 6)}...{item.address.slice(-4)}
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Protocol Integrations */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Protocols</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { name: 'Uniswap V3', role: 'DEX', icon: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreichw4b4wxvinfu4dmkloxajj4mm7672k6q3nyqzvdnvogvlbbycfq' },
                          { name: 'Charm Finance', role: 'Vault Manager', icon: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu' },
                          { name: 'LayerZero V2', role: 'Cross-chain', icon: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreihml3nahd2duwdjg2ltoeixax2xdj2ldp5unnrjwntyicar74nwra' },
                        ].map((protocol) => (
                          <div key={protocol.name} className="bg-white/5 rounded-xl border border-white/10 p-5 text-center hover:bg-white/10 transition-all">
                            <img 
                              src={protocol.icon}
                              alt={protocol.name}
                              className="w-10 h-10 mx-auto mb-3"
                            />
                            <p className="text-sm font-medium text-white mb-1">{protocol.name}</p>
                            <p className="text-xs text-gray-500">{protocol.role}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-10 border-t border-white/5">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>© 2025 Eagle Vault</span>
              <a href="https://docs.47eagle.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500 transition-colors">Documentation</a>
              <a href="https://x.com/teameagle47" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500 transition-colors">Twitter</a>
              <a href="https://t.me/Eagle_community_47" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500 transition-colors">Telegram</a>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>Powered by</span>
              <div className="flex items-center gap-2">
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreichw4b4wxvinfu4dmkloxajj4mm7672k6q3nyqzvdnvogvlbbycfq" 
                  alt="Uniswap"
                  className="h-4 w-4"
                />
                <span className="text-gray-400">Uniswap</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <img 
                  src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu" 
                  alt="Charm"
                  className="h-4 w-4"
                />
                <span className="text-gray-400">Charm</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          txHash={toast.txHash}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default AppModern;

