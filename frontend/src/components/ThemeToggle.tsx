import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    // Initialize from current state (set by script in index.html)
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    // Ensure state is synced with actual DOM state on mount
    const shouldBeDark = document.documentElement.classList.contains('dark');
    setIsDark(shouldBeDark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center
        transition-all duration-300
        touch-manipulation
        ${isDark
          ? 'bg-neo-bg-dark shadow-neo-raised-dark hover:shadow-neo-raised-lift-dark'
          : 'bg-neo-bg-light shadow-neo-raised hover:shadow-neo-raised-lift'
        }
        focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50
      `}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 0 : 1,
          rotate: isDark ? 90 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Sun className={`w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 ${isDark ? 'text-gray-500' : 'text-[#D4B474]'}`} />
      </motion.div>
      
      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 1 : 0,
          rotate: isDark ? 0 : -90,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Moon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 ${isDark ? 'text-blue-400' : 'text-gray-500'}`} />
      </motion.div>
    </motion.button>
  );
};

