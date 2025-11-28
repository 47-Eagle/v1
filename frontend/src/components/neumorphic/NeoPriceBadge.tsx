import { motion } from 'framer-motion';

interface NeoPriceBadgeProps {
  icon: string;
  label: string;
  value: string;
  className?: string;
}

export const NeoPriceBadge = ({ icon, label, value, className = '' }: NeoPriceBadgeProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      className={`
        flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full
        bg-neo-bg-light dark:bg-neo-bg-dark 
        shadow-neo-raised dark:shadow-neo-raised-dark
        hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark
        transition-all duration-300
        touch-manipulation
        ${className}
      `}
    >
      <img 
        src={icon} 
        alt={label}
        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
      />
      <span className="text-xs sm:text-sm font-mono text-gray-700 dark:text-gray-300 font-semibold truncate">{value}</span>
    </motion.div>
  );
};
