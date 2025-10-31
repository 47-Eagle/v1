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
        flex items-center gap-2 px-4 py-2 rounded-full
        bg-neo-bg-light dark:bg-neo-bg-dark 
        shadow-neo-raised dark:shadow-neo-raised-dark
        hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark
        transition-all duration-300
        ${className}
      `}
    >
      <img 
        src={icon} 
        alt={label}
        className="w-5 h-5"
      />
      <span className="text-sm font-mono text-gray-700 dark:text-gray-300 font-semibold">{value}</span>
    </motion.div>
  );
};
