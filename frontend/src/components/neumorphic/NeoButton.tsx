import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface NeoButtonProps {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  glowing?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const NeoButton = ({ 
  label, 
  icon, 
  active = false, 
  glowing = false,
  onClick,
  disabled = false,
  className = ''
}: NeoButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`
        px-6 py-3 rounded-full flex items-center justify-center gap-2 font-semibold
        bg-neo-bg-light dark:bg-neo-bg-dark 
        text-gray-900 dark:text-gray-100
        transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${active 
          ? 'shadow-neo-pressed dark:shadow-neo-pressed-dark' 
          : 'shadow-neo-raised hover:shadow-neo-raised-lift dark:shadow-neo-raised-dark dark:hover:shadow-neo-raised-lift-dark'
        }
        ${glowing ? 'shadow-neo-glow dark:shadow-neo-glow-dark ring-2 ring-yellow-400 dark:ring-yellow-500 ring-opacity-60 animate-pulse' : ''}
        focus:outline-none focus:ring-2 focus:ring-eagle-gold focus:ring-opacity-50
        ${className}
      `}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
};
