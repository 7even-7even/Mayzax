/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF3FB',
          100: '#D5E0F5',
          200: '#A9BFEB',
          300: '#7D9EE0',
          400: '#507DD5',
          500: '#245CCB',
          600: '#1D4AA2',
          700: '#15387A',
          800: '#0E2551',
          900: '#0B2545',
        },
        accent: {
          500: '#13A89E',
          600: '#0F877F',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#0F172A',
        },
        muted: {
          light: '#F1F5F9',
          dark: '#1E293B',
        },
      },
      fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
      },
    },
  },
  plugins: [],
};
