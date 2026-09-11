/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F172A',
          purple: '#6C5CE7',
          'purple-dark': '#5B21B6',
          'purple-light': '#EEF2FF',
          gray: '#F8FAFC',
          border: '#E2E8F0'
        }
      }
    },
  },
  plugins: [],
}
