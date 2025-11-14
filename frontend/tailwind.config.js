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
        // 🌟 Refined Web3-Friendly Gold Palette (Option 2)
        gold: {
          DEFAULT: '#F2D57C',     // Primary Gold (Bright, Clean)
          soft: '#C9A854',        // Secondary Gold (Softer Token Gold)
          highlight: '#FFE7A3',   // Highlight Gold (for glows, edges)
          shadow: '#A69348',      // Shadow Gold (depth without brown)
        },
        // 🎨 Premium UI Color System
        ui: {
          bg: '#0C0F14',          // Background Deep
          surface: '#161A21',     // Surface
          card: '#1E222C',        // Card
          border: '#2F3742',      // Border Subtle
          text: '#FFFFFF',        // Text Primary
          textSoft: '#C9CED7',    // Text Secondary
        },
        // Legacy eagle colors (deprecated, use gold.* instead)
        eagle: {
          gold: '#F2D57C',
          bronze: '#C9A854',
          champagne: '#FFE7A3',
          copper: '#A69348',
        },
        indigo: {
          DEFAULT: '#6366f1',
        },
        purple: {
          DEFAULT: '#8b5cf6',
        },
        // Neo colors (updated to use new UI palette)
        neo: {
          bg: {
            light: '#e8ebef',
            dark: '#0C0F14',      // Background Deep
            surface: '#161A21',   // Surface layer
            card: '#1E222C',      // Card background
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
            dark: '#2F3742',      // Border Subtle
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
        'neo-glow': '0 0 30px rgba(242, 213, 124, 0.4), 0 0 60px rgba(242, 213, 124, 0.2), 12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.9)',
        'gold-glow': '0 0 12px rgba(242, 213, 124, 0.18), 0 0 18px rgba(242, 213, 124, 0.12)',
        'gold-glow-strong': '0 0 16px rgba(242, 213, 124, 0.25), 0 0 24px rgba(242, 213, 124, 0.15)',
        'neo-hover': '10px 10px 20px rgba(163, 177, 198, 0.55), -10px -10px 20px rgba(255, 255, 255, 0.85)',
        
        // Dark mode shadows - Premium elegant neumorphic with new gold
        'neo-raised-dark': '12px 12px 24px rgba(0, 0, 0, 0.7), -12px -12px 24px rgba(50, 50, 50, 0.15)',
        'neo-raised-hover-dark': '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(50, 50, 50, 0.12)',
        'neo-raised-lift-dark': '16px 16px 32px rgba(0, 0, 0, 0.8), -16px -16px 32px rgba(60, 60, 60, 0.18)',
        'neo-pressed-dark': 'inset 8px 8px 16px rgba(0, 0, 0, 0.8), inset -8px -8px 16px rgba(40, 40, 40, 0.15)',
        'neo-inset-dark': 'inset 4px 4px 8px rgba(0, 0, 0, 0.6), inset -4px -4px 8px rgba(40, 40, 40, 0.12)',
        'neo-glow-dark': '0 0 30px rgba(242, 213, 124, 0.3), 0 0 60px rgba(242, 213, 124, 0.15), 12px 12px 24px rgba(0, 0, 0, 0.7), -12px -12px 24px rgba(50, 50, 50, 0.15)',
        'gold-glow-dark': '0 0 12px rgba(242, 213, 124, 0.22), 0 0 18px rgba(242, 213, 124, 0.14)',
        'gold-glow-strong-dark': '0 0 16px rgba(242, 213, 124, 0.3), 0 0 24px rgba(242, 213, 124, 0.18)',
        'neo-hover-dark': '10px 10px 20px rgba(0, 0, 0, 0.65), -10px -10px 20px rgba(50, 50, 50, 0.13)',
      },
      ringWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
