import { motion } from 'framer-motion';
import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface NeoTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export const NeoTabs = ({ tabs, defaultTab, onChange }: NeoTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div className="flex gap-2 bg-neo-bg dark:bg-gray-900 p-1 rounded-full shadow-neo-raised dark:shadow-[8px_8px_16px_rgba(0,0,0,0.8),-8px_-8px_16px_rgba(255,255,255,0.03)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              px-6 py-2 rounded-full font-medium transition-all duration-300
              relative flex-1
              ${isActive 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }
              focus:outline-none focus:ring-3 focus:ring-green-300 focus:ring-opacity-50
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-full bg-white dark:bg-gray-800 shadow-neo-raised dark:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.8),inset_-8px_-8px_16px_rgba(255,255,255,0.03)] -z-0"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
