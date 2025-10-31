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
      transition={{ duration: 0.3 }}
      whileHover={hoverable ? { scale: 1.01, y: -2 } : {}}
      className={`
        bg-neo-bg dark:bg-gray-800 rounded-2xl p-6
        shadow-neo-raised dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]
        ${hoverable ? 'hover:shadow-neo-raised-lift dark:hover:shadow-[10px_10px_20px_rgba(0,0,0,0.4),-10px_-10px_20px_rgba(255,255,255,0.06)] cursor-pointer' : ''}
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};
