/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eagle: {
          gold: '#d4af37',
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
          bg: '#e8ebef',
          shadow: '#c1c4c8',
          highlight: '#ffffff',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neo-raised': '8px 8px 16px #c1c4c8, -8px -8px 16px #ffffff',
        'neo-raised-hover': '6px 6px 12px #c1c4c8, -6px -6px 12px #ffffff',
        'neo-raised-lift': '10px 10px 20px #c1c4c8, -10px -10px 20px #ffffff',
        'neo-pressed': 'inset 8px 8px 16px #c1c4c8, inset -8px -8px 16px #ffffff',
        'neo-glow': '0 0 20px rgba(250, 204, 21, 0.3), 8px 8px 16px #c1c4c8, -8px -8px 16px #ffffff',
      },
      ringWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
