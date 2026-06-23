/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#f59e0b', // Amber/Gold
          DEFAULT: '#ea580c', // Orange
          dark: '#c2410c' // Dark Orange
        },
        luxury: {
          black: '#0a0a0a',
          dark: '#121212',
          card: '#1a1a1a',
          gold: '#e0a96d'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'luxury': '0 10px 50px -12px rgba(234, 88, 12, 0.15)'
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
