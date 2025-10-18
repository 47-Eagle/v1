import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import Header from './components/Header';
import StatsBanner from './components/StatsBanner';
import VaultOverview from './components/VaultOverview';
import StrategyBreakdown from './components/StrategyBreakdown';
import VaultActions from './components/VaultActions';
import WrapUnwrap from './components/WrapUnwrap';
import Toast from './components/Toast';

function App() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; txHash?: string } | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Check network and connection on load
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new BrowserProvider(window.ethereum);
          
          // Check network FIRST
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          setCurrentChainId(chainId);
          setWrongNetwork(chainId !== 1);
          
          if (chainId !== 1) {
            console.warn('⚠️ WRONG NETWORK! Current:', chainId, 'Need: 1 (Ethereum)');
          }
          
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0].address);
            setProvider(provider);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
          setProvider(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);
        setProvider(provider);
        
        // Check network after connecting
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        setCurrentChainId(chainId);
        setWrongNetwork(chainId !== 1);
      } catch (error) {
        console.error('Error connecting wallet:', error);
        setToast({ message: 'Failed to connect wallet', type: 'error' });
      }
    } else {
      setToast({ 
        message: 'Please install MetaMask or another Web3 wallet', 
        type: 'error' 
      });
    }
  };

  const switchToEthereum = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }],
      });
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      setToast({ message: 'Failed to switch network. Please switch manually in MetaMask.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#171717]">
      {/* BIG WARNING IF WRONG NETWORK */}
      {wrongNetwork && account && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 text-center font-bold shadow-lg">
          <div className="container mx-auto flex items-center justify-center gap-4">
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              ⚠️ WRONG NETWORK! You're on Chain {currentChainId}. Eagle Vault only works on Ethereum Mainnet (Chain 1).
            </span>
            <button
              onClick={switchToEthereum}
              className="ml-4 px-6 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-all"
            >
              Switch to Ethereum Now
            </button>
          </div>
        </div>
      )}
      
      <Header account={account} onConnect={connectWallet} provider={provider} />
      <StatsBanner />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <button className="flex items-center gap-2 text-eagle-gold-light hover:text-eagle-gold-lightest mb-6 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Vault Overview Card */}
        <VaultOverview provider={provider} account={account} />

        {/* Step Indicators (Dots) */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => setActiveStep(step as 1 | 2 | 3)}
              disabled={step === 3 && !account}
              className={`group flex items-center gap-2 transition-all duration-300 ${
                step === 3 && !account ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                activeStep === step
                  ? 'bg-eagle-gold text-black scale-110 shadow-lg shadow-eagle-gold/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-eagle-gold-light hover:scale-105'
              }`}>
                {step}
              </div>
              <span className={`text-sm font-medium transition-all ${
                activeStep === step 
                  ? 'text-eagle-gold-lightest' 
                  : 'text-gray-500 group-hover:text-gray-300'
              }`}>
                {step === 1 ? 'Strategies' : step === 2 ? 'Deposit' : 'Wrap'}
              </span>
            </button>
          ))}
        </div>

        {/* Carousel Container */}
        <div className="relative overflow-hidden min-h-[600px]">
          <div 
            className="flex transition-all duration-700 ease-in-out"
            style={{ transform: `translateX(-${(activeStep - 1) * 100}%)` }}
          >
            {/* Step 1: View Strategies */}
            <div className="min-w-full px-2">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-white mb-2">View Underlying Strategies</h2>
                <p className="text-gray-400">Understand where your assets will be deployed</p>
              </div>
              <StrategyBreakdown provider={provider} />
              
              {/* Next Button */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setActiveStep(2)}
                  className="px-10 py-4 bg-eagle-gold hover:bg-eagle-gold-dark text-black font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-eagle-gold/30 flex items-center gap-3 text-lg"
                >
                  Continue to Deposit
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Step 2: Deposit */}
            <div className="min-w-full px-2">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-white mb-2">Deposit to Earn</h2>
                <p className="text-gray-400">Deposit WLFI + USD1 to receive yield-bearing vEAGLE shares</p>
              </div>
              <VaultActions provider={provider} account={account} onConnect={connectWallet} onToast={setToast} />
              
              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-center gap-4">
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                
                {account && (
                  <button
                    onClick={() => setActiveStep(3)}
                    className="px-10 py-4 bg-eagle-gold hover:bg-eagle-gold-dark text-black font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-eagle-gold/30 flex items-center gap-3 text-lg"
                  >
                    Continue to Wrap
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Step 3: Wrap */}
            {account && (
              <div className="min-w-full px-2">
                <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-white mb-2">Wrap Your Shares</h2>
<p className="text-gray-400">Convert vault shares to tradable EAGLE tokens</p>
                </div>
                <WrapUnwrap provider={provider} account={account} onConnect={connectWallet} onToast={setToast} />
                
                {/* Back Button */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 text-center border-t border-gray-800">
        {/* Protocol Attribution */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-400 mb-4">
          <span>Powered by</span>
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreichw4b4wxvinfu4dmkloxajj4mm7672k6q3nyqzvdnvogvlbbycfq" 
            alt="Uniswap"
            className="h-4 w-4 inline"
          />
          <span className="text-gray-300">Uniswap</span>
          <span className="mx-1">•</span>
          <span>Managed by</span>
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu" 
            alt="Charm"
            className="h-4 w-4 inline"
          />
          <span className="text-gray-300">Charm</span>
          <span className="mx-1">•</span>
          <span>via</span>
          <img 
            src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreihml3nahd2duwdjg2ltoeixax2xdj2ldp5unnrjwntyicar74nwra" 
            alt="LayerZero"
            className="h-4 w-4 inline"
          />
          <span className="text-gray-300">LayerZero V2</span>
        </div>

        <p className="text-gray-500 mb-3">Eagle Vault © 2025 | Built on Ethereum</p>
        
        {/* Links */}
        <div className="flex items-center justify-center gap-4">
          <a href="#" className="text-gray-500 hover:text-eagle-gold transition-colors text-sm">Docs</a>
          <a href="#" className="text-gray-500 hover:text-eagle-gold transition-colors text-sm">GitHub</a>
          <a href="#" className="text-gray-500 hover:text-eagle-gold transition-colors text-sm">Twitter</a>
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

export default App;

