// Ethereum object patch to prevent React DevTools conflicts
// This addresses the "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED" error

export function patchEthereumObject() {
  // Wait for ethereum object to be available (MetaMask injection)
  const checkAndPatch = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Create a proxy that handles React's internal property access
        const originalEthereum = window.ethereum;

        // Patch the ethereum object to handle React's internal property checks
        const patchedEthereum = new Proxy(originalEthereum, {
          get(target, prop) {
            // Handle React's internal property access
            if (prop === '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED') {
              return undefined;
            }

            // Handle other React internal properties that might be accessed
            if (prop === '$$typeof' || prop === '_owner' || prop === '_store') {
              return undefined;
            }

            // Return the original property
            return target[prop];
          },

          // Prevent defineProperty conflicts that can cause issues
          defineProperty(target, prop, descriptor) {
            try {
              return Object.defineProperty(target, prop, descriptor);
            } catch (error) {
              // Silently ignore defineProperty errors on ethereum object
              console.warn(`Failed to define property ${String(prop)} on ethereum object:`, error);
              return false;
            }
          },

          // Handle property descriptors to prevent conflicts
          getOwnPropertyDescriptor(target, prop) {
            try {
              const descriptor = Object.getOwnPropertyDescriptor(target, prop);
              if (descriptor) {
                return descriptor;
              }
              // Return a default descriptor for React internal properties
              return {
                configurable: true,
                enumerable: false,
                writable: false,
                value: undefined
              };
            } catch (error) {
              // Return safe descriptor if getOwnPropertyDescriptor fails
              return {
                configurable: true,
                enumerable: false,
                writable: false,
                value: undefined
              };
            }
          }
        });

        // Apply the patch
        window.ethereum = patchedEthereum;

        // Also patch any ethereum providers that might exist
        if (window.ethereum.providers) {
          window.ethereum.providers = window.ethereum.providers.map(provider => {
            return new Proxy(provider, {
              get(target, prop) {
                if (prop === '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED') {
                  return undefined;
                }
                return target[prop];
              },
              defineProperty(target, prop, descriptor) {
                try {
                  return Object.defineProperty(target, prop, descriptor);
                } catch (error) {
                  return false;
                }
              }
            });
          });
        }

        console.log('Ethereum object patched successfully');
      } catch (error) {
        console.warn('Failed to patch ethereum object:', error);
      }
    }
  };

  // Check immediately
  checkAndPatch();

  // Also check periodically in case ethereum is injected later
  const interval = setInterval(() => {
    if (window.ethereum) {
      checkAndPatch();
      clearInterval(interval);
    }
  }, 100);

  // Clear interval after 10 seconds to avoid infinite checking
  setTimeout(() => clearInterval(interval), 10000);
}

// Alternative approach: Global defineProperty patch
export function patchDefineProperty() {
  const originalDefineProperty = Object.defineProperty;

  Object.defineProperty = function(obj, prop, descriptor) {
    try {
      // Special handling for ethereum object
      if (obj === window.ethereum ||
          (window.ethereum && obj === window.ethereum.providers?.[0])) {
        // Skip defineProperty calls on ethereum objects that might conflict
        if (prop === '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED' ||
            prop === '$$typeof' ||
            prop === '_owner' ||
            prop === '_store') {
          return obj;
        }
      }

      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      // If defineProperty fails, try a fallback approach
      try {
        obj[prop] = descriptor.value;
        return obj;
      } catch (fallbackError) {
        // If all else fails, silently ignore
        console.warn(`defineProperty patch: Failed to set property ${String(prop)}:`, error);
        return obj;
      }
    }
  };
}
