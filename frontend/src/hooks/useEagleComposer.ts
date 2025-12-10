import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
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

const EAGLE_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function MAX_SUPPLY() external view returns (uint256)"
];

// Configuration - DEPLOYED ADDRESSES (Nov 10, 2025 - Updated)
const ADDRESSES = {
  COMPOSER: '0x3A91B3e863C0bd6948088e8A0A9B1D22d6D05da9', // EagleOVaultComposer V2
  WLFI: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',     // WLFI token (mainnet)
  EAGLE: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',    // EAGLE OFT V4
};

// Supply limits
const MAX_SUPPLY = BigInt(50_000_000) * parseEther('1'); // 50 Million EAGLE tokens

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
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper to get ethers provider from viem publicClient
  const getProvider = useCallback(() => {
    if (!publicClient) return null;
    return new ethers.BrowserProvider(window.ethereum as any);
  }, [publicClient]);
  
  // Helper to get ethers signer from viem walletClient
  const getSigner = useCallback(async () => {
    if (!walletClient) return null;
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    return provider.getSigner();
  }, [walletClient]);
  
  // ============================================
  // PREVIEW FUNCTIONS
  // ============================================
  
  /**
   * Preview deposit: WLFI → EAGLE
   */
  const previewDeposit = useCallback(async (
    wlfiAmount: bigint
  ): Promise<ComposerPreview | null> => {
    const provider = getProvider();
    if (!provider || wlfiAmount === 0n) return null;
    
    try {
      // First check if max supply would be exceeded
      const eagle = new Contract(ADDRESSES.EAGLE, EAGLE_ABI, provider);
      const currentSupply = await eagle.totalSupply();
      const remaining = MAX_SUPPLY - currentSupply;
      
      // If we're already at max supply, show the error
      if (remaining <= 0n) {
        setError('MAX_SUPPLY_REACHED');
        return null;
      }
      
      const composer = new Contract(ADDRESSES.COMPOSER, COMPOSER_ABI, provider);
      const eagleOut = await composer.previewDepositAndWrap(wlfiAmount);
      
      // Check if the output would exceed remaining supply
      if (eagleOut > remaining) {
        setError('MAX_SUPPLY_REACHED');
        return null;
      }
      
      const conversionRate = Number(eagleOut) / Number(wlfiAmount) * 100;
      const fee = wlfiAmount - eagleOut;
      const feePercentage = Number(fee) / Number(wlfiAmount) * 100;
      
      setError(null); // Clear any previous error
      return {
        inputAmount: wlfiAmount,
        outputAmount: eagleOut,
        conversionRate,
        estimatedFee: fee,
        feePercentage
      };
    } catch (err: any) {
      console.error('Preview deposit failed:', err);
      
      // Check for max supply errors
      const errorMsg = err.reason || err.message || '';
      if (errorMsg.includes('max supply') || errorMsg.includes('MaxSupply') || errorMsg.includes('exceeds')) {
        setError('MAX_SUPPLY_REACHED');
        return null;
      }
      
      // Check for StalePrice error (0x19abf40e)
      if (err.data === '0x19abf40e' || errorMsg.includes('0x19abf40e')) {
        setError('Oracle prices are stale. Cannot preview deposit at this time.');
        return null;
      }
      
      // Generic revert - could be max supply
      if (errorMsg.includes('execution reverted') || errorMsg.includes('revert')) {
        setError('MAX_SUPPLY_REACHED');
        return null;
      }
      
      setError(errorMsg);
      return null;
    }
  }, [getProvider]);
  
  /**
   * Preview redeem: EAGLE → WLFI
   */
  const previewRedeem = useCallback(async (
    eagleAmount: bigint
  ): Promise<ComposerPreview | null> => {
    const provider = getProvider();
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
      
      // Check for StalePrice error (0x19abf40e)
      let errorMsg = err.message;
      if (err.data === '0x19abf40e' || errorMsg.includes('0x19abf40e')) {
        errorMsg = 'Oracle prices are stale. Cannot preview redeem at this time.';
      }
      
      setError(errorMsg);
      return null;
    }
  }, [getProvider]);
  
  /**
   * Check if max supply has been reached
   */
  const checkMaxSupply = useCallback(async (): Promise<{
    isMaxReached: boolean;
    currentSupply: bigint;
    maxSupply: bigint;
    remaining: bigint;
  }> => {
    const provider = getProvider();
    if (!provider) {
      return {
        isMaxReached: false,
        currentSupply: 0n,
        maxSupply: MAX_SUPPLY,
        remaining: MAX_SUPPLY
      };
    }
    
    try {
      const eagle = new Contract(ADDRESSES.EAGLE, EAGLE_ABI, provider);
      const currentSupply = await eagle.totalSupply();
      const isMaxReached = currentSupply >= MAX_SUPPLY;
      const remaining = isMaxReached ? 0n : MAX_SUPPLY - currentSupply;
      
      return {
        isMaxReached,
        currentSupply,
        maxSupply: MAX_SUPPLY,
        remaining
      };
    } catch (err: any) {
      console.error('Check max supply failed:', err);
      return {
        isMaxReached: false,
        currentSupply: 0n,
        maxSupply: MAX_SUPPLY,
        remaining: MAX_SUPPLY
      };
    }
  }, [getProvider]);
  
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
    if (!address) {
      const err = 'Wallet not connected';
      setError(err);
      onError?.(err);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('Failed to get signer');
      }
      
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
      
      let errorMsg = err.reason || err.message || 'Transaction failed';
      
      // Check for max supply errors first
      if (errorMsg.includes('max supply') || errorMsg.includes('MaxSupply') || errorMsg.includes('exceeds')) {
        errorMsg = 'MAX_SUPPLY_REACHED';
      }
      // Check for StalePrice error (0x19abf40e)
      else if (err.data === '0x19abf40e' || errorMsg.includes('0x19abf40e')) {
        errorMsg = '⚠️ Oracle prices are stale. The protocol needs fresh price updates to process deposits. Please try again in a few minutes or contact support.';
      } 
      // Generic revert - likely max supply
      else if (errorMsg.includes('execution reverted')) {
        errorMsg = 'MAX_SUPPLY_REACHED';
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
      return null;
    }
  }, [getSigner, address]);
  
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
    if (!address) {
      const err = 'Wallet not connected';
      setError(err);
      onError?.(err);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('Failed to get signer');
      }
      
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
      
      // Check for StalePrice error (0x19abf40e)
      let errorMsg = err.reason || err.message || 'Transaction failed';
      if (err.data === '0x19abf40e' || errorMsg.includes('0x19abf40e')) {
        errorMsg = '⚠️ Oracle prices are stale. The protocol needs fresh price updates to process withdrawals. Please try again in a few minutes or contact support.';
      } else if (errorMsg.includes('execution reverted')) {
        errorMsg = 'Transaction would fail. This may be due to stale price oracles or insufficient liquidity. Please try again later.';
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
      return null;
    }
  }, [getSigner, address]);
  
  // ============================================
  // BALANCES
  // ============================================
  
  /**
   * Get user balances
   */
  const getBalances = useCallback(async () => {
    const provider = getProvider();
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
  }, [getProvider, address]);
  
  // ============================================
  // APPROVAL HELPERS
  // ============================================
  
  /**
   * Check if WLFI/EAGLE is approved for given amount
   */
  const checkAllowance = useCallback(async (
    token: 'wlfi' | 'eagle',
    amount: bigint
  ): Promise<boolean> => {
    const provider = getProvider();
    if (!provider || !address) return false;
    
    try {
      const tokenAddress = token === 'wlfi' ? ADDRESSES.WLFI : ADDRESSES.EAGLE;
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      const allowance = await tokenContract.allowance(address, ADDRESSES.COMPOSER);
      
      return allowance >= amount;
    } catch (err) {
      console.error('Failed to check allowance:', err);
      return false;
    }
  }, [getProvider, address]);
  
  /**
   * Approve WLFI/EAGLE for Composer
   */
  const approveToken = useCallback(async (
    token: 'wlfi' | 'eagle',
    amount: bigint,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ): Promise<boolean> => {
    if (!address) {
      const err = 'Wallet not connected';
      setError(err);
      onError?.(err);
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('Failed to get signer');
      }
      
      const tokenAddress = token === 'wlfi' ? ADDRESSES.WLFI : ADDRESSES.EAGLE;
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      console.log(`Approving ${token.toUpperCase()}...`);
      const tx = await tokenContract.approve(ADDRESSES.COMPOSER, amount);
      await tx.wait();
      console.log(`✅ ${token.toUpperCase()} approved`);
      
      onSuccess?.();
      setLoading(false);
      return true;
      
    } catch (err: any) {
      console.error('Approval failed:', err);
      const errorMsg = err.reason || err.message || 'Approval failed';
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
      return false;
    }
  }, [getSigner, address]);
  
  return {
    // Functions
    previewDeposit,
    previewRedeem,
    depositWLFI,
    redeemEAGLE,
    getBalances,
    checkAllowance,
    approveToken,
    checkMaxSupply,
    
    // State
    loading,
    error,
    isConnected: !!address,
    
    // Addresses (for reference)
    addresses: ADDRESSES
  };
}
