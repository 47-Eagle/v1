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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl border-2 border-eagle-gold/30 p-10 max-w-lg w-full shadow-2xl shadow-eagle-gold/20 animate-in slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-eagle-gold to-yellow-600 rounded-2xl flex items-center justify-center">
            <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-eagle-gold via-yellow-400 to-eagle-gold bg-clip-text text-transparent mb-2">
            Admin Access
          </h2>
          <p className="text-gray-400">Choose your authentication method</p>
        </div>

        {/* Option 1: Google OAuth */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 text-center mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold mr-2">1</span>
            Google Authentication
          </p>
          <div className="flex justify-center">
            <GoogleAuthLogin />
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Only <span className="text-eagle-gold">@47eagle.com</span> accounts
          </p>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-3 text-gray-500">OR</span>
          </div>
        </div>

        {/* Option 2: Wallet Authorization */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 text-center mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold mr-2">2</span>
            Authorized Wallet
          </p>
          {currentAddress ? (
            <div className={`p-5 rounded-xl border transition-all duration-300 ${
              isWalletAuthorized 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                  <p className="text-sm font-mono text-white">{currentAddress.slice(0, 10)}...{currentAddress.slice(-8)}</p>
                </div>
                <div className={`w-4 h-4 rounded-full ${
                  isWalletAuthorized ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
              </div>
              <p className={`text-sm font-semibold ${isWalletAuthorized ? 'text-green-400' : 'text-red-400'}`}>
                {isWalletAuthorized ? '✓ Authorized - Opening admin panel...' : '✗ Not authorized for admin access'}
              </p>
            </div>
          ) : (
            <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700 text-center">
              <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-sm text-gray-400">No wallet connected</p>
              <p className="text-xs text-gray-500 mt-1">Connect an authorized wallet</p>
            </div>
          )}
        </div>

        {/* Secret Code Easter Egg */}
        <div className="mt-8 pt-6 border-t border-gray-800/50">
          <p className="text-center text-xs text-gray-600">
            <span className="inline-block">🦅 Secret code unlocked:</span>
            <span className="ml-2 font-mono text-eagle-gold/50">↑ ↑ ↓ ↓ A</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

