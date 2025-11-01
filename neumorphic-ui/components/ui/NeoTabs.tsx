"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface NeoTabsProps {
  tabs?: Tab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

const defaultTabs: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "settings", label: "Settings" },
];

export const NeoTabs: React.FC<NeoTabsProps> = ({
  tabs = defaultTabs,
  defaultTab,
  onTabChange,
  className,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div
      className={cn(
        "inline-flex p-1 rounded-full",
        "bg-background-light dark:bg-background-dark",
        "neo-inset",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={cn(
            "relative px-6 py-2 rounded-full font-medium text-sm transition-all duration-300",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            activeTab === tab.id
              ? "text-gray-900 dark:text-white"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          )}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className={cn(
                "absolute inset-0 rounded-full",
                "bg-background-light dark:bg-background-dark",
                "neo-shadow",
                "ring-2 ring-blue-500/30"
              )}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

