/**
 * Eagle OVault Design System
 * Consistent styling tokens for neumorphic design
 */

export const DESIGN_SYSTEM = {
  // Card Backgrounds - Using new Web3-friendly gold palette
  backgrounds: {
    card: 'bg-gradient-to-br from-white to-gray-50 dark:from-[#161A21] dark:to-[#1E222C]',
    cardAlt: 'bg-gradient-to-br from-gray-50 to-white dark:from-[#1E222C] dark:to-[#161A21]',
    highlight: 'bg-gradient-to-br from-[#FFE7A3]/20 to-[#F2D57C]/10 dark:from-[#A69348]/20 dark:to-[#C9A854]/15',
    info: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
    inset: 'bg-white/50 dark:bg-[#0C0F14]/50',
  },

  // Shadows
  shadows: {
    raised: 'shadow-neo-raised dark:shadow-neo-raised-dark',
    raisedHover: 'hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark',
    pressed: 'shadow-neo-pressed dark:shadow-neo-pressed-dark',
    inset: 'shadow-neo-inset dark:shadow-neo-inset-dark',
    glow: 'shadow-neo-glow dark:shadow-neo-glow-dark',
    goldGlow: 'shadow-gold-glow dark:shadow-gold-glow-dark',
    goldGlowStrong: 'shadow-gold-glow-strong dark:shadow-gold-glow-strong-dark',
  },

  // Borders - Using new UI border color
  borders: {
    subtle: 'border border-gray-200/50 dark:border-[#2F3742]/50',
    medium: 'border-2 border-gray-300/60 dark:border-[#2F3742]/60',
    highlight: 'border-2 border-[#F2D57C]/60 dark:border-[#C9A854]/50',
    info: 'border-2 border-blue-400 dark:border-blue-600',
    separator: 'border-gray-300/50 dark:border-[#2F3742]/30',
  },

  // Border Radius
  radius: {
    sm: 'rounded-xl',      // 12px - small cards, inputs
    md: 'rounded-2xl',     // 16px - medium cards, buttons
    lg: 'rounded-3xl',     // 24px - large cards, main containers
    full: 'rounded-full',  // pills, avatars
  },

  // Text Hierarchy
  text: {
    // Headings
    h1: 'text-3xl font-bold text-gray-900 dark:text-gray-100',
    h2: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
    h3: 'text-xl font-semibold text-gray-900 dark:text-gray-100',
    h4: 'text-lg font-semibold text-gray-900 dark:text-white',
    
    // Body
    body: 'text-base text-gray-700 dark:text-gray-300',
    bodyMuted: 'text-base text-gray-600 dark:text-gray-400',
    
    // Labels
    label: 'text-sm font-semibold text-gray-700 dark:text-gray-300',
    labelMuted: 'text-sm font-medium text-gray-600 dark:text-gray-400',
    labelSmall: 'text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider',
    
    // Values
    valueLarge: 'text-4xl font-bold text-gray-900 dark:text-gray-100',
    valueMedium: 'text-2xl font-bold text-gray-900 dark:text-white',
    valueSmall: 'text-lg font-bold text-gray-900 dark:text-gray-100',
    
    // Descriptions
    description: 'text-sm text-gray-600 dark:text-gray-400',
    descriptionSmall: 'text-xs text-gray-500 dark:text-gray-400',
    
    // Highlights - Using new Web3-friendly gold palette
    highlight: 'text-[#C9A854] dark:text-[#F2D57C]',
    highlightBold: 'text-[#A69348] dark:text-[#FFE7A3] font-semibold',
  },

  // Spacing
  spacing: {
    cardPadding: 'p-6',
    cardPaddingLarge: 'p-8',
    cardPaddingSmall: 'p-4',
    sectionGap: 'space-y-8',
    itemGap: 'space-y-4',
    itemGapSmall: 'space-y-2',
  },

  // Transitions
  transitions: {
    default: 'transition-all duration-300 ease-out',
    fast: 'transition-all duration-200 ease-out',
    slow: 'transition-all duration-500 ease-out',
  },

  // Interactive States
  interactive: {
    hover: 'hover:scale-[1.02] hover:shadow-neo-hover dark:hover:shadow-neo-hover-dark',
    active: 'active:scale-[0.98]',
    disabled: 'opacity-40 cursor-not-allowed grayscale',
  },
} as const;

// Helper function to combine design system classes
export const ds = (...classes: string[]) => classes.filter(Boolean).join(' ');

