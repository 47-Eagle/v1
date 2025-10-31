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
        <div className="flex justify-between mb-2">
          {label && <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</label>}
          {maxLabel && onMaxClick && (
            <button
              onClick={onMaxClick}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 font-medium transition-colors"
            >
              {maxLabel}
            </button>
          )}
        </div>
      )}
      <motion.div
        whileFocus={{ scale: 1.01 }}
        className="relative"
      >
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="
            w-full px-4 py-3 rounded-2xl
            bg-neo-bg dark:bg-gray-800 
            shadow-neo-pressed dark:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.3),inset_-8px_-8px_16px_rgba(255,255,255,0.05)]
            focus:shadow-neo-raised dark:focus:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]
            text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500
            text-lg font-medium
            focus:outline-none
            transition-all duration-300
            border-none
          "
        />
      </motion.div>
    </div>
  );
};
