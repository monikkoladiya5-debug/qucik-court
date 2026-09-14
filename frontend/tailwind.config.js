/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Kinetic Obsidian Theme Tokens
        obsidian: {
          950: '#080B11',
          900: '#0B0F17', // Canvas base
          850: '#0F131C', // Surface base
          800: '#181C24', // Card container
          750: '#1E2430', // Elevated container
          700: '#28303F', // Border outline default
          600: '#3B4556',
        },
        lime: {
          300: '#BEF264',
          400: '#A3E635', // Kinetic Electric Lime primary
          500: '#84CC16',
          600: '#65A30D',
        },
        // QuickCourt Shorthands
        qc: {
          bg: '#0B0F17',
          surface: '#0F131C',
          card: '#181C24',
          elevated: '#1E2430',
          border: '#28303F',
          primary: '#A3E635',
          secondary: '#047857',
          mint: '#10B981',
          muted: '#9CA3AF',
        },
        // Legacy Brand & Court mappings for backward-compatibility
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
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 2px 6px -1px rgba(0, 0, 0, 0.4)',
        'qc-card': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'qc-lime': '0 0 14px -2px rgba(163, 230, 53, 0.3)',
        'qc-mint': '0 0 14px -2px rgba(16, 185, 129, 0.25)',
        'glow-primary': '0 0 25px -4px rgba(79, 70, 229, 0.3)',
        'glow-court': '0 0 25px -4px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
