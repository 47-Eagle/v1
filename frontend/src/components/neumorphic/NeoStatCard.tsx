import { motion } from 'framer-motion';

interface NeoStatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  highlighted?: boolean;
  className?: string;
}

export const NeoStatCard = ({
  label,
  value,
  subtitle,
  highlighted = false,
  className = ''
}: NeoStatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className={`
        bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
        rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6
        shadow-neo-raised dark:shadow-neo-raised-dark
        hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark
        border border-gray-200/50 dark:border-gray-600/50
        hover:border-gray-300/70 dark:hover:border-gray-500/60
        backdrop-blur-sm
        transition-all duration-500 ease-out
        touch-manipulation
        ${highlighted ? 'border-t-2 sm:border-t-4 border-t-eagle-gold dark:border-t-eagle-gold-light ring-1 ring-amber-400/20 dark:ring-amber-500/20' : ''}
        ${className}
      `}
    >
      <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider mb-2 sm:mb-3 transition-colors duration-300 truncate">{label}</div>
      <div className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-1.5 sm:mb-2 transition-all duration-300 truncate ${highlighted ? 'text-eagle-gold-darker dark:text-eagle-gold-light bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium transition-colors duration-300 truncate">{subtitle}</div>
      )}
    </motion.div>
  );
};
