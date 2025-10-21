import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrowserProvider } from 'ethers';
import FloorIndicator from './FloorIndicator';
import EagleHomeContent from './EagleHomeContent';
import VaultView from './VaultView';
import EagleLPContent from './EagleLPContent';

export type Floor = 'lp' | 'home' | 'vault';

interface Props {
  provider: BrowserProvider | null;
  account: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info'; txHash?: string }) => void;
}

export default function EagleEcosystemWithRoutes({ provider, account, onToast }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Map routes to floors
  const routeToFloor: Record<string, Floor> = {
    '/': 'home',
    '/lp': 'lp',
    '/vault': 'vault',
  };

  const currentFloor = routeToFloor[location.pathname] || 'home';

  // Floor offsets for animation
  const floorOffsets: Record<Floor, number> = {
    'lp': 0,      // Top floor at 0vh
    'home': 100,  // Main floor at 100vh  
    'vault': 200  // Vault at 200vh (basement)
  };

  const navigateToFloor = (floor: Floor) => {
    setIsTransitioning(true);
    
    const floorToRoute: Record<Floor, string> = {
      'lp': '/lp',
      'home': '/',
      'vault': '/vault',
    };
    
    // Navigate after animation completes
    setTimeout(() => {
      navigate(floorToRoute[floor]);
      setIsTransitioning(false);
    }, 800);
  };

  const currentOffset = floorOffsets[currentFloor];

  return (
    <div className="h-full overflow-hidden relative">
      {/* Animated Container */}
      <motion.div
        className="absolute w-full h-[300vh]"
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
        <div className="h-[calc(100vh-64px-80px)] overflow-hidden relative" id="lp-floor">
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'lp' ? 0.5 : 1,
            }}
            className="h-full overflow-y-auto"
          >
            <EagleLPContent 
              onNavigateDown={() => navigateToFloor('home')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Main Floor - Home */}
        <div className="h-[calc(100vh-64px-80px)] overflow-hidden relative" id="home-floor">
          <div className="h-full overflow-hidden">
            <motion.div
              animate={{
                opacity: isTransitioning && currentFloor !== 'home' ? 0.5 : 1,
              }}
              className="h-full"
            >
              <EagleHomeContent 
                onNavigateUp={() => navigateToFloor('lp')}
                onNavigateDown={() => navigateToFloor('vault')}
                provider={provider}
              />
            </motion.div>
          </div>
        </div>

        {/* Basement - Vault */}
        <div className="h-[calc(100vh-64px-80px)] relative" id="vault-floor">
          <div className="h-full overflow-y-auto overflow-x-hidden">
            <motion.div
              animate={{
                opacity: isTransitioning && currentFloor !== 'vault' ? 0.5 : 1,
              }}
            >
              <VaultView 
                provider={provider}
                account={account}
                onToast={onToast}
                onNavigateUp={() => navigateToFloor('home')}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Floor Indicator */}
      <FloorIndicator 
        current={currentFloor}
        onChange={navigateToFloor}
        isTransitioning={isTransitioning}
      />
    </div>
  );
}

