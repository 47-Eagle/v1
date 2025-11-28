import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface NeoSearchBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  className?: string;
}

export const NeoSearchBar = ({ 
  placeholder = 'Search...',
  onSearch,
  className = ''
}: NeoSearchBarProps) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="flex-1 relative"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="
            w-full px-4 py-3 pr-12 rounded-full
            bg-neo-bg-light dark:bg-neo-bg-dark 
            shadow-neo-raised dark:shadow-neo-raised-dark
            focus:outline-none focus:shadow-neo-raised-hover dark:focus:shadow-neo-raised-lift-dark
            focus:ring-3 focus:ring-[#F2D57C] focus:ring-opacity-50
            text-gray-800 dark:text-gray-200 
            placeholder-gray-500 dark:placeholder-gray-500
            transition-all duration-300
          "
        />
      </motion.div>
      <motion.button
        type="submit"
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        className="
          w-12 h-12 rounded-full
          bg-neo-bg-light dark:bg-neo-bg-dark 
          shadow-neo-raised dark:shadow-neo-raised-dark
          hover:shadow-neo-raised-hover dark:hover:shadow-neo-raised-lift-dark
          flex items-center justify-center
          focus:outline-none focus:ring-3 focus:ring-eagle-gold focus:ring-opacity-50
          transition-all duration-300
        "
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </motion.button>
    </form>
  );
};
