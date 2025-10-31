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
        bg-neo-bg dark:bg-gray-800 rounded-2xl p-6
        shadow-neo-raised dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]
        hover:shadow-neo-raised-lift dark:hover:shadow-[10px_10px_20px_rgba(0,0,0,0.4),-10px_-10px_20px_rgba(255,255,255,0.06)]
        transition-all duration-300
        ${highlighted ? 'border-t-2 border-yellow-400' : ''}
        ${className}
      `}
    >
      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold mb-1 ${highlighted ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</div>
      )}
    </motion.div>
  );
};
