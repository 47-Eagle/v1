import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import { ethers } from 'ethers';
import { createPortal } from 'react-dom';
import { CONTRACTS } from '../config/contracts';

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

interface AdminPanelProps {
  onClose: () => void;
  provider: BrowserProvider | null;
}

export default function AdminPanel({ onClose, provider }: AdminPanelProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [idleBalances, setIdleBalances] = useState({ wlfi: '0', usd1: '0' });
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Check if connected wallet is authorized
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!provider) return;
      
      try {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setCurrentAddress(address);
        setIsAuthorized(AUTHORIZED_ADMINS.includes(address.toLowerCase()));
      } catch (error) {
        console.error('Error checking authorization:', error);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [provider]);

  // Fetch idle balances
  const fetchIdleBalances = useCallback(async () => {
    if (!provider) return;
    setLoadingBalances(true);
    try {
      const vault = new ethers.Contract(
        CONTRACTS.VAULT,
        ['function getVaultBalances() view returns (uint256 wlfi, uint256 usd1)'],
        provider
      );
      const [wlfi, usd1] = await vault.getVaultBalances();
      setIdleBalances({
        wlfi: parseFloat(formatEther(wlfi)).toFixed(2),
        usd1: parseFloat(formatEther(usd1)).toFixed(2)
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  }, [provider]);

  useEffect(() => {
    if (isAuthorized) {
      fetchIdleBalances();
    }
  }, [isAuthorized, fetchIdleBalances]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  // Use correct contract addresses from config
  const VAULT_ADDRESS = CONTRACTS.VAULT;
  const STRATEGY_USD1_ADDRESS = CONTRACTS.STRATEGY_USD1;
  const STRATEGY_WETH_ADDRESS = CONTRACTS.STRATEGY_WETH;

  const deployToStrategies = async () => {
    if (!provider) return;
    
    setLoading(true);
    setResult('');
    
    try {
      const signer = await provider.getSigner();
      const vault = new ethers.Contract(
        VAULT_ADDRESS,
        ['function forceDeployToStrategies() external'],
        signer
      );

      setResult(`⏳ Deploying ${idleBalances.wlfi} WLFI + ${idleBalances.usd1} USD1 to strategies...`);

      const tx = await vault.forceDeployToStrategies({
        gasLimit: 1500000
      });

      setResult(`⏳ Transaction sent: ${tx.hash}\nWaiting for confirmation...`);
      
      await tx.wait();
      setResult(`✅ Successfully deployed to strategies!\nTX: ${tx.hash}`);
      
      // Refresh balances after deployment
      setTimeout(fetchIdleBalances, 2000);
    } catch (error: any) {
      const errorMsg = error.reason || error.message || 'Unknown error';
      setResult(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const syncBalances = async () => {
    if (!provider) return;
    
    setLoading(true);
    setResult('');
    
    try {
      const signer = await provider.getSigner();
      const vault = new ethers.Contract(
        VAULT_ADDRESS,
        ['function syncBalances() external'],
        signer
      );

      setResult('⏳ Syncing vault balances...');

      const tx = await vault.syncBalances({
        gasLimit: 200000
      });

      setResult(`⏳ Transaction sent: ${tx.hash}\nWaiting for confirmation...`);
      await tx.wait();
      setResult(`✅ Balances synced!\nTX: ${tx.hash}`);
      
      // Refresh balances after sync
      setTimeout(fetchIdleBalances, 2000);
    } catch (error: any) {
      const errorMsg = error.reason || error.message || 'Unknown error';
      setResult(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const lowerThreshold = async () => {
    if (!provider) return;
    
    setLoading(true);
    setResult('');
    
    try {
      const signer = await provider.getSigner();
      const vault = new ethers.Contract(
        VAULT_ADDRESS,
        ['function setDeploymentParams(uint256 threshold, uint256 interval) external'],
        signer
      );

      const tx = await vault.setDeploymentParams(
        ethers.parseEther('10'),  // 10 WLFI threshold
        300  // 5 minutes
      );

      setResult(`⏳ Transaction sent: ${tx.hash}\nWaiting for confirmation...`);
      await tx.wait();
      setResult(`✅ Threshold set to 10 WLFI!\nTX: ${tx.hash}`);
    } catch (error: any) {
      const errorMsg = error.reason || error.message || 'Unknown error';
      setResult(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Show unauthorized message if not admin
  if (!isAuthorized && currentAddress) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
        <div className="bg-gradient-to-br from-red-900/50 via-black to-red-900/50 rounded-2xl border-2 border-red-500/30 p-8 max-w-md w-full shadow-2xl shadow-red-500/20">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h3>
            <p className="text-gray-400 mb-4">Your wallet is not authorized for admin access.</p>
            <p className="text-xs text-gray-500 font-mono break-all mb-6">{currentAddress}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl border-2 border-[#D4B474]/30 p-8 max-w-2xl w-full shadow-2xl shadow-eagle-gold/20 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-amber-600 bg-clip-text text-transparent">
                Admin Panel
              </h2>
              <p className="text-xs text-gray-500">🦅 Eagle Eyes Only</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contract Info */}
        <div className="mb-6 p-4 bg-black/40 rounded-xl border border-gray-800/50">
          <p className="text-xs text-gray-500 mb-2">Contract Addresses</p>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Vault:</span>
              <a href={`https://etherscan.io/address/${VAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#D4B474] transition-colors">
                {VAULT_ADDRESS.slice(0, 10)}...{VAULT_ADDRESS.slice(-8)}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">USD1 Strategy:</span>
              <a href={`https://etherscan.io/address/${STRATEGY_USD1_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#D4B474] transition-colors">
                {STRATEGY_USD1_ADDRESS.slice(0, 10)}...{STRATEGY_USD1_ADDRESS.slice(-8)}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">WETH Strategy:</span>
              <a href={`https://etherscan.io/address/${STRATEGY_WETH_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#D4B474] transition-colors">
                {STRATEGY_WETH_ADDRESS.slice(0, 10)}...{STRATEGY_WETH_ADDRESS.slice(-8)}
              </a>
            </div>
          </div>
        </div>

        {/* Idle Balances */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Idle Assets (Ready to Deploy)</p>
            <button
              onClick={fetchIdleBalances}
              disabled={loadingBalances}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {loadingBalances ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-black/30 rounded-lg">
              <p className="text-2xl font-bold text-white">{idleBalances.wlfi}</p>
              <p className="text-xs text-gray-500">WLFI</p>
            </div>
            <div className="text-center p-3 bg-black/30 rounded-lg">
              <p className="text-2xl font-bold text-white">{idleBalances.usd1}</p>
              <p className="text-xs text-gray-500">USD1</p>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Admin Actions</h3>
          
          {/* Deploy to Charm */}
          <button
            onClick={deployToCharm}
            disabled={loading || !provider}
            className="w-full group relative overflow-hidden px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 disabled:shadow-none"
          >
            <div className="relative flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span>Deploy to Charm Finance</span>
            </div>
          </button>

          {/* Lower Threshold */}
          <button
            onClick={lowerThreshold}
            disabled={loading || !provider}
            className="w-full group relative overflow-hidden px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 disabled:shadow-none"
          >
            <div className="relative flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Set Threshold to $10</span>
            </div>
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-xl border ${
            result.includes('✅') 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : result.includes('❌')
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            <p className="text-sm font-mono break-all">{result}</p>
            {result.includes('0x') && (
              <a 
                href={`https://etherscan.io/tx/${result.match(/0x[a-fA-F0-9]{64}/)?.[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-2 inline-block hover:text-white transition-colors"
              >
                View on Etherscan →
              </a>
            )}
          </div>
        )}

        {/* Secret Code Hint */}
        <div className="mt-6 pt-6 border-t border-gray-800/50">
          <p className="text-center text-xs text-gray-600">
            Secret code: <span className="font-mono text-gray-500">↑ ↑ ↓ ↓ A</span> • Authorized: <span className="text-green-400">{currentAddress.slice(0,6)}...{currentAddress.slice(-4)}</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

