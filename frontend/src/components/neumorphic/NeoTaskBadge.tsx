import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

interface NeoTaskBadgeProps {
  primaryLabel: string;
  secondaryLabel: string;
  secondaryColor?: 'orange' | 'green' | 'blue';
  icon?: React.ReactNode;
  className?: string;
}

export const NeoTaskBadge = ({
  primaryLabel,
  secondaryLabel,
  secondaryColor = 'orange',
  icon,
  className = ''
}: NeoTaskBadgeProps) => {
  const colorMap = {
    orange: {
      bg: 'bg-orange-200 dark:bg-orange-800',
      text: 'text-orange-700 dark:text-orange-200',
      gradient: 'from-orange-200 to-orange-300 dark:from-orange-800 dark:to-orange-700',
    },
    green: {
      bg: 'bg-green-200 dark:bg-green-800',
      text: 'text-green-700 dark:text-green-200',
      gradient: 'from-green-200 to-green-300 dark:from-green-800 dark:to-green-700',
    },
    blue: {
      bg: 'bg-blue-200 dark:bg-blue-800',
      text: 'text-blue-700 dark:text-blue-200',
      gradient: 'from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700',
    },
  };

  const colors = colorMap[secondaryColor];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      className={`
        flex items-center rounded-full
        bg-neo-bg-light dark:bg-neo-bg-dark 
        shadow-neo-raised dark:shadow-neo-raised-dark
        hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark
        overflow-hidden
        transition-all duration-300
        ${className}
      `}
    >
      {/* Primary Segment */}
      <div className="flex items-center gap-2 px-4 py-2 bg-neo-bg-light dark:bg-neo-bg-dark">
        {icon || <FileText className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
        <span className="font-semibold text-gray-900 dark:text-gray-100">{primaryLabel}</span>
      </div>

      {/* Secondary Segment with Gradient */}
      <div
        className={`
          px-4 py-2
          bg-gradient-to-r ${colors.gradient}
          ${colors.text}
          font-semibold
          relative
        `}
      >
        <div className="absolute inset-0 bg-white dark:bg-black bg-opacity-20 blur-sm" />
        <span className="relative z-10">{secondaryLabel}</span>
      </div>
    </motion.div>
  );
};
