/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand:  { DEFAULT: '#00C853', dark: '#009624', light: '#5EFC82' },
        admin:  { bg: '#0A0F1E', surface: '#111827', card: '#1F2937', border: '#374151', hover: '#1F2937' },
        status: { success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in':  'fadeIn 0.4s ease-out',
      },
      keyframes: {
        slideIn: { from: { transform: 'translateX(-20px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
