import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { NeoButton } from './neumorphic/NeoButton';

export function WalletLinkPanel() {
  const { address: ethAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const solana = useSolanaWallet();

  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkWallets = async () => {
    if (!ethAddress || !solana.publicKey) {
      setError('Please connect both Ethereum and Solana wallets first');
      return;
    }

    try {
      setLinking(true);
      setError(null);

      // Step 1: Sign message with Ethereum wallet
      const ethMessage = `Link Ethereum wallet ${ethAddress} to Solana wallet ${solana.publicKey}`;
      const ethSignature = await signMessageAsync({ message: ethMessage });

      // Step 2: Sign message with Solana wallet
      const solanaMessage = `Link Solana wallet ${solana.publicKey} to Ethereum wallet ${ethAddress}`;
      const solanaSignature = await solana.signMessage(solanaMessage);

      // Step 3: Send to backend to store mapping
      const response = await fetch('/api/link-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethereumAddress: ethAddress,
          ethereumSignature: ethSignature,
          solanaAddress: solana.publicKey,
          solanaSignature: solanaSignature,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setLinked(true);
      console.log('✅ Wallets linked successfully!');
    } catch (err: any) {
      console.error('Failed to link wallets:', err);
      setError(err.message || 'Failed to link wallets');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-neo-bg-surface to-neo-bg-card dark:from-neo-bg-dark dark:to-neo-bg-surface rounded-2xl p-6 border border-neo-border-subtle dark:border-neo-border-dark shadow-neo-raised dark:shadow-neo-raised-dark">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFE7A3]/20 to-[#F2D57C]/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#F2D57C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neo-text-primary dark:text-neo-text-soft">
            Link Wallets
          </h3>
          <p className="text-sm text-neo-text-secondary dark:text-neo-text-soft/70">
            Auto-receive EAGLE on Solana after ETH deposits
          </p>
        </div>
      </div>

      {/* Ethereum Wallet */}
      <div className="mb-4 p-4 rounded-xl bg-neo-bg-card dark:bg-neo-bg-surface border border-neo-border-subtle dark:border-neo-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neo-text-secondary dark:text-neo-text-soft/60 mb-1">
              Ethereum Wallet
            </div>
            {ethAddress ? (
              <div className="font-mono text-sm text-[#F2D57C]">
                {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}
              </div>
            ) : (
              <div className="text-sm text-neo-text-secondary dark:text-neo-text-soft/60">
                Not connected
              </div>
            )}
          </div>
          {ethAddress && (
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Solana Wallet */}
      <div className="mb-6 p-4 rounded-xl bg-neo-bg-card dark:bg-neo-bg-surface border border-neo-border-subtle dark:border-neo-border-dark">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs font-medium text-neo-text-secondary dark:text-neo-text-soft/60 mb-1">
              Solana Wallet (Phantom)
            </div>
            {solana.publicKey ? (
              <div className="font-mono text-sm text-[#F2D57C]">
                {solana.publicKey.slice(0, 6)}...{solana.publicKey.slice(-4)}
              </div>
            ) : (
              <div className="text-sm text-neo-text-secondary dark:text-neo-text-soft/60">
                Not connected
              </div>
            )}
          </div>
          {solana.publicKey ? (
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : !solana.isPhantomInstalled ? (
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1 rounded-lg bg-[#F2D57C]/20 text-[#F2D57C] hover:bg-[#F2D57C]/30 transition-colors"
            >
              Install Phantom
            </a>
          ) : (
            <button
              onClick={solana.connect}
              disabled={solana.connecting}
              className="text-xs px-3 py-1 rounded-lg bg-[#F2D57C]/20 text-[#F2D57C] hover:bg-[#F2D57C]/30 transition-colors disabled:opacity-50"
            >
              {solana.connecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Link Button */}
      <NeoButton
        onClick={handleLinkWallets}
        disabled={!ethAddress || !solana.publicKey || linking || linked}
        className="w-full"
      >
        {linking ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Linking...
          </span>
        ) : linked ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Wallets Linked!
          </span>
        ) : (
          'Link Wallets'
        )}
      </NeoButton>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {linked && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-500/30">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            ✨ Your wallets are linked! EAGLE shares will auto-appear on Solana after Ethereum deposits.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-xl bg-neo-bg-card dark:bg-neo-bg-surface border border-neo-border-subtle dark:border-neo-border-dark">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-[#F2D57C] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-neo-text-secondary dark:text-neo-text-soft/70">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Deposit WLFI on Ethereum (pay ETH gas)</li>
              <li>Receive EAGLE on Ethereum instantly</li>
              <li>EAGLE auto-bridges to Solana (5-30 seconds, FREE)</li>
              <li>Use EAGLE in Solana DeFi, trade, or hold</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

