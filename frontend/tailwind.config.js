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
          navy: '#0B132B',
          dark: '#0F172A',
          primary: '#4F46E5', // Electric Indigo
          'primary-hover': '#4338CA',
          accent: '#10B981', // Athletic Emerald
          court: '#059669',
          surface: '#F8FAFC',
          border: '#E2E8F0',
        },
        court: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.05)',
        'glow-primary': '0 0 25px -4px rgba(79, 70, 229, 0.3)',
        'glow-court': '0 0 25px -4px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
