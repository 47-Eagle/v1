import { useState } from 'react';
import { BrowserProvider } from 'ethers';
import { AuthProvider } from './lib/GoogleAuth';
import Header from './components/Header';
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

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);
        setProvider(provider);
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#171717]">
        <Header account={account} onConnect={connectWallet} />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <button className="flex items-center gap-2 text-eagle-gold-light hover:text-eagle-gold-lightest mb-6 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Protocol Badges - Above Hero */}
        <div className="text-center text-sm text-gray-400 mb-4">
          <span>Powered by </span>
          <span className="text-gray-300">Uniswap</span>
          <span className="mx-2">•</span>
          <span>Managed by </span>
          <span className="text-gray-300">Charm</span>
          <span className="mx-2">•</span>
          <span>via </span>
          <span className="text-gray-300">LayerZero V2</span>
        </div>

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
    </AuthProvider>
  );
}

export default App;

