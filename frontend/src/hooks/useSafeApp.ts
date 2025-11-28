import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';
import { useEffect, useState } from 'react';

/**
 * Hook to detect if the app is running inside a Safe App iframe
 * and provide Safe-specific functionality
 */
export function useSafeApp() {
  const { safe, sdk, connected } = useSafeAppsSDK();
  const [isSafeApp, setIsSafeApp] = useState(false);

  useEffect(() => {
    // Check if we're running inside a Safe App iframe
    const checkSafeContext = async () => {
      try {
        // If we have safe info, we're in a Safe App
        if (safe.safeAddress && safe.chainId) {
          setIsSafeApp(true);
        }
      } catch (error) {
        console.log('Not running as Safe App');
        setIsSafeApp(false);
      }
    };

    checkSafeContext();
  }, [safe, connected]);

  return {
    // Safe context
    isSafeApp,
    safeAddress: safe.safeAddress,
    chainId: safe.chainId,
    
    // SDK methods
    sdk,
    connected,
    
    // Safe info
    safe,
    
    // Check if current user is the Safe multisig
    isSafeMultisig: (multisigAddress?: string) => {
      if (!multisigAddress || !safe.safeAddress) return false;
      return safe.safeAddress.toLowerCase() === multisigAddress.toLowerCase();
    }
  };
}

