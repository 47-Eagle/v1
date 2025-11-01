"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeoSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const NeoSwitch: React.FC<NeoSwitchProps> = ({
  checked,
  onChange,
  label,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && (
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {label}
        </span>
      )}
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-16 h-8 rounded-full transition-all duration-300",
          "bg-background-light dark:bg-background-dark",
          "neo-inset",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        )}
      >
        <motion.div
          animate={{
            x: checked ? 32 : 4,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "absolute top-1 w-6 h-6 rounded-full",
            "bg-background-light dark:bg-background-dark",
            "neo-shadow",
            checked && "shadow-[0_0_15px_rgba(34,197,94,0.6)]",
            checked && "bg-green-500/20"
          )}
        >
          <div
            className={cn(
              "w-full h-full rounded-full transition-all duration-300",
              checked && "bg-gradient-to-br from-green-400 to-green-600"
            )}
          />
        </motion.div>
      </button>
    </div>
  );
};

