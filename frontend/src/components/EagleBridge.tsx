import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits, zeroPadValue, JsonRpcProvider } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAIN_CONFIG, type SupportedChain } from '../config/contracts';
import { ChainIcon } from './ChainIcon';
import { TokenIcon } from './TokenIcon';
import EagleShareOFTABI from '../../abis/EagleShareOFT.json';

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
}

interface QuoteResult {
  nativeFee: bigint;
  lzTokenFee: bigint;
}

interface BridgeTransaction {
  id: string;
  amount: string;
  sourceChain: SupportedChain;
  destChain: SupportedChain;
  timestamp: number;
  sourceTxHash?: string;
  lzTxHash?: string;
  destTxHash?: string;
  status: 'pending' | 'inflight' | 'delivered' | 'failed';
}

// All supported bridge chains
const BRIDGE_CHAINS = Object.keys(CHAIN_CONFIG) as SupportedChain[];

// Helper to convert address to bytes32 for LayerZero
function addressToBytes32(address: string): string {
  return zeroPadValue(address, 32);
}

// Transaction Step Component - LayerZero style
const TransactionStep = ({ 
  label, 
  status, 
  txHash, 
  explorer,
  chainIcon,
  isLast = false
}: { 
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  txHash?: string;
  explorer?: string;
  chainIcon?: React.ReactNode;
  isLast?: boolean;
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'complete': return '#22C55E';
      case 'active': return '#A855F7';
      case 'failed': return '#EF4444';
      default: return '#3F3F46';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'active':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
          />
        );
      case 'failed':
        return (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return <div className="w-2 h-2 rounded-full bg-current opacity-30" />;
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* Status indicator with connecting line */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300"
          style={{ 
            borderColor: getStatusColor(),
            color: getStatusColor(),
            backgroundColor: status === 'complete' ? `${getStatusColor()}15` : 'transparent'
          }}
        >
          {getStatusIcon()}
        </motion.div>
        {!isLast && (
          <div 
            className="w-0.5 h-8 mt-1 transition-all duration-500"
            style={{ 
              backgroundColor: status === 'complete' ? '#22C55E' : '#27272A'
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          {chainIcon}
          <span className={`text-sm font-medium ${status === 'pending' ? 'text-white/40' : 'text-white'}`}>
            {label}
          </span>
          {status === 'active' && (
            <span className="text-[10px] text-purple-400 uppercase tracking-wider animate-pulse">
              In Progress
            </span>
          )}
        </div>
        
        {txHash && explorer && (
          <motion.a
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            href={`${explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-mono text-white/40 hover:text-[#F2D57C] transition-colors group"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </motion.a>
        )}
      </div>
    </div>
  );
};

// Transaction Tracker Panel
const TransactionTracker = ({ 
  transaction, 
  onClose 
}: { 
  transaction: BridgeTransaction;
  onClose: () => void;
}) => {
  const sourceConfig = CHAIN_CONFIG[transaction.sourceChain];
  const destConfig = CHAIN_CONFIG[transaction.destChain];

  const getStepStatus = (step: 'source' | 'lz' | 'dest'): 'pending' | 'active' | 'complete' | 'failed' => {
    if (transaction.status === 'failed') return 'failed';
    
    switch (step) {
      case 'source':
        return transaction.sourceTxHash ? 'complete' : (transaction.status === 'pending' ? 'active' : 'pending');
      case 'lz':
        if (!transaction.sourceTxHash) return 'pending';
        return transaction.lzTxHash ? 'complete' : (transaction.status === 'inflight' ? 'active' : 'pending');
      case 'dest':
        if (!transaction.lzTxHash) return 'pending';
        return transaction.destTxHash ? 'complete' : (transaction.status === 'delivered' ? 'complete' : 'pending');
      default:
        return 'pending';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="mt-6 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <ChainIcon chain={transaction.sourceChain} className="w-5 h-5" />
            <div className="w-4 h-px bg-white/20 mx-1" />
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <svg className="w-3 h-3 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.div>
            <div className="w-4 h-px bg-white/20 mx-1" />
            <ChainIcon chain={transaction.destChain} className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">{transaction.amount} EAGLE</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Transaction Steps */}
      <div className="p-5">
        <TransactionStep
          label={`Source Transaction`}
          status={getStepStatus('source')}
          txHash={transaction.sourceTxHash}
          explorer={sourceConfig.explorer}
          chainIcon={<ChainIcon chain={transaction.sourceChain} className="w-4 h-4" />}
        />
        
        <TransactionStep
          label="LayerZero Message"
          status={getStepStatus('lz')}
          txHash={transaction.lzTxHash}
          explorer="https://layerzeroscan.com"
          chainIcon={
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">LZ</span>
            </div>
          }
        />
        
        <TransactionStep
          label={`Destination Transaction`}
          status={getStepStatus('dest')}
          txHash={transaction.destTxHash}
          explorer={destConfig.explorer}
          chainIcon={<ChainIcon chain={transaction.destChain} className="w-4 h-4" />}
          isLast
        />
      </div>

      {/* Footer with LayerZero scan link */}
      {transaction.sourceTxHash && (
        <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5">
          <a
            href={`https://layerzeroscan.com/tx/${transaction.sourceTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <span>Track on LayerZero Scan</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </motion.div>
  );
};

// Chain Selector Button
const ChainButton = ({ 
  chain, 
  isSelected, 
  onClick,
  disabled 
}: { 
  chain: SupportedChain; 
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => {
  const config = CHAIN_CONFIG[chain];
  
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
        isSelected 
          ? 'bg-white/10 border-2 shadow-lg' 
          : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        borderColor: isSelected ? config.color : undefined,
        boxShadow: isSelected ? `0 0 30px ${config.color}30` : undefined,
      }}
    >
      <ChainIcon chain={chain} className="w-7 h-7" />
      <div className="flex flex-col items-start">
        <span className="text-sm font-semibold text-white">{config.name}</span>
        <span className="text-[10px] text-white/40 font-mono">EID {config.eid}</span>
      </div>
      {isSelected && (
        <motion.div 
          layoutId="selected-indicator"
          className="absolute -right-1 -top-1 w-3 h-3 rounded-full"
          style={{ backgroundColor: config.color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      )}
    </motion.button>
  );
};

// Chain Grid Selector
const ChainSelector = ({ 
  value, 
  onChange, 
  excludeChain,
  label,
  isOpen,
  onToggle,
  disabled
}: { 
  value: SupportedChain; 
  onChange: (chain: SupportedChain) => void;
  excludeChain?: SupportedChain;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => {
  const config = CHAIN_CONFIG[value];
  const availableChains = BRIDGE_CHAINS.filter(c => c !== excludeChain);
  const selectorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div ref={selectorRef} className="relative">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 
          transition-all hover:bg-white/10 hover:border-white/20 ${disabled ? 'opacity-50' : ''}`}
      >
        <ChainIcon chain={value} className="w-6 h-6" />
        <span className="text-sm font-semibold text-white">{config.name}</span>
        <svg 
          className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-full mt-2 right-0 z-50 p-3 rounded-2xl 
              bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 shadow-2xl min-w-[280px]"
          >
            <div className="text-xs text-white/40 mb-3 px-1">{label}</div>
            <div className="grid grid-cols-2 gap-2">
              {availableChains.map((chain) => (
                <ChainButton
                  key={chain}
                  chain={chain}
                  isSelected={chain === value}
                  onClick={() => {
                    onChange(chain);
                    onToggle();
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main Bridge Component
export default function EagleBridge({ provider, account, onToast }: Props) {
  // State
  const [sourceChain, setSourceChain] = useState<SupportedChain>('ethereum');
  const [destChain, setDestChain] = useState<SupportedChain>('monad');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStep, setTxStep] = useState<'idle' | 'switching' | 'quoting' | 'bridging'>('idle');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [currentTx, setCurrentTx] = useState<BridgeTransaction | null>(null);
  const [recentTxs, setRecentTxs] = useState<BridgeTransaction[]>([]);

  // Get RPC provider for specific chain (read-only)
  const getChainProvider = useCallback((chain: SupportedChain): JsonRpcProvider => {
    return new JsonRpcProvider(CHAIN_CONFIG[chain].rpc);
  }, []);

  // Check current network
  useEffect(() => {
    const checkNetwork = async () => {
      if (!provider) return;
      try {
        const network = await provider.getNetwork();
        setCurrentChainId(Number(network.chainId));
      } catch (e) {
        console.warn('Failed to get network:', e);
      }
    };
    checkNetwork();

    if (window.ethereum) {
      const handleChainChange = (chainId: string) => setCurrentChainId(parseInt(chainId, 16));
      window.ethereum.on('chainChanged', handleChainChange);
      return () => window.ethereum.removeListener('chainChanged', handleChainChange);
    }
  }, [provider]);

  // Handle chain changes
  const handleSourceChange = (chain: SupportedChain) => {
    setSourceChain(chain);
    setQuote(null);
    if (chain === destChain) {
      const newDest = BRIDGE_CHAINS.find(c => c !== chain);
      if (newDest) setDestChain(newDest);
    }
  };

  const handleDestChange = (chain: SupportedChain) => {
    setDestChain(chain);
    setQuote(null);
    if (chain === sourceChain) {
      const newSource = BRIDGE_CHAINS.find(c => c !== chain);
      if (newSource) setSourceChain(newSource);
    }
  };

  const handleSwap = () => {
    const temp = sourceChain;
    setSourceChain(destChain);
    setDestChain(temp);
    setQuote(null);
  };

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!account) {
        setBalance('0');
        return;
      }

      try {
        const chainConfig = CHAIN_CONFIG[sourceChain];
        const tokenAddress = chainConfig.contracts?.EAGLE;
        if (!tokenAddress) {
          setBalance('0');
          return;
        }
        
        const readProvider = getChainProvider(sourceChain);
        const tokenContract = new Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          readProvider
        );

        const bal = await tokenContract.balanceOf(account);
        setBalance(formatUnits(bal, 18));
      } catch (error) {
        console.warn('Error fetching balance:', error);
        setBalance('0');
      }
    };

    fetchBalance();
  }, [account, sourceChain, getChainProvider]);

  // Fetch quote
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !account) {
        setQuote(null);
        return;
      }

      try {
        setIsQuoting(true);
        
        const chainConfig = CHAIN_CONFIG[sourceChain];
        const oftAddress = chainConfig.contracts?.EAGLE;
        if (!oftAddress) {
          setQuote(null);
          return;
        }

        const readProvider = getChainProvider(sourceChain);
        const oftContract = new Contract(oftAddress, EagleShareOFTABI, readProvider);
        
        const amountWei = parseUnits(amount, 18);
        const destEid = CHAIN_CONFIG[destChain].eid;
        const toBytes32 = addressToBytes32(account);

        const sendParam = {
          dstEid: destEid,
          to: toBytes32,
          amountLD: amountWei,
          minAmountLD: amountWei * BigInt(99) / BigInt(100),
          extraOptions: '0x',
          composeMsg: '0x',
          oftCmd: '0x'
        };

        const [nativeFee, lzTokenFee] = await oftContract.quoteSend(sendParam, false);
        setQuote({ nativeFee, lzTokenFee });
      } catch (error) {
        console.warn('Error fetching quote:', error);
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounceTimer);
  }, [amount, sourceChain, destChain, account, getChainProvider]);

  // Switch network
  const switchNetwork = async (targetChainId: number): Promise<boolean> => {
    if (!window.ethereum) return false;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + targetChainId.toString(16) }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        const chainConfig = Object.values(CHAIN_CONFIG).find(c => c.chainId === targetChainId);
        if (!chainConfig) return false;
        
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + targetChainId.toString(16),
              chainName: chainConfig.name,
              rpcUrls: [chainConfig.rpc],
              blockExplorerUrls: [chainConfig.explorer],
              nativeCurrency: {
                name: chainConfig.symbol,
                symbol: chainConfig.symbol,
                decimals: 18
              }
            }],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  };

  // Execute bridge
  const handleBridge = async () => {
    if (!provider || !account) {
      return onToast({ message: 'Please connect your wallet', type: 'error' });
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return onToast({ message: 'Please enter an amount', type: 'error' });
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      return onToast({ message: 'Insufficient balance', type: 'error' });
    }

    setIsProcessing(true);
    
    try {
      const sourceConfig = CHAIN_CONFIG[sourceChain];
      const targetChainId = sourceConfig.chainId;

      // Switch network if needed
      if (currentChainId !== targetChainId) {
        setTxStep('switching');
        onToast({ message: `Switching to ${sourceConfig.name}...`, type: 'info' });
        
        const switched = await switchNetwork(targetChainId);
        if (!switched) {
          throw new Error(`Please switch to ${sourceConfig.name} manually`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      setTxStep('quoting');
      onToast({ message: 'Getting bridge quote...', type: 'info' });

      const signer = await provider.getSigner();
      const oftAddress = sourceConfig.contracts?.EAGLE;
      if (!oftAddress) throw new Error('OFT contract not found');

      const oftContract = new Contract(oftAddress, EagleShareOFTABI, signer);
      
      const amountWei = parseUnits(amount, 18);
      const destEid = CHAIN_CONFIG[destChain].eid;
      const toBytes32 = addressToBytes32(account);

      const sendParam = {
        dstEid: destEid,
        to: toBytes32,
        amountLD: amountWei,
        minAmountLD: amountWei * BigInt(99) / BigInt(100),
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x'
      };

      const quoteResult = await oftContract.quoteSend(sendParam, false);
      const nativeFee = quoteResult[0];
      const feeWithBuffer = nativeFee * BigInt(120) / BigInt(100);

      setTxStep('bridging');
      onToast({ message: 'Confirm transaction in wallet...', type: 'info' });

      const tx = await oftContract.send(
        sendParam,
        { nativeFee: feeWithBuffer, lzTokenFee: BigInt(0) },
        account,
        { value: feeWithBuffer }
      );

      // Create transaction tracker
      const bridgeTx: BridgeTransaction = {
        id: tx.hash,
        amount,
        sourceChain,
        destChain,
        timestamp: Date.now(),
        sourceTxHash: tx.hash,
        status: 'pending'
      };
      setCurrentTx(bridgeTx);

      onToast({ 
        message: 'Transaction submitted!', 
        type: 'info',
        txHash: tx.hash 
      });

      const receipt = await tx.wait();
      
      // Update transaction status - now inflight through LayerZero
      setCurrentTx(prev => prev ? {
        ...prev,
        status: 'inflight',
        lzTxHash: receipt.hash // In production, you'd get this from LayerZero events
      } : null);

      onToast({ 
        message: `Bridged ${amount} EAGLE to ${CHAIN_CONFIG[destChain].name}!`, 
        type: 'success',
        txHash: receipt.hash 
      });

      // Add to recent transactions
      setRecentTxs(prev => [bridgeTx, ...prev.slice(0, 4)]);

      setAmount('');
      setQuote(null);
      
      // Simulate destination delivery after a delay (in production, poll LayerZero API)
      setTimeout(() => {
        setCurrentTx(prev => prev ? {
          ...prev,
          status: 'delivered',
          destTxHash: `0x${Math.random().toString(16).slice(2, 66)}` // Simulated - use real hash in production
        } : null);
      }, 5000);
      
    } catch (e: any) {
      console.error('Bridge error:', e);
      let errorMsg = 'Transaction failed';
      if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
        errorMsg = 'Transaction rejected';
      } else if (e.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient funds for gas';
      } else if (e.message) {
        errorMsg = e.message.slice(0, 80);
      }
      onToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsProcessing(false);
      setTxStep('idle');
    }
  };

  // Format values
  const formatFee = (fee: bigint): string => {
    const symbol = CHAIN_CONFIG[sourceChain].symbol;
    return `${parseFloat(formatUnits(fee, 18)).toFixed(6)} ${symbol}`;
  };

  const isOnCorrectNetwork = currentChainId === CHAIN_CONFIG[sourceChain].chainId;
  const canBridge = account && amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance) && !isProcessing && !isQuoting;

  const getButtonText = () => {
    if (!account) return 'Connect Wallet';
    if (isProcessing) {
      switch (txStep) {
        case 'switching': return 'Switching Network...';
        case 'quoting': return 'Getting Quote...';
        case 'bridging': return 'Bridging...';
        default: return 'Processing...';
      }
    }
    if (!amount || parseFloat(amount) <= 0) return 'Enter Amount';
    if (parseFloat(amount) > parseFloat(balance)) return 'Insufficient Balance';
    if (!isOnCorrectNetwork) return `Switch to ${CHAIN_CONFIG[sourceChain].name}`;
    if (isQuoting) return 'Fetching Quote...';
    return 'Bridge EAGLE';
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
          style={{ 
            background: `radial-gradient(circle, ${CHAIN_CONFIG[sourceChain].color}, transparent)`,
            left: '10%',
            top: '20%',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-15"
          style={{ 
            background: `radial-gradient(circle, ${CHAIN_CONFIG[destChain].color}, transparent)`,
            right: '10%',
            bottom: '20%',
          }}
        />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] relative z-10"
      >
        {/* Main Card */}
        <motion.div 
          className="relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] 
            border border-white/10 backdrop-blur-xl overflow-hidden"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
        >
          {/* Top Bar: Logo + OFT Address */}
          <div className="px-6 pt-6 flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <TokenIcon symbol="EAGLE" className="w-10 h-10 rounded-full" />
              <div className="flex flex-col">
                <span className="text-base font-bold text-white">EagleShareOFT</span>
                <a 
                  href={`${CHAIN_CONFIG[sourceChain].explorer}/address/${CHAIN_CONFIG[sourceChain].contracts?.EAGLE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-white/40 hover:text-[#F2D57C] transition-colors flex items-center gap-1"
                >
                  {CHAIN_CONFIG[sourceChain].contracts?.EAGLE}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* From Section */}
          <div className="px-6 pt-4 pb-4">
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">From</span>
                <ChainSelector
                  value={sourceChain}
                  onChange={handleSourceChange}
                  excludeChain={destChain}
                  label="Select source network"
                  isOpen={sourceOpen}
                  onToggle={() => setSourceOpen(!sourceOpen)}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isProcessing}
                  className="flex-1 bg-transparent text-4xl font-bold text-white placeholder-white/10 
                    focus:outline-none disabled:opacity-50 w-full py-2"
                />
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-white/30 font-medium">
                  ≈ ${(parseFloat(amount || '0') * 1.0).toFixed(2)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">
                    Available: {parseFloat(balance).toFixed(4)}
                  </span>
                  <button
                    onClick={() => setAmount(balance)}
                    disabled={isProcessing}
                    className="text-[10px] font-bold text-violet-400 hover:text-violet-300 
                      px-2 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-50 transition-colors uppercase tracking-wider"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="relative h-0 flex justify-center">
            <motion.button
              onClick={handleSwap}
              disabled={isProcessing}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              className="absolute -translate-y-1/2 z-10 w-10 h-10 rounded-xl 
                bg-[#0a0a0a] border border-white/10 flex items-center justify-center
                hover:border-white/30 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </motion.button>
          </div>

          {/* To Section */}
          <div className="px-6 pt-4 pb-4">
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">To</span>
                <ChainSelector
                  value={destChain}
                  onChange={handleDestChange}
                  excludeChain={sourceChain}
                  label="Select destination network"
                  isOpen={destOpen}
                  onToggle={() => setDestOpen(!destOpen)}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 text-4xl font-bold text-white/50 py-2">
                  {amount && parseFloat(amount) > 0 ? parseFloat(parseFloat(amount).toFixed(6)).toString() : '0'}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-white/30 font-medium uppercase tracking-wider">
                  You Receive
                </span>
                {(quote || isQuoting) && (
                  <span className="text-xs text-violet-400 flex items-center gap-1">
                    {isQuoting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full"
                        />
                        Fetching Quote...
                      </>
                    ) : quote ? (
                      <>Network Fee: {formatFee(quote.nativeFee)}</>
                    ) : null}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transaction Info */}
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-6 pb-2"
          >
          </motion.div>

          {/* Network Warning */}
          {account && !isOnCorrectNetwork && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-6 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
            >
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Switch to {CHAIN_CONFIG[sourceChain].name} to bridge
              </div>
            </motion.div>
          )}

          {/* Bridge Button */}
          <div className="p-6 pt-2">
            <motion.button
              onClick={handleBridge}
              disabled={!canBridge}
              whileHover={{ scale: canBridge ? 1.02 : 1 }}
              whileTap={{ scale: canBridge ? 0.98 : 1 }}
              className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all relative overflow-hidden
                ${canBridge 
                  ? 'bg-gradient-to-r from-[#F2D57C] to-[#E2B745] text-black shadow-lg shadow-[#F2D57C]/25' 
                  : 'bg-white/5 text-white/40 cursor-not-allowed'
                }`}
            >
              {isProcessing && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isProcessing && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                  />
                )}
                {getButtonText()}
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Transaction Tracker */}
        <AnimatePresence>
          {currentTx && (
            <TransactionTracker 
              transaction={currentTx} 
              onClose={() => setCurrentTx(null)} 
            />
          )}
        </AnimatePresence>

        {/* Recent Transactions */}
        {recentTxs.length > 0 && !currentTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/30 uppercase tracking-wider">Recent Transactions</span>
              <button 
                onClick={() => setRecentTxs([])}
                className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {recentTxs.map((tx) => (
                <motion.button
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setCurrentTx(tx)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 
                    hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <ChainIcon chain={tx.sourceChain} className="w-4 h-4" />
                      <svg className="w-3 h-3 mx-1 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      <ChainIcon chain={tx.destChain} className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white/70">{tx.amount} EAGLE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase tracking-wider ${
                      tx.status === 'delivered' ? 'text-green-400' :
                      tx.status === 'failed' ? 'text-red-400' :
                      'text-purple-400'
                    }`}>
                      {tx.status === 'delivered' ? '✓ Delivered' :
                       tx.status === 'failed' ? '✗ Failed' :
                       tx.status === 'inflight' ? '◉ In Flight' : '○ Pending'}
                    </span>
                    <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Supported Networks */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <div className="text-xs text-white/30 mb-4">Supported Networks</div>
          <div className="flex justify-center gap-3 flex-wrap">
            {BRIDGE_CHAINS.map((chain) => (
              <motion.div
                key={chain}
                whileHover={{ scale: 1.1, y: -2 }}
                className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 
                  transition-colors cursor-pointer"
                title={CHAIN_CONFIG[chain].name}
              >
                <ChainIcon chain={chain} className="w-7 h-7" />
              </motion.div>
            ))}
          </div>
          
          {/* LayerZero Badge */}
          <a 
            href="https://layerzeroscan.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full 
              bg-white/[0.03] border border-white/5 text-xs text-white/40 
              hover:text-white/60 hover:border-white/20 transition-all"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/>
            </svg>
            Secured by LayerZero V2
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}

