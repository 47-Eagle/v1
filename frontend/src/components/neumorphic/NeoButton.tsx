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
      whileHover={disabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      style={{ pointerEvents: disabled ? 'none' : 'auto' }}
      className={`
        px-6 py-3 sm:px-8 sm:py-3.5 rounded-full flex items-center justify-center gap-2 sm:gap-3 font-semibold
        text-sm sm:text-base
        bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
        text-gray-900 dark:text-gray-100
        border border-gray-200/50 dark:border-gray-600/50
        transition-all duration-400 ease-out
        touch-manipulation
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer active:scale-95'}
        ${active 
          ? 'shadow-neo-pressed dark:shadow-neo-pressed-dark border-gray-300/70 dark:border-gray-500/60' 
          : 'shadow-neo-raised hover:shadow-neo-hover dark:shadow-neo-raised-dark dark:hover:shadow-neo-hover-dark hover:border-gray-300/70 dark:hover:border-gray-500/60'
        }
        ${glowing ? 'shadow-neo-glow dark:shadow-neo-glow-dark ring-2 ring-[#F2D57C] dark:ring-[#FFE7A3] ring-opacity-70 animate-pulse' : ''}
        focus:outline-none focus:ring-2 focus:ring-[#F2D57C] dark:focus:ring-[#FFE7A3] focus:ring-opacity-60
        ${className}
      `}
    >
      {icon && <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>}
      <span className="tracking-wide">{label}</span>
    </motion.button>
  );
};
