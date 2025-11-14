/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode with class strategy
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eagle: {
          // Enhanced Premium Metallic Gold Palette
          gold: '#D4B474',        // Enhanced Metallic Gold - brighter, more vibrant
          bronze: '#A27D46',      // Rich Bronze - for depth
          champagne: '#E4CFA0',   // Lighter Champagne Highlight - soft edges
          copper: '#8C6A38',      // Deep Copper - subtle outlines
          // Legacy colors (for gradual migration)
          'gold-legacy': '#d4af37',
          'gold-dark': '#b8941f',
          'gold-darker': '#a0800d',
          'gold-darkest': '#8a6f00',
          'gold-light': '#e2c55f',
          'gold-lighter': '#edd577',
          'gold-lightest': '#f5e89f',
        },
        indigo: {
          DEFAULT: '#6366f1',
        },
        purple: {
          DEFAULT: '#8b5cf6',
        },
        neo: {
          bg: {
            light: '#e8ebef',
            dark: '#0B0D10',      // Sharper Deep Charcoal - main background
            surface: '#1A1D23',   // Surface layer
            card: '#22262E',      // Card background
          },
          shadow: {
            light: '#c1c4c8',
            dark: '#141414',
          },
          highlight: {
            light: '#ffffff',
            dark: '#2a2a2a',
          },
          border: {
            light: '#d1d5db',
            dark: '#353A42',      // Premium border color
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        // Light mode shadows - Elegant neumorphic
        'neo-raised': '12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.9)',
        'neo-raised-hover': '8px 8px 16px rgba(163, 177, 198, 0.5), -8px -8px 16px rgba(255, 255, 255, 0.8)',
        'neo-raised-lift': '16px 16px 32px rgba(163, 177, 198, 0.7), -16px -16px 32px rgba(255, 255, 255, 1)',
        'neo-pressed': 'inset 8px 8px 16px rgba(163, 177, 198, 0.4), inset -8px -8px 16px rgba(255, 255, 255, 0.7)',
        'neo-inset': 'inset 4px 4px 8px rgba(163, 177, 198, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.6)',
        'neo-glow': '0 0 30px rgba(212, 180, 116, 0.4), 0 0 60px rgba(212, 180, 116, 0.2), 12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.9)',
        'gold-glow': '0 0 12px rgba(212, 180, 116, 0.18), 0 0 18px rgba(212, 180, 116, 0.12)',
        'gold-glow-strong': '0 0 16px rgba(212, 180, 116, 0.25), 0 0 24px rgba(212, 180, 116, 0.15)',
        'neo-hover': '10px 10px 20px rgba(163, 177, 198, 0.55), -10px -10px 20px rgba(255, 255, 255, 0.85)',
        
        // Dark mode shadows - Premium elegant neumorphic
        'neo-raised-dark': '12px 12px 24px rgba(0, 0, 0, 0.7), -12px -12px 24px rgba(50, 50, 50, 0.15)',
        'neo-raised-hover-dark': '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(50, 50, 50, 0.12)',
        'neo-raised-lift-dark': '16px 16px 32px rgba(0, 0, 0, 0.8), -16px -16px 32px rgba(60, 60, 60, 0.18)',
        'neo-pressed-dark': 'inset 8px 8px 16px rgba(0, 0, 0, 0.8), inset -8px -8px 16px rgba(40, 40, 40, 0.15)',
        'neo-inset-dark': 'inset 4px 4px 8px rgba(0, 0, 0, 0.6), inset -4px -4px 8px rgba(40, 40, 40, 0.12)',
        'neo-glow-dark': '0 0 30px rgba(212, 180, 116, 0.3), 0 0 60px rgba(212, 180, 116, 0.15), 12px 12px 24px rgba(0, 0, 0, 0.7), -12px -12px 24px rgba(50, 50, 50, 0.15)',
        'gold-glow-dark': '0 0 12px rgba(212, 180, 116, 0.22), 0 0 18px rgba(212, 180, 116, 0.14)',
        'gold-glow-strong-dark': '0 0 16px rgba(212, 180, 116, 0.3), 0 0 24px rgba(212, 180, 116, 0.18)',
        'neo-hover-dark': '10px 10px 20px rgba(0, 0, 0, 0.65), -10px -10px 20px rgba(50, 50, 50, 0.13)',
      },
      ringWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
