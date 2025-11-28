import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface NeoCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const NeoCard = ({ children, className = '', hoverable = false }: NeoCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={hoverable ? { scale: 1.015, y: -4 } : {}}
      className={`
        bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
        rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6
        shadow-neo-raised dark:shadow-neo-raised-dark
        border border-gray-200/50 dark:border-gray-600/50
        backdrop-blur-sm
        ${hoverable ? 'hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark hover:border-gray-300/60 dark:hover:border-gray-500/60 cursor-pointer active:scale-[1.01]' : ''}
        transition-all duration-500 ease-out
        touch-manipulation
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};
