import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { PRIVY_CONFIG } from '../config/privy';

interface Props {
  children: React.ReactNode;
}

export function PrivyProvider({ children }: Props) {
  return (
    <BasePrivyProvider
      appId={PRIVY_CONFIG.appId}
      config={{
        loginMethods: PRIVY_CONFIG.loginMethods,
        appearance: PRIVY_CONFIG.appearance,
        defaultChain: PRIVY_CONFIG.defaultChain as any,
        supportedChains: PRIVY_CONFIG.supportedChains as any,
        embeddedWallets: PRIVY_CONFIG.embeddedWallets,
        legal: PRIVY_CONFIG.legal,
        walletConnectCloudProjectId: PRIVY_CONFIG.walletConnectCloudProjectId,
      }}
      onSuccess={(user) => {
        console.log('✅ Privy login successful:', user);
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}

