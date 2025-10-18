import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';

const WRAPPER_ABI = [
  'function wrap(uint256 amount)',
  'function unwrap(uint256 amount)',
  'function isWhitelisted(address) view returns (bool)',
  'function depositFee() view returns (uint256)',
  'function withdrawFee() view returns (uint256)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onConnect: () => void;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
}

export default function WrapUnwrap({ provider, account, onToast }: Props) {
  const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap');
  const [wrapAmount, setWrapAmount] = useState('');
  const [unwrapAmount, setUnwrapAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [vEagleBalance, setVEagleBalance] = useState('0');
  const [eagleBalance, setEagleBalance] = useState('0');
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [depositFee, setDepositFee] = useState('100');
  const [withdrawFee, setWithdrawFee] = useState('200');

  useEffect(() => {
    if (!provider || !account) return;

    const fetchBalances = async () => {
      try {
        const vault = new Contract(CONTRACTS.VAULT, ['function balanceOf(address) view returns (uint256)'], provider);
        const oft = new Contract(CONTRACTS.OFT, ERC20_ABI, provider);
        const wrapper = new Contract(CONTRACTS.WRAPPER, WRAPPER_ABI, provider);

        const [vEagle, eagle, whitelisted, depFee, withFee] = await Promise.all([
          vault.balanceOf(account),
          oft.balanceOf(account),
          wrapper.isWhitelisted(account),
          wrapper.depositFee(),
          wrapper.withdrawFee(),
        ]);

        setVEagleBalance(formatEther(vEagle));
        setEagleBalance(formatEther(eagle));
        setIsWhitelisted(whitelisted);
        setDepositFee(depFee.toString());
        setWithdrawFee(withFee.toString());
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [provider, account]);

  const handleWrap = async () => {
    if (!provider || !wrapAmount) return;

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wrapper = new Contract(CONTRACTS.WRAPPER, WRAPPER_ABI, signer);
      const vEagle = new Contract(CONTRACTS.VAULT, ERC20_ABI, signer);

      const amount = parseEther(wrapAmount);

      await vEagle.approve(CONTRACTS.WRAPPER, amount);
      const wrapTx = await wrapper.wrap(amount);
      const receipt = await wrapTx.wait();

      onToast({ 
        message: 'Wrap successful! You received EAGLE tokens', 
        type: 'success',
        txHash: receipt?.hash 
      });
      setWrapAmount('');
    } catch (error: any) {
      onToast({ message: `Wrap failed: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnwrap = async () => {
    if (!provider || !unwrapAmount) return;

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wrapper = new Contract(CONTRACTS.WRAPPER, WRAPPER_ABI, signer);
      const eagle = new Contract(CONTRACTS.OFT, ERC20_ABI, signer);

      const amount = parseEther(unwrapAmount);

      await eagle.approve(CONTRACTS.WRAPPER, amount);
      const unwrapTx = await wrapper.unwrap(amount);
      const receipt = await unwrapTx.wait();

      onToast({ 
        message: 'Unwrap successful! You received vEAGLE shares', 
        type: 'success',
        txHash: receipt?.hash 
      });
      setUnwrapAmount('');
    } catch (error: any) {
      onToast({ message: `Unwrap failed: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return null; // Don't show wrap/unwrap if not connected
  }

  return (
    <div className="bg-[#0a0a0a]/60 rounded-xl border border-eagle-gold/30 backdrop-blur-md mb-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Convert Tokens</h2>
        <p className="text-sm text-gray-400 mt-0.5">Wrap vault shares to tradable tokens or vice versa</p>
      </div>

      <div className="p-6">
        {/* Whitelist Status */}
        {isWhitelisted && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400 font-medium">Presale Participant - Enjoy 0% fees</p>
          </div>
        )}

        {/* Wrap/Unwrap Toggle */}
        <div className="flex gap-3 p-1 bg-gray-900/50 rounded-lg mb-4">
          <button
            onClick={() => setMode('wrap')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              mode === 'wrap'
                ? 'bg-indigo text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Wrap
          </button>
          <button
            onClick={() => setMode('unwrap')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              mode === 'unwrap'
                ? 'bg-purple text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Unwrap
          </button>
        </div>

        {mode === 'wrap' ? (
          <div className="space-y-4">
            {/* Wrap Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-eagle-gold-light font-medium">Amount to Wrap</label>
                <span className="text-sm text-gray-500">
                  Available: {Number(vEagleBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} vEAGLE
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  value={wrapAmount}
                  onChange={(e) => setWrapAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-eagle-gold/50 focus:ring-1 focus:ring-eagle-gold/50 transition-all"
                />
                <button 
                  onClick={() => setWrapAmount(vEagleBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 font-medium transition-colors"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">vEAGLE vault shares</p>
            </div>

            {/* Fee Display */}
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Wrap Fee:</span>
                <span className="text-white font-medium">
                  {isWhitelisted ? '0%' : `${Number(depositFee) / 100}%`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">You will receive:</span>
                <span className="text-indigo-300 font-semibold">
                  {wrapAmount ? (
                    isWhitelisted 
                      ? Number(wrapAmount).toFixed(4)
                      : (Number(wrapAmount) * (1 - Number(depositFee) / 10000)).toFixed(4)
                  ) : '0.0000'} EAGLE
                </span>
              </div>
            </div>

                <button
                  onClick={handleWrap}
                  disabled={loading || !wrapAmount || Number(wrapAmount) <= 0}
                  className="w-full px-6 py-3 bg-indigo hover:bg-indigo/90 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
                >
                  {loading ? 'Wrapping...' : 'Wrap to EAGLE'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Free your EAGLE to trade on DEXes and fly across chains via LayerZero
                </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unwrap Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-eagle-gold-light font-medium">Amount to Unwrap</label>
                <span className="text-sm text-gray-500">
                  Available: {Number(eagleBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} EAGLE
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  value={unwrapAmount}
                  onChange={(e) => setUnwrapAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-eagle-gold/50 focus:ring-1 focus:ring-eagle-gold/50 transition-all"
                />
                <button 
                  onClick={() => setUnwrapAmount(eagleBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 font-medium transition-colors"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">EAGLE tradable tokens</p>
            </div>

            {/* Fee Display */}
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Unwrap Fee:</span>
                <span className="text-white font-medium">
                  {isWhitelisted ? '0%' : `${Number(withdrawFee) / 100}%`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">You will receive:</span>
                <span className="text-purple-300 font-semibold">
                  {unwrapAmount ? (
                    isWhitelisted 
                      ? Number(unwrapAmount).toFixed(4)
                      : (Number(unwrapAmount) * (1 - Number(withdrawFee) / 10000)).toFixed(4)
                  ) : '0.0000'} vEAGLE
                </span>
              </div>
            </div>

                <button
                  onClick={handleUnwrap}
                  disabled={loading || !unwrapAmount || Number(unwrapAmount) <= 0}
                  className="w-full px-6 py-3 bg-purple hover:bg-purple/90 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
                >
                  {loading ? 'Unwrapping...' : 'Unwrap to vEAGLE'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Secure your Eagle back in the vault where it compounds yield safely
                </p>
          </div>
        )}
      </div>
    </div>
  );
}

