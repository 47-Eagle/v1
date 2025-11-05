import { SafeProvider as SafeSDKProvider } from '@safe-global/safe-apps-react-sdk';
import { ReactNode } from 'react';

interface SafeProviderProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides Safe Apps SDK context to the entire app
 * This enables the app to work both as a standalone app and as a Safe App
 */
export function SafeProvider({ children }: SafeProviderProps) {
  return (
    <SafeSDKProvider
      opts={{
        // Allow the app to work outside of Safe context
        allowedDomains: [/app.safe.global$/, /gnosis-safe.io$/],
        debug: process.env.NODE_ENV === 'development',
      }}
    >
      {children}
    </SafeSDKProvider>
  );
}

