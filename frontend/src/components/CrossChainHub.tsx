import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits, zeroPadValue, JsonRpcProvider } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Zap, Shield, Clock, ExternalLink, AlertCircle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { NeoButton, NeoCard } from './neumorphic';
import { CHAIN_CONFIG, type SupportedChain } from '../config/contracts';
import { TokenIcon } from './TokenIcon';
import { ChainIcon } from './ChainIcon';
import EagleShareOFTABI from '../../abis/EagleShareOFT.json';

// Chains that support bridging EAGLE
const BRIDGE_CHAINS: SupportedChain[] = ['ethereum', 'base', 'monad'];

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
  onNavigateToVault?: () => void;
  onNavigateToLP?: () => void;
}

interface QuoteResult {
  nativeFee: bigint;
  lzTokenFee: bigint;
}

// Helper to convert address to bytes32 for LayerZero
function addressToBytes32(address: string): string {
  return zeroPadValue(address, 32);
}

// LayerZero V2 uses enforced options set on the OFT contract
// We pass empty options and let the contract's enforced options take effect
// This is the recommended approach for OFT bridges
const EMPTY_OPTIONS = '0x';

// Chain Selector Dropdown Component
function ChainSelector({ 
  value, 
  onChange, 
  excludeChain,
  label,
  disabled
}: { 
  value: SupportedChain; 
  onChange: (chain: SupportedChain) => void;
  excludeChain?: SupportedChain;
  label: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const availableChains = BRIDGE_CHAINS.filter(c => c !== excludeChain);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-violet-500 hover:shadow-md'
        }`}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          <ChainIcon key={`selector-${value}`} chain={value} className="w-full h-full" />
        </div>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
          {CHAIN_CONFIG[value].name}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 z-50 min-w-[180px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-2">
              <div className="text-xs text-gray-500 px-2 py-1 mb-1">{label}</div>
              {availableChains.map((chain) => {
                const isSelected = chain === value;
                return (
                  <button
                    key={chain}
                    onClick={() => {
                      onChange(chain);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="w-6 h-6"><ChainIcon key={`dropdown-${chain}`} chain={chain} className="w-full h-full" /></div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{CHAIN_CONFIG[chain].name}</span>
                      <span className="text-xs text-gray-500">EID: {CHAIN_CONFIG[chain].eid}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 ml-auto text-violet-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CrossChainHub({ provider, account, onToast }: Props) {
  // State
  const [sourceChain, setSourceChain] = useState<SupportedChain>('ethereum');
  const [destChain, setDestChain] = useState<SupportedChain>('monad');
  
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStep, setTxStep] = useState<'idle' | 'switching' | 'quoting' | 'approving' | 'bridging'>('idle');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [balance, setBalance] = useState<string>('0.00');
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Get RPC provider for specific chain (read-only)
  const getChainProvider = useCallback((chain: SupportedChain): JsonRpcProvider => {
    const rpc = CHAIN_CONFIG[chain].rpc;
    return new JsonRpcProvider(rpc);
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

    // Listen for chain changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId: string) => {
        setCurrentChainId(parseInt(chainId, 16));
      });
    }
  }, [provider]);

  // Handle chain changes - ensure source != dest
  const handleSourceChainChange = (chain: SupportedChain) => {
    setSourceChain(chain);
    setQuote(null);
    if (chain === destChain) {
      const newDest = BRIDGE_CHAINS.find(c => c !== chain);
      if (newDest) setDestChain(newDest);
    }
  };

  const handleDestChainChange = (chain: SupportedChain) => {
    setDestChain(chain);
    setQuote(null);
    if (chain === sourceChain) {
      const newSource = BRIDGE_CHAINS.find(c => c !== chain);
      if (newSource) setSourceChain(newSource);
    }
  };

  // Fetch balance from source chain
  useEffect(() => {
    const fetchBalance = async () => {
      if (!account) {
        setBalance('0.00');
        return;
      }

      try {
        const chainConfig = CHAIN_CONFIG[sourceChain];
        const tokenAddress = chainConfig.contracts?.EAGLE;
        if (!tokenAddress) {
          setBalance('0.00');
          return;
        }
        
        // Use chain-specific RPC provider for reading balance
        const readProvider = getChainProvider(sourceChain);
        const tokenContract = new Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          readProvider
        );

        const bal = await tokenContract.balanceOf(account);
        setBalance(parseFloat(formatUnits(bal, 18)).toFixed(4));
      } catch (error) {
        console.warn('Error fetching balance:', error);
        setBalance('0.00');
      }
    };

    fetchBalance();
  }, [account, sourceChain, getChainProvider]);

  // Fetch quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setEstimatedOutput('0');
        setQuote(null);
        return;
      }

      const val = parseFloat(amount);
      setEstimatedOutput(val.toFixed(6));

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
        const toBytes32 = addressToBytes32(account || '0x0000000000000000000000000000000000000000');

        const sendParam = {
          dstEid: destEid,
          to: toBytes32,
          amountLD: amountWei,
          minAmountLD: amountWei * BigInt(99) / BigInt(100), // 1% slippage
          extraOptions: EMPTY_OPTIONS, // Use empty options, enforced options on contract will be used
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

  const handleSwapInputs = () => {
    const tempSource = sourceChain;
    setSourceChain(destChain);
    setDestChain(tempSource);
    setQuote(null);
  };

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
      // Chain not added, try to add it
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
                name: chainConfig.name === 'Monad' ? 'MON' : 'ETH',
                symbol: chainConfig.name === 'Monad' ? 'MON' : 'ETH',
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

  // Execute bridge transaction
  const handleExecute = async () => {
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

      // Step 1: Switch to source chain if needed
      if (currentChainId !== targetChainId) {
        setTxStep('switching');
        onToast({ message: `Switching to ${sourceConfig.name}...`, type: 'info' });
        
        const switched = await switchNetwork(targetChainId);
        if (!switched) {
          throw new Error(`Please switch to ${sourceConfig.name} manually`);
        }
        
        // Wait for provider to update
        await new Promise(r => setTimeout(r, 1000));
      }

      // Step 2: Get fresh quote
      setTxStep('quoting');
      onToast({ message: 'Getting bridge quote...', type: 'info' });

      const signer = await provider.getSigner();
      const oftAddress = sourceConfig.contracts?.EAGLE;
      if (!oftAddress) throw new Error('OFT contract not found for source chain');

      const oftContract = new Contract(oftAddress, EagleShareOFTABI, signer);
      
      const amountWei = parseUnits(amount, 18);
      const destEid = CHAIN_CONFIG[destChain].eid;
      const toBytes32 = addressToBytes32(account);
      // Use empty options - enforced options on OFT contract will be used
      const extraOptions = EMPTY_OPTIONS;

      console.log('[Bridge] Preparing send params:', {
        destEid,
        to: toBytes32,
        amount: amount,
        amountWei: amountWei.toString(),
        extraOptions,
        sourceChain,
        destChain
      });

      const sendParam = {
        dstEid: destEid,
        to: toBytes32,
        amountLD: amountWei,
        minAmountLD: amountWei * BigInt(99) / BigInt(100), // 1% slippage
        extraOptions: extraOptions,
        composeMsg: '0x',
        oftCmd: '0x'
      };

      // Get fresh quote
      console.log('[Bridge] Getting quote...');
      const quoteResult = await oftContract.quoteSend(sendParam, false);
      const nativeFee = quoteResult[0];
      console.log('[Bridge] Quote received:', formatUnits(nativeFee, 18), 'native');
      
      // Add 20% buffer to fee for safety
      const feeWithBuffer = nativeFee * BigInt(120) / BigInt(100);
      console.log('[Bridge] Fee with buffer:', formatUnits(feeWithBuffer, 18), 'native');

      // Step 3: Execute bridge
      setTxStep('bridging');
      onToast({ message: 'Confirm transaction in wallet...', type: 'info' });

      console.log('[Bridge] Calling send() with fee:', formatUnits(feeWithBuffer, 18));
      const tx = await oftContract.send(
        sendParam,
        { nativeFee: feeWithBuffer, lzTokenFee: BigInt(0) },
        account, // refund address
        { value: feeWithBuffer }
      );

      onToast({ 
        message: 'Transaction submitted! Waiting for confirmation...', 
        type: 'info',
        txHash: tx.hash 
      });

      const receipt = await tx.wait();
      
      onToast({ 
        message: `Bridge successful! ${amount} EAGLE sent to ${CHAIN_CONFIG[destChain].name}`, 
        type: 'success',
        txHash: receipt.hash 
      });

      setAmount('');
      setQuote(null);
      
    } catch (e: any) {
      console.error('Bridge error:', e);
      
      let errorMsg = 'Transaction failed';
      
      // Parse error
      if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
        errorMsg = 'Transaction rejected by user';
      } else if (e.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient funds for gas';
      } else if (e.data) {
        // Try to decode LayerZero custom errors
        const errorData = e.data;
        console.log('[Bridge] Error data:', errorData);
        
        // Common LayerZero V2 error signatures
        const LZ_ERRORS: Record<string, string> = {
          '0x6592671c': 'NoPeer - Destination chain peer not configured',
          '0x39d35496': 'InvalidEid - Invalid destination chain',
          '0x906c9dd7': 'InvalidOptions - Malformed options data',
          '0x8e4a23d6': 'SlippageExceeded - Output less than minimum',
          '0x3db54208': 'NotEnoughNative - Insufficient native token for fee',
          '0x0dc14958': 'Unauthorized - Not authorized to perform action',
        };
        
        const errorSig = errorData.slice(0, 10);
        if (LZ_ERRORS[errorSig]) {
          errorMsg = LZ_ERRORS[errorSig];
        } else {
          errorMsg = `Contract error: ${errorData.slice(0, 20)}...`;
        }
      } else if (e.reason) {
        errorMsg = e.reason;
      } else if (e.message) {
        // Clean up ethers.js error messages
        const msg = e.message;
        if (msg.includes('execution reverted')) {
          errorMsg = 'Transaction reverted - check peer configuration';
        } else {
          errorMsg = msg.slice(0, 100);
        }
      }
      
      onToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsProcessing(false);
      setTxStep('idle');
    }
  };

  // Format fee display
  const formatFee = (fee: bigint, chain: SupportedChain): string => {
    const symbol = chain === 'monad' ? 'MON' : 'ETH';
    return `${parseFloat(formatUnits(fee, 18)).toFixed(6)} ${symbol}`;
  };

  // Check if on correct network
  const isOnCorrectNetwork = currentChainId === CHAIN_CONFIG[sourceChain].chainId;

  // Button text based on state
  const getButtonText = () => {
    if (isProcessing) {
      switch (txStep) {
        case 'switching': return 'Switching Network...';
        case 'quoting': return 'Getting Quote...';
        case 'approving': return 'Approving...';
        case 'bridging': return 'Bridging...';
        default: return 'Processing...';
      }
    }
    if (!account) return 'Connect Wallet';
    if (!amount || parseFloat(amount) <= 0) return 'Enter Amount';
    if (parseFloat(amount) > parseFloat(balance)) return 'Insufficient Balance';
    if (!isOnCorrectNetwork) return `Switch to ${CHAIN_CONFIG[sourceChain].name}`;
    if (isQuoting) return 'Fetching Quote...';
    return `Bridge to ${CHAIN_CONFIG[destChain].name}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#0a0a0a] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cross-Chain Bridge</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Bridge EAGLE across Ethereum, Base & Monad</p>
          
          {/* Chain Pills */}
          <div className="flex justify-center gap-2 mt-4">
            {BRIDGE_CHAINS.map((chain) => {
              const isActive = chain === sourceChain || chain === destChain;
              const isCurrent = CHAIN_CONFIG[chain].chainId === currentChainId;
              return (
                <div 
                  key={chain}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-transparent'
                  }`}
                >
                  <div className="w-4 h-4"><ChainIcon key={`pill-${chain}`} chain={chain} className="w-full h-full" /></div>
                  {CHAIN_CONFIG[chain].name}
                  {isCurrent && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                </div>
              );
            })}
          </div>
        </div>

        <NeoCard className="p-2 !bg-white dark:!bg-black border border-gray-100 dark:border-gray-800 shadow-2xl">
          
          {/* Network Warning */}
          {account && !isOnCorrectNetwork && (
            <div className="mx-2 mb-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Switch to {CHAIN_CONFIG[sourceChain].name} to bridge</span>
            </div>
          )}

          {/* Source Section */}
          <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-4 mb-1 relative group transition-colors hover:bg-gray-100 dark:hover:bg-[#161616]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">From</span>
              <ChainSelector 
                value={sourceChain} 
                onChange={handleSourceChainChange}
                excludeChain={destChain}
                label="Select Source Chain"
                disabled={isProcessing}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <input 
                type="number" 
                placeholder="0.0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isProcessing}
                className="w-full bg-transparent text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none disabled:opacity-50"
              />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                <div className="relative">
                  <TokenIcon key={`eagle-${sourceChain}`} symbol="EAGLE" address={CHAIN_CONFIG[sourceChain].contracts?.EAGLE} className="w-8 h-8 rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    <ChainIcon key={`chain-${sourceChain}`} chain={sourceChain} className="w-full h-full p-[1px]" />
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">EAGLE</span>
              </div>
            </div>
            
            <div className="mt-3 flex justify-between items-center text-xs">
               <div className="flex flex-col">
                 <span className="text-gray-500">USD Value:</span>
                 <span className="text-gray-700 dark:text-gray-300 font-semibold">${(parseFloat(amount || '0') * 1.0).toFixed(2)}</span>
               </div>
               <div className="flex gap-2 items-center">
                 <div className="flex flex-col items-end">
                   <span className="text-gray-500">Balance ({CHAIN_CONFIG[sourceChain].name}):</span>
                   <span className="text-gray-700 dark:text-gray-300 font-semibold">{balance} EAGLE</span>
                 </div>
                 <button 
                   onClick={() => setAmount(balance)} 
                   disabled={isProcessing}
                   className="text-violet-500 font-bold hover:text-violet-600 px-2 py-1 rounded bg-violet-50 dark:bg-violet-900/20 disabled:opacity-50"
                 >
                   MAX
                 </button>
               </div>
            </div>
          </div>

          {/* Swap Indicator */}
          <div className="relative h-2 z-10 flex justify-center items-center">
            <button 
              onClick={handleSwapInputs}
              disabled={isProcessing}
              className="absolute bg-white dark:bg-[#222] border-4 border-white dark:border-black p-2 rounded-xl shadow-lg hover:scale-110 transition-all group disabled:opacity-50 disabled:hover:scale-100"
            >
              <ArrowDown className="w-4 h-4 text-gray-500 group-hover:text-violet-500" />
            </button>
          </div>

          {/* Destination Section */}
          <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-4 mt-1 relative group transition-colors hover:bg-gray-100 dark:hover:bg-[#161616]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</span>
              <ChainSelector 
                value={destChain} 
                onChange={handleDestChainChange}
                excludeChain={sourceChain}
                label="Select Destination Chain"
                disabled={isProcessing}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="w-full bg-transparent text-3xl font-bold text-gray-900 dark:text-white opacity-50">
                {estimatedOutput || '0.0'}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                <div className="relative">
                  <TokenIcon key={`eagle-${destChain}`} symbol="EAGLE" address={CHAIN_CONFIG[destChain].contracts?.EAGLE} className="w-8 h-8 rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    <ChainIcon key={`chain-${destChain}`} chain={destChain} className="w-full h-full p-[1px]" />
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">EAGLE</span>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center text-xs">
               <div className="flex flex-col">
                 <span className="text-gray-500">You'll receive:</span>
                 <span className="text-gray-700 dark:text-gray-300 font-semibold">{estimatedOutput} EAGLE</span>
               </div>
               {(quote || isQuoting) && (
                  <span className="flex items-center gap-1 text-violet-500 font-medium">
                    <Zap className="w-3 h-3" />
                    {isQuoting ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Quoting...
                      </span>
                    ) : quote ? (
                      `Fee: ${formatFee(quote.nativeFee, sourceChain)}`
                    ) : null}
                  </span>
               )}
            </div>
          </div>

          {/* Route Info */}
          <div className="px-4 py-3 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Route</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4"><ChainIcon key={`route-${sourceChain}`} chain={sourceChain} className="w-full h-full" /></div>
                <span className="text-gray-400">→</span>
                <div className="w-4 h-4"><ChainIcon key={`route-${destChain}`} chain={destChain} className="w-full h-full" /></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  LayerZero V2
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Estimated Time</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~2-5 minutes
              </span>
            </div>
            {quote && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">Bridge Fee</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {formatFee(quote.nativeFee, sourceChain)}
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <NeoButton
            onClick={handleExecute}
            disabled={!account || !amount || parseFloat(amount) <= 0 || isProcessing || isQuoting || parseFloat(amount) > parseFloat(balance)}
            className="w-full mt-4 py-4 text-lg font-bold !rounded-xl"
            variant={!amount ? 'secondary' : 'primary'}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                {getButtonText()}
              </span>
            ) : (
              getButtonText()
            )}
          </NeoButton>

        </NeoCard>

        {/* Supported Chains Footer */}
        <div className="mt-6">
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 mb-3 text-center">Supported Networks</div>
            <div className="flex justify-center gap-6 flex-wrap">
              {(Object.keys(CHAIN_CONFIG) as SupportedChain[]).map((chain) => {
                const config = CHAIN_CONFIG[chain];
                return (
                  <a 
                    key={chain}
                    href={config.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-10 h-10 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-violet-500 transition-colors shadow-sm">
                      <ChainIcon key={`footer-${chain}`} chain={chain} className="w-full h-full" />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-violet-500 transition-colors">
                      {config.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
          
          {/* LayerZero Badge */}
          <div className="flex justify-center mt-4">
            <a 
              href="https://layerzeroscan.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 hover:text-violet-500 transition-colors"
            >
              <Shield className="w-3 h-3" />
              Secured by LayerZero V2
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
