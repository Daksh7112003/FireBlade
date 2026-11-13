/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tactical: {
          dark: '#0B0F19',
          card: '#131A29',
          border: '#1E293B',
          accent: '#06B6D4',
          alert: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
        },
      },
    },
  },
  plugins: [],
};
