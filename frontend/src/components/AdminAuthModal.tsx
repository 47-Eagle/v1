import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BrowserProvider } from 'ethers';
import { GoogleAuthLogin, useAuth } from '../lib/GoogleAuth';

// Authorized admin wallets
const AUTHORIZED_ADMINS = [
  '0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3', // Multisig
  '0xc7027dACCa23C029e6EAfCD6C027f1124cF48F07', // AC
  '0xEdA067447102cb38D95e14ce99fe21D55C27152D', // AKITA, LLC
  '0x4711068C4030d58F494705c4b1DD63c5237A7733', // Slynapes
  '0x5A29149bE2006A6dADAaC43F42704551FD4f8140', // SirJigs
  '0x58f7EE4150A4cb484d93a767Bf6d9d7DDb468771', // Vince
  '0x7310Dd6EF89b7f829839F140C6840bc929ba2031', // Deployer
].map(addr => addr.toLowerCase());

interface AdminAuthModalProps {
  onClose: () => void;
  onAuthenticated: () => void;
  provider: BrowserProvider | null;
}

export default function AdminAuthModal({ onClose, onAuthenticated, provider }: AdminAuthModalProps) {
  const [currentAddress, setCurrentAddress] = useState('');
  const [isWalletAuthorized, setIsWalletAuthorized] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Check wallet authorization
  useEffect(() => {
    const checkWallet = async () => {
      if (!provider) return;
      
      try {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setCurrentAddress(address);
        const authorized = AUTHORIZED_ADMINS.includes(address.toLowerCase());
        setIsWalletAuthorized(authorized);
        
        // Auto-proceed if authorized
        if (authorized) {
          setTimeout(() => onAuthenticated(), 500);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    };

    checkWallet();
  }, [provider, onAuthenticated]);

  // Auto-proceed if Google authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setTimeout(() => onAuthenticated(), 500);
    }
  }, [isAuthenticated, onAuthenticated]);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#0a0a0a]/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#0a0a0a]/60 backdrop-blur-lg border border-eagle-gold/30 rounded-3xl p-10 max-w-lg w-full relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          title="Close"
        >
          ×
        </button>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">🔐 Admin Access</h2>
          <p className="text-gray-400">Authentication required to continue</p>
        </div>

        {/* Google Auth Option */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 text-center mb-4">Option 1: Google Authentication</p>
          <div className="flex justify-center">
            <GoogleAuthLogin />
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">Only @47eagle.com accounts</p>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0a0a0a] px-2 text-gray-500">OR</span>
          </div>
        </div>

        {/* Wallet Auth Status */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 text-center mb-4">Option 2: Authorized Wallet</p>
          {currentAddress ? (
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                  <p className="text-sm font-mono text-white">{currentAddress.slice(0, 6)}...{currentAddress.slice(-4)}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${isWalletAuthorized ? 'bg-green-400' : 'bg-red-400'}`}></div>
              </div>
              <p className={`text-xs mt-2 ${isWalletAuthorized ? 'text-green-400' : 'text-red-400'}`}>
                {isWalletAuthorized ? '✓ Authorized' : '✗ Not authorized'}
              </p>
            </div>
          ) : (
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 text-center">
              <p className="text-sm text-gray-400">No wallet connected</p>
              <p className="text-xs text-gray-500 mt-1">Connect an authorized wallet to access</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

