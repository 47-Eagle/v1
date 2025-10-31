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
        bg-neo-bg-light dark:bg-neo-bg-dark rounded-2xl p-6
        shadow-neo-raised dark:shadow-neo-raised-dark
        ${hoverable ? 'hover:shadow-neo-raised-lift dark:hover:shadow-neo-raised-lift-dark cursor-pointer' : ''}
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};
