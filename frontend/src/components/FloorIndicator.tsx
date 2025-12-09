import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { Floor } from './EagleEcosystemWithRoutes';

interface Props {
  current: Floor;
  onChange: (floor: Floor) => void;
  isTransitioning: boolean;
}

const floors: Array<{ id: Floor; label: string; icon: JSX.Element; color: string; status?: string }> = [
  {
    id: 'lp',
    label: 'LP Pool',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <circle cx="12" cy="12" r="3" />
        <circle cx="6" cy="12" r="1.5" />
        <circle cx="18" cy="12" r="1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
      </svg>
    ),
    color: 'from-amber-400 to-yellow-600',
    status: 'Live'
  },
  {
    id: 'bridge',
    label: 'Bridge',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7l1 1-1 1M4 12l1 1-1 1M4 17l1 1-1 1" />
      </svg>
    ),
    color: 'from-amber-400 to-yellow-600',
    status: 'New'
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <rect x="6" y="6" width="12" height="12" rx="1" />
        <circle cx="12" cy="12" r="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v4M10 12h4" />
      </svg>
    ),
    color: 'from-amber-400 to-yellow-600',
    status: 'Active'
  }
];

export default function FloorIndicator({ current, onChange, isTransitioning }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <>
      {/* Desktop: Vertical sidebar on right */}
      <div className="hidden md:block fixed right-8 top-1/2 -translate-y-1/2 z-50">
        {/* Neumorphic container */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 backdrop-blur-xl rounded-2xl p-3 border border-gray-200/50 dark:border-gray-600/50 shadow-neo-raised dark:shadow-neo-raised-dark">
          <div className="space-y-3">
            {floors.map((floor, index) => {
              const isActive = current === floor.id;
              
              return (
                <div key={floor.id} className="relative">
                  <button
                    onClick={() => onChange(floor.id)}
                    disabled={isTransitioning}
                    className={`
                      relative w-12 h-12 rounded-xl
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
                      className={`absolute inset-0 bg-gradient-to-br ${floor.color} rounded-xl opacity-20 blur-lg -z-10`}
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.2, 0.1, 0.2]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className={`
                      w-full h-full
                      ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}
                      transition-colors flex items-center justify-center
                    `}>
                      {floor.icon}
                    </div>
                  </div>

                    {/* Label tooltip on hover */}
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-2 backdrop-blur-xl shadow-neo-raised dark:shadow-neo-raised-dark">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{floor.label}</p>
                        {floor.status && (
                          <p className={`text-xs mt-0.5 font-medium ${
                            floor.status === 'Live' ? 'text-emerald-500' :
                            floor.status === 'New' ? 'text-cyan-500' :
                            floor.status === 'Active' ? 'text-[#D4B474]' :
                            floor.status === 'Beta' ? 'text-violet-500' :
                            'text-gray-500'
                          }`}>{floor.status}</p>
                        )}
                      </div>
                      {/* Arrow */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-1 w-3 h-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border-r border-b border-gray-200/50 dark:border-gray-600/50 rotate-[-45deg]"></div>
                    </div>
                  </button>

                  {/* Connection line between floors */}
                  {index < floors.length - 1 && (
                    <div className="absolute left-1/2 -translate-x-1/2 w-px h-3 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current floor label */}
          <div className="mt-3 pt-3 border-t border-gray-300/50 dark:border-gray-700/30">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center font-medium tracking-wider uppercase">
              {floors.find(f => f.id === current)?.label}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: Minimal navigation dots on right side */}
      <div className="md:hidden fixed right-3 top-1/2 -translate-y-1/2 z-50">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-2 px-1.5 py-2 bg-black/10 dark:bg-white/5 backdrop-blur-md rounded-full"
            >
              {/* Toggle Button - Top */}
              <button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 rounded-full bg-gray-300/40 dark:bg-gray-600/30 hover:bg-gray-400/60 dark:hover:bg-gray-500/40 transition-all flex items-center justify-center touch-manipulation"
                title="Minimize"
              >
                <svg className="w-3 h-3 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              {floors.map((floor) => {
                const isActive = current === floor.id;
                
                return (
                  <button
                    key={floor.id}
                    onClick={() => onChange(floor.id)}
                    disabled={isTransitioning}
                    className={`
                      relative rounded-full transition-all duration-200 touch-manipulation
                      ${isActive ? 'w-8 h-8' : 'w-6 h-6'}
                      ${isTransitioning ? 'opacity-30' : ''}
                    `}
                    title={floor.label}
                  >
                    {isActive ? (
                      <>
                        <div className={`absolute inset-0 bg-gradient-to-br ${floor.color} rounded-full`} />
                        <motion.div
                          className={`absolute inset-0 bg-gradient-to-br ${floor.color} rounded-full opacity-30 blur-md`}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center p-2">
                          <div className="w-full h-full flex items-center justify-center text-white">
                            {floor.icon}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gray-400/30 dark:bg-gray-500/20 rounded-full hover:bg-gray-500/50 dark:hover:bg-gray-400/30 transition-colors" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.button
              key="minimized"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsExpanded(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg hover:scale-110 transition-all touch-manipulation"
              title="Expand navigation"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
