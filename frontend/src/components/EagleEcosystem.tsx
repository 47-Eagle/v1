import { motion } from 'framer-motion';
import { useState } from 'react';
import EagleHome from './EagleHome';
import EagleLP from './EagleLP';
import FloorIndicator from './FloorIndicator';
import { BrowserProvider } from 'ethers';

export type Floor = 'lp' | 'home' | 'vault';

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
  VaultComponent: React.ComponentType<any>;
}

export default function EagleEcosystem({ provider, account, onToast, VaultComponent }: Props) {
  const [currentFloor, setCurrentFloor] = useState<Floor>('home');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Vertical offset for each floor (in viewport height)
  const floorOffsets: Record<Floor, number> = {
    'lp': 0,      // Top floor at 0vh
    'home': 100,  // Main floor at 100vh  
    'vault': 200  // Vault at 200vh (basement)
  };

  const navigateToFloor = (floor: Floor) => {
    setIsTransitioning(true);
    setCurrentFloor(floor);
    
    // Scroll to top of the floor container after transition starts
    setTimeout(() => {
      const floorContainer = document.getElementById(`${floor}-floor`);
      if (floorContainer) {
        const scrollContainer = floorContainer.querySelector('.overflow-y-auto');
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      }
    }, 100);
    
    setTimeout(() => setIsTransitioning(false), 800);
  };

  const currentOffset = floorOffsets[currentFloor];

  return (
    <div className="h-[calc(100vh-64px-80px)] overflow-hidden relative">
      {/* Animated Container */}
      <motion.div
        className="absolute w-full"
        animate={{ 
          y: `${-currentOffset}vh` 
        }}
        transition={{ 
          type: "spring",
          stiffness: 60,
          damping: 25,
          mass: 0.8,
          duration: 0.8
        }}
      >
        {/* Top Floor - EAGLE/ETH LP */}
        <div className="h-[calc(100vh-64px-80px)]" id="lp-floor">
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'lp' ? 0.5 : 1,
              scale: isTransitioning && currentFloor !== 'lp' ? 0.98 : 1
            }}
            className="h-full"
          >
            <EagleLP 
              onNavigateDown={() => navigateToFloor('home')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Main Floor - Home */}
        <div className="h-[calc(100vh-64px-80px)]" id="home-floor">
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'home' ? 0.5 : 1,
              scale: isTransitioning && currentFloor !== 'home' ? 0.98 : 1
            }}
            className="h-full"
          >
            <EagleHome 
              onNavigateUp={() => navigateToFloor('lp')}
              onNavigateDown={() => navigateToFloor('vault')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Basement - Vault */}
        <div className="h-[calc(100vh-64px-80px)]" id="vault-floor">
          <div className="h-full overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
            <motion.div
              key={currentFloor}
              animate={{
                opacity: isTransitioning && currentFloor !== 'vault' ? 0.5 : 1,
                scale: isTransitioning && currentFloor !== 'vault' ? 0.98 : 1
              }}
              className="min-h-full"
            >
              <VaultComponent 
                provider={provider}
                account={account}
                onToast={onToast}
                onNavigateUp={() => navigateToFloor('home')}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Floor Indicator (Elevator) - Hide on vault floor */}
      {currentFloor !== 'vault' && (
        <FloorIndicator 
          current={currentFloor}
          onChange={navigateToFloor}
          isTransitioning={isTransitioning}
        />
      )}
    </div>
  );
}

