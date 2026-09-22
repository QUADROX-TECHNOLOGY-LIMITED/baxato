/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: {
            bg: '#F8FAFC',
            navbar: '#FFFFFF',
            card: '#FFFFFF',
            border: '#E2E8F0',
            heading: '#0B1220',
            body: '#526173',
            button: '#126BEB',
            buttonHover: '#0B5CC7',
            link: '#126BEB',
          },
          dark: {
            bg: '#07111F',
            navbar: '#0B1728',
            card: '#101F33',
            border: '#1D3048',
            heading: '#F8FAFC',
            body: '#A8B5C7',
            button: '#1677FF',
            buttonHover: '#0B63CE',
            link: '#1677FF',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
