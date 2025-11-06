import { SafeProvider as SafeSDKProvider } from '@safe-global/safe-apps-react-sdk';
import { ReactNode } from 'react';

interface SafeProviderProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides Safe Apps SDK context to the entire app
 * This enables the app to work both as a standalone app and as a Safe App
 * 
 * The SDK is designed to work in both contexts - it will automatically
 * detect if it's running in a Safe iframe or standalone
 */
export function SafeProvider({ children }: SafeProviderProps) {
  return (
    <SafeSDKProvider
      opts={{
        allowedDomains: [/app.safe.global$/, /gnosis-safe.io$/],
        debug: import.meta.env.DEV,
      }}
    >
      {children}
    </SafeSDKProvider>
  );
}

