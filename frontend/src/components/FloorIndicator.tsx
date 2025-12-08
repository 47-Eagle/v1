import { motion } from 'framer-motion';
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
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
        <circle cx="7" cy="6" r="1.5" fill="currentColor" />
        <circle cx="17" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
    color: 'from-amber-400 to-yellow-600',
    status: 'Live'
  },
  {
    id: 'bridge',
    label: 'Bridge',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16V8M4 8C4 6.895 4.895 6 6 6h12c1.105 0 2 .895 2 2v8M4 8h16m0 8v-8M4 16h16m0 0v2c0 1.105-.895 2-2 2H6c-1.105 0-2-.895-2-2v-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 16V8m6 8V8" />
      </svg>
    ),
    color: 'from-amber-400 to-yellow-600',
    status: 'New'
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        <circle cx="12" cy="13" r="1.5" fill="currentColor" />
      </svg>
    ),
    color: 'from-amber-400 to-yellow-600',
    status: 'Active'
  }
];

export default function FloorIndicator({ current, onChange, isTransitioning }: Props) {
  return (
    <>
      {/* Desktop: Vertical sidebar on right */}
      <div className="hidden md:block fixed right-8 top-1/2 -translate-y-1/2 z-50">
        {/* Neumorphic container */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 backdrop-blur-xl rounded-3xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-neo-raised dark:shadow-neo-raised-dark">
          <div className="space-y-4">
            {floors.map((floor, index) => {
              const isActive = current === floor.id;
              
              return (
                <div key={floor.id} className="relative">
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
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}
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

      {/* Mobile: Minimal navigation dots on right side */}
      <div className="md:hidden fixed right-3 top-1/2 -translate-y-1/2 z-50">
        <div className="flex flex-col items-center gap-2 px-1.5 py-2 bg-black/10 dark:bg-white/5 backdrop-blur-md rounded-full">
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 flex items-center justify-center text-white">
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
        </div>
      </div>
    </>
  );
}
