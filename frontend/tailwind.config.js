/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#081B39',
          50: '#0d2a5a',
          100: '#102855',
          200: '#0e2248',
          300: '#081B39',
          400: '#061530',
          500: '#040f22',
        },
        slate: {
          medical: '#102855',
        },
        teal: {
          medical: '#12C9C1',
          light: '#1de8df',
          dark: '#0da8a1',
        },
        risk: {
          low: '#10b981',
          lowBg: '#d1fae5',
          moderate: '#f59e0b',
          moderateBg: '#fef3c7',
          high: '#dc2626',
          highBg: '#fee2e2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-ring': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
