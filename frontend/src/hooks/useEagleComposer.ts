import { useState, useCallback } from 'react';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { ethers, Contract } from 'ethers';
import { parseEther, formatEther } from 'viem';

// Composer ABI - key functions only
const COMPOSER_ABI = [
  "function depositAndWrap(uint256 assets, address receiver) external returns (uint256 eagleAmount)",
  "function unwrapAndRedeem(uint256 eagleAmount, address receiver) external returns (uint256 assets)",
  "function previewDepositAndWrap(uint256 assets) external view returns (uint256 eagleAmount)",
  "function previewUnwrapAndRedeem(uint256 eagleAmount) external view returns (uint256 assets)",
  "function getContracts() external view returns (address vault, address wrapper, address eagle, address asset, address registry)",
  "event DepositedAndWrapped(address indexed user, uint256 assetsIn, uint256 eagleOut)",
  "event UnwrappedAndRedeemed(address indexed user, uint256 eagleIn, uint256 assetsOut)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// Configuration - UPDATE THESE
const ADDRESSES = {
  COMPOSER: '0x...', // Your EagleOVaultComposer address
  WLFI: '0x...',     // WLFI token address
  EAGLE: '0x...',    // EAGLE OFT address
};

export interface ComposerPreview {
  inputAmount: bigint;
  outputAmount: bigint;
  conversionRate: number; // percentage
  estimatedFee: bigint;
  feePercentage: number;
}

export interface ComposerTransaction {
  hash: string;
  inputAmount: bigint;
  outputAmount: bigint;
  gasUsed: bigint;
}

/**
 * Hook for interacting with EagleOVaultComposer
 * Provides easy-to-use functions for deposit/redeem operations
 */
export function useEagleComposer() {
  const { address } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ============================================
  // PREVIEW FUNCTIONS
  // ============================================
  
  /**
   * Preview deposit: WLFI → EAGLE
   */
  const previewDeposit = useCallback(async (
    wlfiAmount: bigint
  ): Promise<ComposerPreview | null> => {
    if (!provider || wlfiAmount === 0n) return null;
    
    try {
      const composer = new Contract(ADDRESSES.COMPOSER, COMPOSER_ABI, provider);
      const eagleOut = await composer.previewDepositAndWrap(wlfiAmount);
      
      const conversionRate = Number(eagleOut) / Number(wlfiAmount) * 100;
      const fee = wlfiAmount - eagleOut;
      const feePercentage = Number(fee) / Number(wlfiAmount) * 100;
      
      return {
        inputAmount: wlfiAmount,
        outputAmount: eagleOut,
        conversionRate,
        estimatedFee: fee,
        feePercentage
      };
    } catch (err: any) {
      console.error('Preview deposit failed:', err);
      setError(err.message);
      return null;
    }
  }, [provider]);
  
  /**
   * Preview redeem: EAGLE → WLFI
   */
  const previewRedeem = useCallback(async (
    eagleAmount: bigint
  ): Promise<ComposerPreview | null> => {
    if (!provider || eagleAmount === 0n) return null;
    
    try {
      const composer = new Contract(ADDRESSES.COMPOSER, COMPOSER_ABI, provider);
      const wlfiOut = await composer.previewUnwrapAndRedeem(eagleAmount);
      
      const conversionRate = Number(wlfiOut) / Number(eagleAmount) * 100;
      const fee = eagleAmount - wlfiOut;
      const feePercentage = Number(fee) / Number(eagleAmount) * 100;
      
      return {
        inputAmount: eagleAmount,
        outputAmount: wlfiOut,
        conversionRate,
        estimatedFee: fee,
        feePercentage
      };
    } catch (err: any) {
      console.error('Preview redeem failed:', err);
      setError(err.message);
      return null;
    }
  }, [provider]);
  
  // ============================================
  // DEPOSIT: WLFI → EAGLE
  // ============================================
  
  /**
   * Deposit WLFI and receive EAGLE
   * One-click operation that handles approval + deposit
   */
  const depositWLFI = useCallback(async (
    wlfiAmount: bigint,
    onSuccess?: (tx: ComposerTransaction) => void,
    onError?: (error: string) => void
  ): Promise<ComposerTransaction | null> => {
    if (!signer || !address) {
      const err = 'Wallet not connected';
      setError(err);
      onError?.(err);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const composer = new Contract(ADDRESSES.COMPOSER, COMPOSER_ABI, signer);
      const wlfi = new Contract(ADDRESSES.WLFI, ERC20_ABI, signer);
      
      // Step 1: Check allowance
      const allowance = await wlfi.allowance(address, ADDRESSES.COMPOSER);
      
      if (allowance < wlfiAmount) {
        console.log('Approving WLFI...');
        const approveTx = await wlfi.approve(ADDRESSES.COMPOSER, wlfiAmount);
        await approveTx.wait();
        console.log('✅ WLFI approved');
      }
      
      // Step 2: Deposit and wrap
      console.log('Depositing and wrapping...');
      const tx = await composer.depositAndWrap(wlfiAmount, address);
      const receipt = await tx.wait();
      console.log('✅ Deposit completed');
      
      // Parse event to get actual output
      const event = receipt.logs
        .map((log: any) => {
          try {
            return composer.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed?.name === 'DepositedAndWrapped');
      
      const outputAmount = event?.args?.eagleOut || 0n;
      
      const result: ComposerTransaction = {
        hash: receipt.hash,
        inputAmount: wlfiAmount,
        outputAmount,
        gasUsed: receipt.gasUsed
      };
      
      onSuccess?.(result);
      setLoading(false);
      return result;
      
    } catch (err: any) {
      console.error('Deposit failed:', err);
      const errorMsg = err.reason || err.message || 'Transaction failed';
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
      return null;
    }
  }, [signer, address]);
  
  // ============================================
  // REDEEM: EAGLE → WLFI
  // ============================================
  
  /**
   * Redeem EAGLE and receive WLFI
   * One-click operation that handles approval + redeem
   */
  const redeemEAGLE = useCallback(async (
    eagleAmount: bigint,
    onSuccess?: (tx: ComposerTransaction) => void,
    onError?: (error: string) => void
  ): Promise<ComposerTransaction | null> => {
    if (!signer || !address) {
      const err = 'Wallet not connected';
      setError(err);
      onError?.(err);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const composer = new Contract(ADDRESSES.COMPOSER, COMPOSER_ABI, signer);
      const eagle = new Contract(ADDRESSES.EAGLE, ERC20_ABI, signer);
      
      // Step 1: Check allowance
      const allowance = await eagle.allowance(address, ADDRESSES.COMPOSER);
      
      if (allowance < eagleAmount) {
        console.log('Approving EAGLE...');
        const approveTx = await eagle.approve(ADDRESSES.COMPOSER, eagleAmount);
        await approveTx.wait();
        console.log('✅ EAGLE approved');
      }
      
      // Step 2: Unwrap and redeem
      console.log('Unwrapping and redeeming...');
      const tx = await composer.unwrapAndRedeem(eagleAmount, address);
      const receipt = await tx.wait();
      console.log('✅ Redeem completed');
      
      // Parse event to get actual output
      const event = receipt.logs
        .map((log: any) => {
          try {
            return composer.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed?.name === 'UnwrappedAndRedeemed');
      
      const outputAmount = event?.args?.assetsOut || 0n;
      
      const result: ComposerTransaction = {
        hash: receipt.hash,
        inputAmount: eagleAmount,
        outputAmount,
        gasUsed: receipt.gasUsed
      };
      
      onSuccess?.(result);
      setLoading(false);
      return result;
      
    } catch (err: any) {
      console.error('Redeem failed:', err);
      const errorMsg = err.reason || err.message || 'Transaction failed';
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
      return null;
    }
  }, [signer, address]);
  
  // ============================================
  // BALANCES
  // ============================================
  
  /**
   * Get user balances
   */
  const getBalances = useCallback(async () => {
    if (!provider || !address) return { wlfi: 0n, eagle: 0n };
    
    try {
      const wlfi = new Contract(ADDRESSES.WLFI, ERC20_ABI, provider);
      const eagle = new Contract(ADDRESSES.EAGLE, ERC20_ABI, provider);
      
      const [wlfiBalance, eagleBalance] = await Promise.all([
        wlfi.balanceOf(address),
        eagle.balanceOf(address)
      ]);
      
      return {
        wlfi: wlfiBalance,
        eagle: eagleBalance
      };
    } catch (err) {
      console.error('Failed to get balances:', err);
      return { wlfi: 0n, eagle: 0n };
    }
  }, [provider, address]);
  
  return {
    // Functions
    previewDeposit,
    previewRedeem,
    depositWLFI,
    redeemEAGLE,
    getBalances,
    
    // State
    loading,
    error,
    isConnected: !!address,
    
    // Addresses (for reference)
    addresses: ADDRESSES
  };
}

