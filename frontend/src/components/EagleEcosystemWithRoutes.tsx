import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrowserProvider } from 'ethers';
import FloorIndicator from './FloorIndicator';
import EagleHomeContent from './EagleHomeContent';
import VaultView from './VaultView';
import EagleLPContent from './EagleLPContent';
import WrapperView from './WrapperView';

export type Floor = 'lp' | 'home' | 'vault' | 'wrapper';

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
    '/wrapper': 'wrapper',
  };

  const currentFloor = routeToFloor[location.pathname] || 'home';

  // Floor offsets for animation (y-axis vertical positioning)
  const floorOffsets: Record<Floor, { y: number; x: number }> = {
    'lp': { y: 0, x: 0 },         // Top floor at 0vh
    'home': { y: 100, x: 0 },     // Main floor at 100vh  
    'vault': { y: 200, x: 0 },    // Vault at 200vh (basement)
    'wrapper': { y: 95, x: 100 }  // Wrapper elevated above home, far right
  };

  const navigateToFloor = (floor: Floor) => {
    setIsTransitioning(true);
    
    const floorToRoute: Record<Floor, string> = {
      'lp': '/lp',
      'home': '/',
      'vault': '/vault',
      'wrapper': '/wrapper',
    };
    
    // Scroll floor to top immediately
    const floorEl = document.getElementById(`${floor}-floor`);
    if (floorEl) {
      const scrollEl = floorEl.querySelector('.overflow-y-auto') as HTMLElement;
      if (scrollEl) {
        scrollEl.scrollTop = 0;
      }
    }
    
    // Navigate after animation completes
    setTimeout(() => {
      navigate(floorToRoute[floor]);
      setIsTransitioning(false);
    }, 800);
  };

  const currentOffset = floorOffsets[currentFloor];

  return (
    <div className="h-full overflow-hidden relative bg-[#0a0a0a]">
      {/* Animated Container - Each floor is 100vh, wrapper is positioned diagonally at 45° */}
      <motion.div
        className="absolute w-full"
        style={{ height: '300vh', width: '150vw' }}
        animate={{ 
          y: `${-currentOffset.y}vh`,
          x: `${-currentOffset.x}vw`
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
        <div className="h-screen overflow-hidden relative bg-[#0a0a0a]" id="lp-floor" style={{ position: 'absolute', top: 0, left: 0, width: '100vw' }}>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'lp' ? 0.5 : 1,
            }}
            className="h-full overflow-y-auto overflow-x-hidden"
          >
            <EagleLPContent 
              onNavigateDown={() => navigateToFloor('home')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Main Floor - Home */}
        <div className="h-screen overflow-hidden relative bg-[#0a0a0a]" id="home-floor" style={{ position: 'absolute', top: '100vh', left: 0, width: '100vw' }}>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'home' ? 0.5 : 1,
            }}
            className="h-full overflow-hidden"
          >
            <EagleHomeContent 
              onNavigateUp={() => navigateToFloor('lp')}
              onNavigateDown={() => navigateToFloor('vault')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Basement - Vault */}
        <div className="h-screen overflow-hidden relative bg-[#0a0a0a]" id="vault-floor" style={{ position: 'absolute', top: '200vh', left: 0, width: '100vw' }}>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'vault' ? 0.5 : 1,
            }}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth"
            style={{ scrollbarGutter: 'stable' }}
          >
            <VaultView 
              provider={provider}
              account={account}
              onToast={onToast}
              onNavigateUp={() => navigateToFloor('home')}
              onNavigateToWrapper={() => navigateToFloor('wrapper')}
            />
          </motion.div>
        </div>

        {/* Wrapper - Elevated above Home (far right) */}
        <div className="h-screen overflow-hidden relative bg-gradient-to-b from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a]" id="wrapper-floor" style={{ position: 'absolute', top: '95vh', left: '100vw', width: '100vw' }}>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'wrapper' ? 0.5 : 1,
            }}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth"
            style={{ scrollbarGutter: 'stable' }}
          >
            <WrapperView 
              provider={provider}
              account={account}
              onToast={onToast}
              onNavigateDown={() => navigateToFloor('vault')}
              onNavigateUp={() => navigateToFloor('lp')}
            />
          </motion.div>
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

