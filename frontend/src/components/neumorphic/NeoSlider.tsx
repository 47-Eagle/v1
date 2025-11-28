import { motion } from 'framer-motion';
import { useState, useRef } from 'react';

interface NeoSliderProps {
  min?: number;
  max?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  label?: string;
}

export const NeoSlider = ({
  min = 0,
  max = 100,
  value: controlledValue,
  defaultValue = 50,
  onChange,
  label
}: NeoSliderProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const trackRef = useRef<HTMLDivElement>(null);

  const handleChange = (newValue: number) => {
    const clampedValue = Math.max(min, Math.min(max, newValue));
    if (!isControlled) {
      setInternalValue(clampedValue);
    }
    onChange?.(clampedValue);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newValue = min + percentage * (max - min);
    handleChange(newValue);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1.5 sm:mb-2">
          <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium truncate">{label}</span>
          <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm flex-shrink-0 ml-2">{Math.round(value)}%</span>
        </div>
      )}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="
          relative h-2.5 sm:h-3 w-full rounded-full
          bg-neo-bg-light dark:bg-neo-bg-dark 
          shadow-neo-raised dark:shadow-neo-raised-dark
          cursor-pointer
          touch-manipulation
          transition-all duration-300
        "
      >
        {/* Filled track */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-700 shadow-inner"
          style={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Thumb */}
        <motion.div
          drag="x"
          dragConstraints={trackRef}
          dragElastic={0}
          onDrag={(_, info) => {
            if (!trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const dragPercentage = (info.point.x - rect.left) / rect.width;
            const newValue = min + dragPercentage * (max - min);
            handleChange(newValue);
          }}
          whileDrag={{ scale: 1.2 }}
          whileHover={{ scale: 1.1 }}
          className="
            absolute top-1/2 left-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full
            bg-white dark:bg-gray-300 
            shadow-neo-raised-lift dark:shadow-neo-raised-lift-dark
            cursor-grab active:cursor-grabbing
            touch-manipulation
            -translate-y-1/2
            -translate-x-1/2
          "
          style={{ left: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
};
