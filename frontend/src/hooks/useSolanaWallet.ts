import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';

// Phantom Wallet types
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array }>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      off: (event: string, callback: (...args: any[]) => void) => void;
      publicKey?: PublicKey;
    };
  }
}

export interface SolanaWalletState {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  error: string | null;
}

export function useSolanaWallet() {
  const [state, setState] = useState<SolanaWalletState>({
    connected: false,
    connecting: false,
    publicKey: null,
    error: null,
  });

  // Check if Phantom is installed
  const isPhantomInstalled = typeof window !== 'undefined' && window.solana?.isPhantom;

  // Connect to Phantom
  const connect = useCallback(async () => {
    if (!window.solana) {
      setState(prev => ({
        ...prev,
        error: 'Phantom wallet not found. Please install it from phantom.app',
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, connecting: true, error: null }));

      const response = await window.solana.connect();
      const pubkey = response.publicKey.toBase58();

      setState({
        connected: true,
        connecting: false,
        publicKey: pubkey,
        error: null,
      });

      console.log('Solana wallet connected:', pubkey);
    } catch (error: any) {
      setState({
        connected: false,
        connecting: false,
        publicKey: null,
        error: error.message || 'Failed to connect to Phantom',
      });
    }
  }, []);

  // Disconnect from Phantom
  const disconnect = useCallback(async () => {
    if (!window.solana) return;

    try {
      await window.solana.disconnect();
      setState({
        connected: false,
        connecting: false,
        publicKey: null,
        error: null,
      });

      console.log('Solana wallet disconnected');
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to disconnect from Phantom',
      }));
    }
  }, []);

  // Sign message for wallet linking
  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!window.solana || !state.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await window.solana.signMessage(encodedMessage, 'utf8');
      
      // Convert signature to base64
      const signatureBase64 = Buffer.from(signature).toString('base64');
      return signatureBase64;
    } catch (error: any) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }, [state.connected]);

  // Auto-connect if previously connected
  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      // Try to connect if user was previously connected
      window.solana.connect({ onlyIfTrusted: true }).catch(() => {
        // User hasn't connected before, that's okay
      });
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.solana) return;

    const handleAccountChanged = (publicKey: PublicKey | null) => {
      if (publicKey) {
        setState(prev => ({
          ...prev,
          publicKey: publicKey.toBase58(),
          connected: true,
        }));
      } else {
        setState({
          connected: false,
          connecting: false,
          publicKey: null,
          error: null,
        });
      }
    };

    window.solana.on('accountChanged', handleAccountChanged);
    window.solana.on('disconnect', () => handleAccountChanged(null));

    return () => {
      window.solana?.off('accountChanged', handleAccountChanged);
      window.solana?.off('disconnect', () => handleAccountChanged(null));
    };
  }, []);

  return {
    ...state,
    isPhantomInstalled,
    connect,
    disconnect,
    signMessage,
  };
}

