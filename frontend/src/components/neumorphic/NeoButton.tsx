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
        bg-neo-bg dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${active 
          ? 'shadow-neo-pressed dark:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.3),inset_-8px_-8px_16px_rgba(255,255,255,0.05)]' 
          : 'shadow-neo-raised dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)] hover:shadow-neo-raised-lift dark:hover:shadow-[10px_10px_20px_rgba(0,0,0,0.4),-10px_-10px_20px_rgba(255,255,255,0.06)]'
        }
        ${glowing ? 'shadow-neo-glow ring-2 ring-yellow-400 ring-opacity-60 animate-pulse' : ''}
        focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50
        ${className}
      `}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
};
