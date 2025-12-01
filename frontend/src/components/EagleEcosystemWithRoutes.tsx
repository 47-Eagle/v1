import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrowserProvider } from 'ethers';
import FloorIndicator from './FloorIndicator';
import VaultView from './VaultView';
import EagleLPContent from './EagleLPContent';
import WrapperView from './WrapperView';
import EagleBridge from './EagleBridge';
import EagleHomeContent from './EagleHomeContent';

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
  const [hasLeftHome, setHasLeftHome] = useState(false);
  const [showHomeContent, setShowHomeContent] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  // Listen for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Map routes to floors
  const routeToFloor: Record<string, Floor> = {
    '/app': 'home',
    '/app/lp': 'lp',
    '/app/vault': 'vault',
  };

  const currentFloor = routeToFloor[location.pathname] || 'home';

  // Floor offsets for animation (y-axis vertical positioning)
  const floorOffsets: Record<Floor, { y: number; x: number }> = {
    'lp': { y: 0, x: 0 },           // Top floor - EAGLE/ETH LP at 0vh
    'home': { y: 150, x: 0 },       // Landing page - Home floor at 150vh (default)
    'vault': { y: 250, x: 0 },      // Main vault interface at 250vh
  };

  const navigateToFloor = (floor: Floor) => {
    setIsTransitioning(true);

    // Mark that user has left home if navigating away from home
    if (currentFloor === 'home' && floor !== 'home') {
      setHasLeftHome(true);
    }
    
    
    const floorToRoute: Record<Floor, string> = {
      'lp': '/app/lp',
      'home': '/app',
      'vault': '/app/vault',
    };
    
    // Special case: If already on vault and clicking vault again, switch to wrapper in-place
    if (currentFloor === 'vault' && floor === 'vault') {
      // Navigate to wrapper without screen movement (same position)
      navigate(floorToRoute['wrapper']);
      setIsTransitioning(false);
      return;
    }
    
    // Special case: If already on wrapper and clicking vault, switch back to vault in-place
    if (currentFloor === 'wrapper' && floor === 'vault') {
      // Navigate to vault without screen movement (same position)
      navigate(floorToRoute['vault']);
      setIsTransitioning(false);
      return;
    }

    {
      // Normal navigation
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
    }
  };

  const currentOffset = floorOffsets[currentFloor];

  // Background colors for each floor (RGB values for smooth color transitions)
  const floorColors: Record<Floor, { top: string; middle: string; bottom: string }> = isDarkMode ? {
    'lp': { 
      top: 'rgba(30, 58, 138, 0.15)',      // blue-950 with opacity
      middle: 'rgba(59, 7, 100, 0.15)',    // purple-950 with opacity
      bottom: 'rgba(10, 10, 10, 1)'
    },
    'home': {
      top: 'rgba(10, 10, 10, 1)',          // pure dark (no tint)
      middle: 'rgba(10, 10, 10, 1)',       // pure dark (no tint)
      bottom: 'rgba(10, 10, 10, 1)'        // pure dark (no tint)
    },
    'vault': { 
      top: 'rgba(69, 26, 3, 0.12)',        // amber-950 with refined opacity
      middle: 'rgba(120, 53, 15, 0.10)',   // amber-900 with refined opacity
      bottom: 'rgba(10, 10, 10, 1)' 
    },
    'wrapper': { 
      top: 'rgba(59, 7, 100, 0.28)',       // purple-950 with more opacity
      middle: 'rgba(49, 46, 129, 0.24)',   // indigo-950 with opacity
      bottom: 'rgba(10, 10, 10, 1)' 
    },
    'bridge': {
      top: 'rgba(16, 185, 129, 0.18)',     // emerald-500 with opacity
      middle: 'rgba(59, 130, 246, 0.15)',  // blue-500 with opacity
      bottom: 'rgba(10, 10, 10, 1)'
    },
  } : {
    'lp': { 
      top: 'rgba(191, 219, 254, 0.4)',     // blue-200 with opacity (light mode)
      middle: 'rgba(233, 213, 255, 0.35)',  // purple-200 with opacity
      bottom: 'rgba(243, 244, 246, 1)'      // gray-100
    },
    'home': {
      top: 'rgba(255, 255, 255, 1)',        // pure white (light mode)
      middle: 'rgba(252, 252, 253, 1)',     // pearly white
      bottom: 'rgba(249, 250, 251, 1)'      // soft white (gray-50)
    },
    'vault': { 
      top: 'rgba(255, 255, 255, 1)',        // pure white (light mode)
      middle: 'rgba(252, 252, 253, 1)',     // pearly white
      bottom: 'rgba(249, 250, 251, 1)'      // soft white (gray-50)
    },
    'wrapper': { 
      top: 'rgba(233, 213, 255, 0.55)',    // purple-200 with more opacity (light mode)
      middle: 'rgba(199, 210, 254, 0.5)',   // indigo-200 with opacity
      bottom: 'rgba(243, 244, 246, 1)'      // gray-100
    },
    'bridge': {
      top: 'rgba(167, 243, 208, 0.5)',     // emerald-200 with opacity (light mode)
      middle: 'rgba(191, 219, 254, 0.45)',  // blue-200 with opacity
      bottom: 'rgba(243, 244, 246, 1)'      // gray-100
    },
  };

  return (
    <motion.div 
      className="h-full overflow-hidden relative bg-white dark:bg-[#0a0a0a]"
      initial={{ scale: 1.05 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Entry Overlay - Warm Fade In */}
      <motion.div
        className="absolute inset-0 z-[100] bg-[#fdfbf7] dark:bg-[#0c0a09] pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />

      {/* Base layer - persistent background */}
      <div className="absolute inset-0 bg-white dark:bg-[#0a0a0a]" style={{ height: '350vh' }} />
      
      {/* Cross-fade backgrounds for each floor - creates seamless transitions */}
      {Object.keys(floorColors).map((floor) => (
        <motion.div
          key={`bg-${floor}`}
          className="absolute inset-0"
          style={{ 
            height: '350vh',
            background: `linear-gradient(to bottom, ${floorColors[floor as Floor].top}, ${floorColors[floor as Floor].middle}, ${floorColors[floor as Floor].bottom})`,
            willChange: 'opacity'
          }}
          animate={{
            opacity: currentFloor === floor ? 1 : 0
          }}
          transition={{ 
            duration: 3.5,
            ease: [0.19, 1.0, 0.22, 1.0]
          }}
        />
      ))}
      
      {/* Radial overlay layers for depth - one per floor */}
      <motion.div 
        className="absolute inset-0"
        style={{ 
          height: '350vh',
          willChange: 'opacity, background'
        }}
        animate={{
          background: isDarkMode ?
            (currentFloor === 'lp' ? 'radial-gradient(ellipse 120% 100% at top, rgba(59, 130, 246, 0.12), transparent 60%)' :
             currentFloor === 'home' ? 'radial-gradient(ellipse 120% 100% at center, rgba(251, 191, 36, 0.08), transparent 60%)' :
             currentFloor === 'vault' ? 'radial-gradient(ellipse 120% 100% at bottom, rgba(245, 158, 11, 0.10), transparent 60%)' :
             currentFloor === 'bridge' ? 'radial-gradient(ellipse 120% 100% at center, rgba(16, 185, 129, 0.15), transparent 60%)' :
             'radial-gradient(ellipse 120% 100% at top right, rgba(168, 85, 247, 0.18), transparent 60%)') :
            (currentFloor === 'lp' ? 'radial-gradient(ellipse 120% 100% at top, rgba(59, 130, 246, 0.15), transparent 70%)' :
             currentFloor === 'home' ? 'radial-gradient(ellipse 120% 100% at center, rgba(0, 0, 0, 0.01), transparent 90%)' :
             currentFloor === 'vault' ? 'radial-gradient(ellipse 120% 100% at bottom, rgba(0, 0, 0, 0.01), transparent 90%)' :
             currentFloor === 'bridge' ? 'radial-gradient(ellipse 120% 100% at center, rgba(16, 185, 129, 0.18), transparent 70%)' :
             'radial-gradient(ellipse 120% 100% at top right, rgba(168, 85, 247, 0.22), transparent 70%)'),
          opacity: 1
        }}
        transition={{ 
          duration: 4.0,
          ease: [0.165, 0.84, 0.44, 1.0]
        }}
      />
      
      {/* Subtle vignette layer for additional depth */}
      <motion.div 
        className="absolute inset-0"
        style={{ 
          height: '350vh',
          background: isDarkMode ? 
            'radial-gradient(ellipse 80% 60% at center, transparent 30%, rgba(0, 0, 0, 0.4) 100%)' :
            'radial-gradient(ellipse 80% 60% at center, transparent 60%, rgba(0, 0, 0, 0.03) 100%)',
          willChange: 'opacity'
        }}
        animate={{
          opacity: isTransitioning ? (isDarkMode ? 0.6 : 0.2) : (isDarkMode ? 0.3 : 0.1)
        }}
        transition={{ 
          duration: 3.0,
          ease: [0.33, 0.0, 0.2, 1.0]
        }}
      />
      
      {/* Transition smoothing overlay */}
      <motion.div 
        className="absolute inset-0"
        style={{ 
          height: '350vh',
          willChange: 'opacity'
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isTransitioning ? (isDarkMode ? 0.3 : 0.15) : 0,
          background: isDarkMode ? 
            'linear-gradient(180deg, rgba(0, 0, 0, 0.2), transparent 30%, transparent 70%, rgba(0, 0, 0, 0.2))' :
            'linear-gradient(180deg, rgba(0, 0, 0, 0.05), transparent 30%, transparent 70%, rgba(0, 0, 0, 0.05))'
        }}
        transition={{ 
          duration: 2.5,
          ease: [0.4, 0.0, 0.2, 1.0]
        }}
      />
      
      {/* Animated Container */}
      <motion.div
        className="absolute w-full"
        style={{ 
          height: '350vh', 
          width: '100vw'
        }}
        initial={{ 
          y: `${-currentOffset.y}vh`,
          x: `${-currentOffset.x}vw`,
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
            style={{ willChange: 'opacity' }}
            animate={{
              opacity: currentFloor === 'lp' ? 1 : 0.1,
            }}
            transition={{ duration: 3.5, ease: [0.19, 1.0, 0.22, 1.0] }}
          >
            <motion.div 
              className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-blue-500/15 rounded-full blur-[100px]"
              animate={{
                scale: currentFloor === 'lp' ? [1, 1.1, 1] : 0.8,
                x: currentFloor === 'lp' ? [0, 50, 0] : 0,
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/15 rounded-full blur-[100px]"
              animate={{
                scale: currentFloor === 'lp' ? [1, 1.15, 1] : 0.8,
                x: currentFloor === 'lp' ? [0, -40, 0] : 0,
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[80px]"
              animate={{
                scale: currentFloor === 'lp' ? [1, 1.2, 1] : 0.8,
                y: currentFloor === 'lp' ? [0, -30, 0] : 0,
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'lp' ? 0.4 : 1,
            }}
            transition={{ duration: 1.5, ease: [0.19, 1.0, 0.22, 1.0] }}
            className="h-full overflow-y-auto overflow-x-hidden relative z-10"
            style={{ willChange: 'opacity' }}
          >
            <EagleLPContent 
              onNavigateDown={() => navigateToFloor('home')}
              onNavigateToCrossChain={() => navigateToFloor('bridge')}
              provider={provider}
            />
          </motion.div>
        </div>

        {/* Wrapper - Bottom Floor (same position as Vault) */}
        <motion.div 
          className="h-screen overflow-hidden relative" 
          id="wrapper-floor" 
          style={{ 
            position: 'absolute', 
            top: '250vh',  // Same as vault
            left: 0, 
            width: '100vw',
            zIndex: currentFloor === 'wrapper' ? 15 : 5
          }}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: currentFloor === 'wrapper' ? 1 : 0,
            pointerEvents: currentFloor === 'wrapper' ? 'auto' : 'none'
          }}
          transition={{ 
            duration: 0.3,  // Faster transition for in-place swap
            ease: [0.4, 0.0, 0.2, 1.0] 
          }}
        >
          {/* Animated gradient orbs for wrapper */}
          <motion.div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ willChange: 'opacity' }}
            animate={{
              opacity: currentFloor === 'wrapper' ? 1 : 0.1,
            }}
            transition={{ duration: 3.5, ease: [0.19, 1.0, 0.22, 1.0] }}
          >
            <motion.div 
              className="absolute top-1/4 right-1/3 w-[850px] h-[850px] bg-purple-500/30 rounded-full blur-[130px]"
              animate={{
                scale: currentFloor === 'wrapper' ? [1, 1.25, 1] : 0.8,
                x: currentFloor === 'wrapper' ? [0, -60, 0] : 0,
                y: currentFloor === 'wrapper' ? [0, 40, 0] : 0,
              }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute bottom-1/4 left-1/4 w-[700px] h-[700px] bg-blue-500/25 rounded-full blur-[110px]"
              animate={{
                scale: currentFloor === 'wrapper' ? [1, 1.18, 1] : 0.8,
                x: currentFloor === 'wrapper' ? [0, 50, 0] : 0,
              }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-1/2 left-1/2 w-[650px] h-[650px] bg-indigo-500/22 rounded-full blur-[100px]"
              animate={{
                scale: currentFloor === 'wrapper' ? [1, 1.15, 1] : 0.8,
                y: currentFloor === 'wrapper' ? [0, -45, 0] : 0,
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-3/4 right-1/2 w-[550px] h-[550px] bg-violet-500/18 rounded-full blur-[90px]"
              animate={{
                scale: currentFloor === 'wrapper' ? [1, 1.2, 1] : 0.8,
                x: currentFloor === 'wrapper' ? [0, -40, 0] : 0,
                y: currentFloor === 'wrapper' ? [0, 30, 0] : 0,
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'wrapper' ? 0.4 : 1,
            }}
            transition={{ duration: 1.5, ease: [0.19, 1.0, 0.22, 1.0] }}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth relative z-10 pb-20"
            style={{ scrollbarGutter: 'stable', willChange: 'opacity' }}
          >
            <WrapperView 
              provider={provider}
              account={account}
              onToast={onToast}
              onNavigateDown={() => navigateToFloor('home')}
              onNavigateUp={() => navigateToFloor('lp')}
            />
          </motion.div>
        </motion.div>

        {/* Cross-Chain Hub - Center Floor */}
        <motion.div 
          className="h-screen overflow-hidden relative" 
          id="bridge-floor" 
          style={{ 
            position: 'absolute', 
            top: '200vh',
            left: 0, 
            width: '100vw',
            zIndex: currentFloor === 'bridge' ? 15 : 5
          }}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: currentFloor === 'bridge' ? 1 : 0,
            pointerEvents: currentFloor === 'bridge' ? 'auto' : 'none'
          }}
          transition={{ 
            duration: 0.8,
            delay: 0,
            ease: [0.4, 0.0, 0.2, 1.0] 
          }}
        >
          {/* Animated gradient orbs for bridge */}
          <motion.div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ willChange: 'opacity' }}
            animate={{
              opacity: currentFloor === 'bridge' ? 1 : 0.1,
            }}
            transition={{ duration: 3.5, ease: [0.19, 1.0, 0.22, 1.0] }}
          >
            <motion.div 
              className="absolute top-1/4 right-1/3 w-[800px] h-[800px] bg-emerald-500/25 rounded-full blur-[120px]"
              animate={{
                scale: currentFloor === 'bridge' ? [1, 1.2, 1] : 0.8,
                x: currentFloor === 'bridge' ? [0, -50, 0] : 0,
                y: currentFloor === 'bridge' ? [0, 30, 0] : 0,
              }}
              transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute bottom-1/4 left-1/4 w-[700px] h-[700px] bg-blue-500/20 rounded-full blur-[110px]"
              animate={{
                scale: currentFloor === 'bridge' ? [1, 1.15, 1] : 0.8,
                x: currentFloor === 'bridge' ? [0, 40, 0] : 0,
              }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-1/2 left-1/2 w-[650px] h-[650px] bg-cyan-500/18 rounded-full blur-[100px]"
              animate={{
                scale: currentFloor === 'bridge' ? [1, 1.18, 1] : 0.8,
                y: currentFloor === 'bridge' ? [0, -40, 0] : 0,
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'bridge' ? 0.4 : 1,
            }}
            transition={{ duration: 1.5, ease: [0.19, 1.0, 0.22, 1.0] }}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth relative z-10 pb-20"
            style={{ scrollbarGutter: 'stable', willChange: 'opacity' }}
          >
            <EagleBridge 
              provider={provider}
              account={account}
              onToast={onToast}
            />
          </motion.div>
        </motion.div>

        {/* Basement - Vault */}
        <motion.div 
          className="h-screen overflow-hidden relative" 
          id="vault-floor" 
          style={{ 
            position: 'absolute', 
            top: '250vh', 
            left: 0, 
            width: '100vw',
            zIndex: currentFloor === 'vault' ? 15 : 5
          }}
          animate={{
            opacity: currentFloor === 'vault' ? 1 : 0,
            pointerEvents: currentFloor === 'vault' ? 'auto' : 'none'
          }}
          transition={{ 
            duration: 0.3,  // Faster transition for in-place swap
            ease: [0.4, 0.0, 0.2, 1.0] 
          }}
        >
          {/* Animated gradient orbs */}
          <motion.div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ willChange: 'opacity' }}
            animate={{
              opacity: currentFloor === 'vault' ? 1 : 0.1,
            }}
            transition={{ duration: 3.5, ease: [0.19, 1.0, 0.22, 1.0] }}
          >
            <motion.div 
              className="absolute top-1/3 right-1/4 w-[750px] h-[750px] bg-[#D4B474]/500/18 rounded-full blur-[110px]"
              animate={{
                scale: currentFloor === 'vault' ? [1, 1.2, 1] : 0.8,
                y: currentFloor === 'vault' ? [0, -50, 0] : 0,
              }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute bottom-1/4 left-1/3 w-[650px] h-[650px] bg-[#D4B474]/600/15 rounded-full blur-[100px]"
              animate={{
                scale: currentFloor === 'vault' ? [1, 1.15, 1] : 0.8,
                x: currentFloor === 'vault' ? [0, 45, 0] : 0,
              }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-1/2 left-1/4 w-[550px] h-[550px] bg-orange-600/18 rounded-full blur-[90px]"
              animate={{
                scale: currentFloor === 'vault' ? [1, 1.18, 1] : 0.8,
                x: currentFloor === 'vault' ? [0, -35, 0] : 0,
                y: currentFloor === 'vault' ? [0, 25, 0] : 0,
              }}
              transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.div
            animate={{
              opacity: isTransitioning && currentFloor !== 'vault' ? 0.4 : 1,
            }}
            transition={{ duration: 1.5, ease: [0.19, 1.0, 0.22, 1.0] }}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth relative z-10 pb-20"
            style={{ scrollbarGutter: 'stable', willChange: 'opacity' }}
          >
            <VaultView 
              provider={provider}
              account={account}
              onToast={onToast}
              onNavigateUp={() => navigateToFloor('home')}
              onNavigateToWrapper={() => navigateToFloor('wrapper')}
              onNavigateToCrossChain={() => navigateToFloor('bridge')}
              onNavigateToAnalytics={() => navigateToFloor('analytics')}
            />
          </motion.div>
        </motion.div>

        {/* Home Floor - Center (initial landing) */}
        <div
          className="h-screen overflow-hidden relative"
          id="home-floor"
          style={{
            position: 'absolute',
            top: '150vh',
            left: 0,
            width: '100vw',
            pointerEvents: currentFloor === 'home' ? 'auto' : 'none',
            zIndex: currentFloor === 'home' ? 10 : 5
          }}
        >
          {/* Animated gradient orbs */}
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ willChange: 'opacity' }}
            animate={{
              opacity: currentFloor === 'home' ? 1 : 0.1,
            }}
            transition={{ duration: 3.5, ease: [0.19, 1.0, 0.22, 1.0] }}
          >
            <motion.div
              className="absolute top-1/4 right-1/3 w-[800px] h-[800px] bg-[#D4B474]/400/15 rounded-full blur-[120px]"
              animate={{
                scale: currentFloor === 'home' ? [1, 1.15, 1] : 0.8,
                x: currentFloor === 'home' ? [0, 60, 0] : 0,
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/3 left-1/4 w-[700px] h-[700px] bg-[#D4B474]/500/12 rounded-full blur-[110px]"
              animate={{
                scale: currentFloor === 'home' ? [1, 1.2, 1] : 0.8,
                y: currentFloor === 'home' ? [0, 40, 0] : 0,
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-orange-500/12 rounded-full blur-[100px]"
              animate={{
                scale: currentFloor === 'home' ? [1, 1.1, 1] : 0.8,
                x: currentFloor === 'home' ? [0, -50, 0] : 0,
              }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.div
            animate={{
              opacity: showHomeContent ? (isTransitioning && currentFloor !== 'home' ? 0.4 : 1) : 0,
            }}
            transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1.0] }}
            className="h-full overflow-hidden relative z-10"
            style={{ willChange: 'opacity' }}
          >
            <EagleHomeContent
              onNavigateUp={() => navigateToFloor('lp')}
              onNavigateDown={() => navigateToFloor('vault')}
              provider={provider}
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
    </motion.div>
  );
}
