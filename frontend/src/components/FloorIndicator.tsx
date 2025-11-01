import { motion } from 'framer-motion';
import type { Floor } from './EagleEcosystemWithRoutes';

interface Props {
  current: Floor;
  onChange: (floor: Floor) => void;
  isTransitioning: boolean;
}

const floors: Array<{ id: Floor; label: string; icon: JSX.Element; color: string }> = [
  { 
    id: 'lp', 
    label: 'LP Pool', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'from-blue-500 to-purple-500' 
  },
  { 
    id: 'wrapper', 
    label: 'Wrapper Bridge', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
    color: 'from-purple-500 to-blue-500' 
  },
  { 
    id: 'home', 
    label: 'Home', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    color: 'from-yellow-500 to-amber-500' 
  },
  { 
    id: 'vault', 
    label: 'Vault', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-yellow-600 to-amber-700' 
  }
];

export default function FloorIndicator({ current, onChange, isTransitioning }: Props) {
  // Show wrapper only when on vault or wrapper page
  const showWrapper = current === 'vault' || current === 'wrapper';
  const visibleFloors = showWrapper ? floors : floors.filter(f => f.id !== 'wrapper');
  
  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50">
      {/* Neumorphic container */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 backdrop-blur-xl rounded-3xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-neo-raised dark:shadow-neo-raised-dark relative">
        <div className="space-y-4 relative">
          {/* Diagonal connection lines - only show when wrapper is visible */}
          {showWrapper && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {/* Line from Vault (bottom) to Wrapper (middle-right) */}
              <line 
                x1="50%" 
                y1="85%" 
                x2="120%" 
                y2="50%" 
                stroke="url(#gradient-wrapper)" 
                strokeWidth="2" 
                strokeDasharray="4 4"
                className="opacity-50"
              />
              {/* Line from Wrapper (middle-right) to LP (top) */}
              <line 
                x1="120%" 
                y1="50%" 
                x2="50%" 
                y2="15%" 
                stroke="url(#gradient-wrapper)" 
                strokeWidth="2" 
                strokeDasharray="4 4"
                className="opacity-50"
              />
              <defs>
                <linearGradient id="gradient-wrapper" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {visibleFloors.map((floor, index) => {
            const isActive = current === floor.id;
            const isWrapper = floor.id === 'wrapper';
            
            return (
              <div key={floor.id} className={`relative ${isWrapper ? 'absolute left-[120%] top-1/2 -translate-y-1/2' : ''}`} style={isWrapper ? { zIndex: 10 } : {}}>
                <button
                  onClick={() => onChange(floor.id)}
                  disabled={isTransitioning}
                  className={`
                    relative w-16 h-16 rounded-2xl
                    transition-all duration-300 group
                    border backdrop-blur-sm
                    ${isActive 
                      ? `bg-gradient-to-br ${floor.color} border-transparent shadow-neo-glow dark:shadow-neo-glow-dark` 
                      : 'bg-white/50 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 hover:border-gray-300 dark:hover:border-gray-600/60 shadow-neo-inset dark:shadow-neo-inset-dark'
                    }
                    ${isTransitioning ? 'cursor-wait opacity-50' : 'cursor-pointer'}
                  `}
                  title={floor.label}
                >
                  {/* Active glow effect */}
                  {isActive && (
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${floor.color} rounded-2xl opacity-40 blur-xl -z-10`}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.2, 0.4]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  
                  <div className={`
                    absolute inset-0 flex items-center justify-center
                    ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}
                    transition-colors
                  `}>
                    {floor.icon}
                  </div>

                  {/* Label tooltip on hover */}
                  <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-2 backdrop-blur-xl shadow-neo-raised dark:shadow-neo-raised-dark">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{floor.label}</p>
                      {floor.id === 'lp' && (
                        <p className="text-xs text-gray-400 mt-0.5">Coming Soon</p>
                      )}
                      {floor.id === 'vault' && (
                        <p className="text-xs text-yellow-400 mt-0.5 font-medium">Active</p>
                      )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-1 w-3 h-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border-r border-b border-gray-200/50 dark:border-gray-600/50 rotate-[-45deg]"></div>
                  </div>
                </button>

                {/* Connection line between floors - skip for wrapper */}
                {!isWrapper && index < visibleFloors.filter(f => f.id !== 'wrapper').length - 1 && (
                  <div className="absolute left-1/2 -translate-x-1/2 w-px h-4 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700" />
                )}
              </div>
            );
          })}
        </div>

        {/* Current floor label */}
        <div className="mt-5 pt-4 border-t border-gray-300/50 dark:border-gray-700/30">
          <p className="text-xs text-gray-700 dark:text-gray-300 text-center font-semibold tracking-widest uppercase">
            {floors.find(f => f.id === current)?.label}
          </p>
        </div>
      </div>
    </div>
  );
}
