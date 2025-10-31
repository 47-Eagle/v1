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
        flex items-center gap-4 px-6 py-4 rounded-full
        bg-neo-bg-light dark:bg-neo-bg-dark 
        shadow-neo-raised dark:shadow-neo-raised-dark
        hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Active Indicator */}
      <div className="relative">
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
            w-10 h-10 rounded-full
            flex items-center justify-center
            ${active 
              ? 'bg-green-400 dark:bg-green-500 shadow-[0_0_20px_rgba(74,222,128,0.5)] dark:shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
              : 'bg-gray-300 dark:bg-gray-600'
            }
          `}
        >
          {active ? (
            <CheckCircle2 className="w-6 h-6 text-white" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-white dark:bg-gray-300" />
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
      <div className="flex-1">
        <div className="font-semibold text-gray-900 dark:text-gray-100">{status}</div>
        {subtitle && (
          <div className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</div>
        )}
      </div>

      {/* Chevron */}
      {onClick && (
        <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      )}
    </motion.div>
  );
};
