import { motion } from 'framer-motion';
import { useState } from 'react';

interface NeoSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

export const NeoSwitch = ({ 
  checked: controlledChecked,
  onChange,
  label 
}: NeoSwitchProps) => {
  const [internalChecked, setInternalChecked] = useState(false);
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleToggle = () => {
    const newValue = !checked;
    if (!isControlled) {
      setInternalChecked(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
      )}
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.95 }}
        className={`
          w-14 h-8 rounded-full relative
          transition-all duration-300
          ${checked 
            ? 'bg-green-400 dark:bg-green-500 shadow-neo-pressed dark:shadow-neo-pressed-dark' 
            : 'bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark'
          }
          focus:outline-none focus:ring-3 focus:ring-green-300 dark:focus:ring-green-500 focus:ring-opacity-50
        `}
        aria-label={label || 'Toggle switch'}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`
            absolute top-1 w-6 h-6 rounded-full
            ${checked ? 'right-1' : 'left-1'}
            bg-white dark:bg-gray-200 shadow-neo-raised dark:shadow-neo-raised-dark
          `}
        />
        {checked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 rounded-full bg-green-400 dark:bg-green-500 bg-opacity-30 blur-sm"
          />
        )}
      </motion.button>
      {checked && (
        <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">ON</span>
      )}
      {!checked && (
        <span className="text-gray-500 dark:text-gray-500 font-medium text-sm">OFF</span>
      )}
    </div>
  );
};
