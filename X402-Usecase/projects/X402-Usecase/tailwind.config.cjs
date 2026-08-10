/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          navy: '#12161C',
        },
        paper: '#E7E4D8',
        brass: '#C98A3E',
        settle: {
          blue: '#3C5A78',
        },
        block: {
          red: '#A9412C',
        },
        graphite: '#6B6A5F',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        ledger: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'brutal': '4px 4px 0 0 #12161C',
        'brutal-sm': '2px 2px 0 0 #12161C',
        'brutal-settle': '3px 3px 0 0 #3C5A78',
        'brutal-block': '3px 3px 0 0 #A9412C',
        'brutal-brass': '3px 3px 0 0 #C98A3E',
        'depress': '1px 1px 0 0 #12161C',
      },
      keyframes: {
        'flash-red': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(169, 65, 44, 0.15)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'snap-in': {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'trace-draw': {
          from: { strokeDashoffset: '100' },
          to: { strokeDashoffset: '0' },
        },
        'trace-snap': {
          '0%': { strokeDashoffset: '60', opacity: '1' },
          '70%': { strokeDashoffset: '60', opacity: '1' },
          '100%': { strokeDashoffset: '60', opacity: '0.3' },
        },
        'spark': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0.8' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
      },
      animation: {
        'flash-red': 'flash-red 200ms ease-out',
        'count-up': 'count-up 400ms ease-out',
        'snap-in': 'snap-in 300ms ease-out',
        'trace-draw': 'trace-draw 800ms ease-out forwards',
        'trace-snap': 'trace-snap 400ms ease-out forwards',
        'spark': 'spark 300ms ease-out forwards',
      },
    },
  },
  // DaisyUI stripped — neo-brutalist tokens replace it entirely
  plugins: [],
}
