import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#e8ebef',
          dark: '#1c1c1e',
        },
      },
      boxShadow: {
        'neo-light': '8px 8px 16px #c1c4c8, -8px -8px 16px #ffffff',
        'neo-dark': '8px 8px 16px #141414, -8px -8px 16px #2a2a2a',
        'neo-light-sm': '4px 4px 8px #c1c4c8, -4px -4px 8px #ffffff',
        'neo-dark-sm': '4px 4px 8px #141414, -4px -4px 8px #2a2a2a',
        'neo-inset-light': 'inset 4px 4px 8px #c1c4c8, inset -4px -4px 8px #ffffff',
        'neo-inset-dark': 'inset 4px 4px 8px #141414, inset -4px -4px 8px #2a2a2a',
      },
    },
  },
  plugins: [],
};
export default config;

