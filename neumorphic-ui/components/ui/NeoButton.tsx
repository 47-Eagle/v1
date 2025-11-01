"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface NeoButtonProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  label,
  icon,
  active,
  onClick,
  className,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300",
        "bg-background-light dark:bg-background-dark",
        "text-gray-800 dark:text-gray-100",
        active
          ? "neo-inset"
          : "neo-shadow hover:brightness-105 dark:hover:brightness-110",
        active && "ring-2 ring-green-500/50 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark",
        sizeClasses[size],
        className
      )}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      <span>{label}</span>
    </motion.button>
  );
};

