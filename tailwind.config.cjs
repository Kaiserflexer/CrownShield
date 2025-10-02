const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        brand: {
          DEFAULT: '#7c3aed',
          dark: '#5b21b6'
        }
      }
    }
  },
  plugins: []
};
