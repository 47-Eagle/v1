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
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`
        bg-neo-bg-light dark:bg-neo-bg-dark rounded-2xl p-6
        shadow-neo-raised dark:shadow-neo-raised-dark
        hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark
        transition-all duration-300
        ${highlighted ? 'border-t-2 border-eagle-gold dark:border-eagle-gold-light' : ''}
        ${className}
      `}
    >
      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold mb-1 ${highlighted ? 'text-eagle-gold-darker dark:text-eagle-gold-light' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</div>
      )}
    </motion.div>
  );
};
