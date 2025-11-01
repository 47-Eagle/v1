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
    }, 1200);
  };

  const currentOffset = floorOffsets[currentFloor];

  return (
    <div className="h-full overflow-hidden relative bg-[#0a0a0a] transition-colors duration-1000">
      {/* Unified Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0b0a0f] to-[#0a0a0a]" style={{ height: '300vh' }} />
      
      {/* Animated Container */}
      <motion.div
        className="absolute w-full"
        style={{ 
          height: '300vh', 
          width: '150vw'
        }}
        animate={{ 
          y: `${-currentOffset.y}vh`,
          x: `${-currentOffset.x}vw`,
        }}
        transition={{ 
          type: "spring",
          stiffness: 50,
          damping: 30,
          mass: 1,
          duration: 1.2
        }}
      >
        {/* Top Floor - EAGLE/ETH LP */}
        <div className="h-screen overflow-hidden relative" id="lp-floor" style={{ position: 'absolute', top: 0, left: 0, width: '100vw' }}>
          {/* Animated gradient orbs */}
          <motion.div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            animate={{
              opacity: currentFloor === 'lp' ? 1 : 0.3,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'lp' ? 0.6 : 1,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="h-full overflow-y-auto overflow-x-hidden relative z-10"
          >
            <EagleLPContent 
              onNavigateDown={() => navigateToFloor('home')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Main Floor - Home */}
        <div className="h-screen overflow-hidden relative" id="home-floor" style={{ position: 'absolute', top: '100vh', left: 0, width: '100vw' }}>
          {/* Animated gradient orbs */}
          <motion.div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            animate={{
              opacity: currentFloor === 'home' ? 1 : 0.3,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }}></div>
            <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }}></div>
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'home' ? 0.6 : 1,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="h-full overflow-hidden relative z-10"
          >
            <EagleHomeContent 
              onNavigateUp={() => navigateToFloor('lp')}
              onNavigateDown={() => navigateToFloor('vault')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Basement - Vault */}
        <div className="h-screen overflow-hidden relative" id="vault-floor" style={{ position: 'absolute', top: '200vh', left: 0, width: '100vw' }}>
          {/* Animated gradient orbs */}
          <motion.div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            animate={{
              opacity: currentFloor === 'vault' ? 1 : 0.3,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'vault' ? 0.6 : 1,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth relative z-10"
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
        <div className="h-screen overflow-hidden relative" id="wrapper-floor" style={{ position: 'absolute', top: '95vh', left: '100vw', width: '100vw' }}>
          {/* Animated gradient orbs for wrapper */}
          <motion.div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            animate={{
              opacity: currentFloor === 'wrapper' ? 1 : 0.3,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className="absolute top-1/4 right-1/3 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }}></div>
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-indigo-500/6 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'wrapper' ? 0.6 : 1,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth relative z-10"
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

