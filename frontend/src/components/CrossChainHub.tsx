import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Zap, Shield, Clock, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NeoButton, NeoCard, NeoInput } from './neumorphic';
import { CONTRACTS } from '../config/contracts';
import { ICONS } from '../config/icons';

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
  onNavigateToVault?: () => void;
  onNavigateToLP?: () => void;
}

type Token = 'EAGLE' | 'WLFI';
type Chain = 'base' | 'ethereum';
type Operation = 'bridge' | 'redeem' | 'deposit';

// Simple chain icons as SVG components
const BaseIcon = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
  </svg>
);

const EthereumIcon = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYMid">
    <path fill="#627EEA" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity=".602"/>
    <path fill="#627EEA" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
    <path fill="#627EEA" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity=".602"/>
    <path fill="#627EEA" d="M127.962 416.905v-104.72L0 236.585z"/>
    <path fill="#627EEA" d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity=".2"/>
    <path fill="#627EEA" d="M0 212.32l127.96 75.638v-133.8z" fillOpacity=".602"/>
  </svg>
);

const CHAIN_INFO = {
  base: { name: 'Base', icon: BaseIcon },
  ethereum: { name: 'Ethereum', icon: EthereumIcon },
};

export default function CrossChainHub({ provider, account, onToast, onNavigateToVault, onNavigateToLP }: Props) {
  // State
  const [sourceChain, setSourceChain] = useState<Chain>('base');
  const [destChain, setDestChain] = useState<Chain>('ethereum');
  const [sourceToken, setSourceToken] = useState<Token>('EAGLE');
  const [destToken, setDestToken] = useState<Token>('EAGLE');
  
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState('0');

  // Derived Operation
  const operation: Operation = 
    sourceToken === 'EAGLE' && destToken === 'EAGLE' ? 'bridge' :
    sourceToken === 'EAGLE' && destToken === 'WLFI' ? 'redeem' :
    'deposit'; // WLFI -> EAGLE

  // Supply Cap Logic
  const MAX_SUPPLY_REACHED = true;
  const isDepositPaused = operation === 'deposit' && MAX_SUPPLY_REACHED;

  // Mock Balances
  const balance = sourceToken === 'EAGLE' ? '100.00' : '50.00'; // Replace with real data

  // Effects
  useEffect(() => {
    // Validations to enforce logic
    if (sourceToken === 'WLFI' && destToken === 'WLFI') {
      setDestToken('EAGLE'); // Can't bridge WLFI directly (for now)
    }
  }, [sourceToken, destToken]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setEstimatedOutput('0');
      return;
    }
    const val = parseFloat(amount);
    if (operation === 'bridge') setEstimatedOutput(val.toFixed(6));
    else if (operation === 'redeem') setEstimatedOutput(((val * 0.98) / 10000).toFixed(6));
    else setEstimatedOutput(((val * 10000) / 0.98).toFixed(6));
  }, [amount, operation]);

  const handleSwapInputs = () => {
    setSourceChain(destChain);
    setDestChain(sourceChain);
    setSourceToken(destToken);
    setDestToken(sourceToken);
  };

  const handleExecute = async () => {
    if (!provider || !account) return onToast({ message: 'Connect Wallet', type: 'error' });
    if (isDepositPaused) return onToast({ message: 'Minting Paused: Max Supply Reached', type: 'error' });
    
    setIsProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      onToast({ message: `${operation.toUpperCase()} Initiated!`, type: 'success' });
      setAmount('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#0a0a0a] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cross-Chain Hub</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Bridge, Redeem, and Deposit in one place.</p>
        </div>

        <NeoCard className="p-2 !bg-white dark:!bg-black border border-gray-100 dark:border-gray-800 shadow-2xl">
          
          {/* Source Section */}
          <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-4 mb-1 relative group transition-colors hover:bg-gray-100 dark:hover:bg-[#161616]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">You Pay</span>
              <div className="flex items-center gap-2">
                <button 
                   onClick={() => setSourceChain(sourceChain === 'base' ? 'ethereum' : 'base')}
                   className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-500 transition-colors"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {sourceChain === 'base' ? <BaseIcon /> : <EthereumIcon />}
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{CHAIN_INFO[sourceChain].name}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <input 
                type="number" 
                placeholder="0.0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none"
              />
              <button 
                onClick={() => setSourceToken(sourceToken === 'EAGLE' ? 'WLFI' : 'EAGLE')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-105 transition-transform shrink-0"
              >
                <div className="relative">
                  <img src={sourceToken === 'EAGLE' ? ICONS.EAGLE : ICONS.WLFI} className="w-8 h-8 rounded-full" alt={sourceToken} />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    {sourceChain === 'base' ? <BaseIcon className="w-full h-full" /> : <EthereumIcon className="w-full h-full p-[2px]" />}
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{sourceToken}</span>
                <ArrowDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            
            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
               <span>${(parseFloat(amount || '0') * (sourceToken === 'EAGLE' ? 1.0 : 0.0001)).toFixed(2)}</span>
               <div className="flex gap-2">
                 <span>Bal: {balance}</span>
                 <button onClick={() => setAmount(balance)} className="text-amber-500 font-bold hover:text-amber-600">MAX</button>
               </div>
            </div>
          </div>

          {/* Swap Indicator */}
          <div className="relative h-2 z-10 flex justify-center items-center">
            <button 
              onClick={handleSwapInputs}
              className="absolute bg-white dark:bg-[#222] border-4 border-white dark:border-black p-2 rounded-xl shadow-lg hover:scale-110 transition-all group"
            >
              <ArrowDown className="w-4 h-4 text-gray-500 group-hover:text-amber-500" />
            </button>
          </div>

          {/* Destination Section */}
          <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-4 mt-1 relative group transition-colors hover:bg-gray-100 dark:hover:bg-[#161616]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">You Receive</span>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setDestChain(destChain === 'base' ? 'ethereum' : 'base')}
                   className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-500 transition-colors"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {destChain === 'base' ? <BaseIcon /> : <EthereumIcon />}
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{CHAIN_INFO[destChain].name}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="w-full bg-transparent text-3xl font-bold text-gray-900 dark:text-white opacity-50">
                {estimatedOutput || '0.0'}
              </div>
              <button 
                onClick={() => setDestToken(destToken === 'EAGLE' ? 'WLFI' : 'EAGLE')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-105 transition-transform shrink-0"
              >
                <div className="relative">
                  <img src={destToken === 'EAGLE' ? ICONS.EAGLE : ICONS.WLFI} className="w-8 h-8 rounded-full" alt={destToken} />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    {destChain === 'base' ? <BaseIcon className="w-full h-full" /> : <EthereumIcon className="w-full h-full p-[2px]" />}
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{destToken}</span>
                <ArrowDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
               <span>${(parseFloat(estimatedOutput || '0') * (destToken === 'EAGLE' ? 1.0 : 0.0001)).toFixed(2)}</span>
               {operation !== 'bridge' && (
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <Zap className="w-3 h-3" />
                    {operation === 'redeem' ? '2% Fee + Dilution' : 'Concentration'}
                  </span>
               )}
            </div>
          </div>

          {/* Status Warning for Supply Cap */}
          <AnimatePresence>
            {isDepositPaused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 mt-4"
              >
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-500">Minting Paused</h4>
                    <p className="text-xs text-red-400 mt-1">
                      EAGLE has reached its maximum supply cap of 50,000,000 tokens. Deposits are temporarily disabled.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <NeoButton
            onClick={handleExecute}
            disabled={!amount || parseFloat(amount) <= 0 || isProcessing || isDepositPaused}
            className={`w-full mt-4 py-4 text-lg font-bold !rounded-xl ${isDepositPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
            variant={(!amount || isDepositPaused) ? 'secondary' : 'primary'}
          >
            {isProcessing ? 'Processing...' : 
             isDepositPaused ? 'Supply Cap Reached' :
             !amount ? 'Enter Amount' :
             operation === 'bridge' ? 'Bridge EAGLE' :
             operation === 'redeem' ? 'Redeem to WLFI' : 'Deposit to EAGLE'}
          </NeoButton>

        </NeoCard>

        {/* Info Footer */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
           <div className="bg-white/5 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">Route</div>
              <div className="text-xs font-bold text-gray-300">{operation.toUpperCase()}</div>
           </div>
           <div className="bg-white/5 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">Time</div>
              <div className="text-xs font-bold text-gray-300">~2 Mins</div>
           </div>
           <div className="bg-white/5 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">Network</div>
              <div className="text-xs font-bold text-green-500">Online</div>
           </div>
        </div>

      </div>
    </div>
  );
}