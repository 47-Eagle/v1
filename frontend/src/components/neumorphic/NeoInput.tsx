import { motion } from 'framer-motion';

interface NeoInputProps {
  type?: 'text' | 'number' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  maxLabel?: string;
  onMaxClick?: () => void;
  className?: string;
}

export const NeoInput = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  maxLabel,
  onMaxClick,
  className = ''
}: NeoInputProps) => {
  return (
    <div className={className}>
      {(label || maxLabel) && (
        <div className="flex justify-between mb-2 sm:mb-3">
          {label && <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold tracking-wide">{label}</label>}
          {maxLabel && onMaxClick && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMaxClick}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-eagle-gold dark:hover:text-eagle-gold-light font-semibold transition-all duration-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation active:bg-gray-200 dark:active:bg-gray-700"
            >
              {maxLabel}
            </motion.button>
          )}
        </div>
      )}
      <motion.div
        whileFocus={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="relative"
      >
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="
            w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl
            bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
            shadow-neo-inset dark:shadow-neo-inset-dark
            focus:shadow-neo-pressed dark:focus:shadow-neo-pressed-dark
            border border-gray-200/50 dark:border-gray-600/50
            focus:border-gray-300/70 dark:focus:border-gray-500/60
            text-gray-900 dark:text-gray-100 
            placeholder-gray-400 dark:placeholder-gray-500
            text-base sm:text-lg font-semibold
            focus:outline-none focus:ring-2 focus:ring-eagle-gold dark:focus:ring-eagle-gold-light focus:ring-opacity-40
            transition-all duration-400 ease-out
            touch-manipulation
          "
        />
      </motion.div>
    </div>
  );
};
