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
    <div className="flex gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full shadow-neo-raised dark:shadow-neo-raised-dark border border-gray-200/50 dark:border-gray-600/50 transition-all duration-300">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              px-4 py-2 sm:px-6 sm:py-2 rounded-full font-medium transition-all duration-300
              relative flex-1 z-10
              text-xs sm:text-sm md:text-base
              touch-manipulation
              ${isActive 
                ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-700 shadow-neo-raised dark:shadow-neo-inset-dark border border-gray-200/50 dark:border-gray-600/50' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700'
              }
              focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
