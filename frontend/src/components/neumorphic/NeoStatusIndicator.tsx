import { motion } from 'framer-motion';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

interface NeoStatusIndicatorProps {
  status: string;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NeoStatusIndicator = ({
  status,
  subtitle,
  active = true,
  onClick,
  className = ''
}: NeoStatusIndicatorProps) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.01, y: -1 } : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      className={`
        flex items-center gap-2.5 sm:gap-3 md:gap-4 px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-full
        bg-neo-bg-light dark:bg-neo-bg-dark 
        shadow-neo-raised dark:shadow-neo-raised-dark
        hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark
        transition-all duration-300
        touch-manipulation
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Active Indicator */}
      <div className="relative flex-shrink-0">
        <motion.div
          animate={{
            scale: active ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: active ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={`
            w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full
            flex items-center justify-center
            ${active 
              ? 'bg-green-400 dark:bg-green-500 shadow-[0_0_20px_rgba(74,222,128,0.5)] dark:shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
              : 'bg-gray-300 dark:bg-gray-600'
            }
          `}
        >
          {active ? (
            <CheckCircle2 className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-white" />
          ) : (
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white dark:bg-gray-300" />
          )}
        </motion.div>
        {active && (
          <motion.div
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-green-400 dark:bg-green-500 blur-md opacity-50"
          />
        )}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{status}</div>
        {subtitle && (
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{subtitle}</div>
        )}
      </div>

      {/* Chevron */}
      {onClick && (
        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
      )}
    </motion.div>
  );
};
