/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { navy: '#12161C' },
        paper: '#E7E4D8',
        brass: '#C98A3E',
        settle: { blue: '#3C5A78' },
        block: { red: '#A9412C' },
        graphite: '#6B6A5F',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        ledger: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'brutal':         '4px 4px 0 0 #12161C',
        'brutal-sm':      '2px 2px 0 0 #12161C',
        'brutal-settle':  '3px 3px 0 0 #3C5A78',
        'brutal-block':   '3px 3px 0 0 #A9412C',
        'brutal-brass':   '3px 3px 0 0 #C98A3E',
        // instant 1-px snap for mechanical click — no transition
        'depress-click':  '1px 1px 0 0 #12161C',
      },
      keyframes: {
        /* Stamp ink-bleed sweep — thin light passes across stamp face */
        'ink-bleed': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        /* Hard flash behind blocked stamp */
        'flash-red': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '40%':       { backgroundColor: 'rgba(169,65,44,0.18)' },
        },
        /* Panel entrance — 80ms stagger, sharp ease-out only */
        'snap-in': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        /* Stroke-dashoffset for SVG circuit draw */
        'trace-draw': {
          from: { strokeDashoffset: '300' },
          to:   { strokeDashoffset: '0' },
        },
        /* Circuit denial — line draws partway then fades */
        'trace-deny': {
          '0%':   { strokeDashoffset: '300', opacity: '1' },
          '55%':  { strokeDashoffset: '175', opacity: '1' },
          '100%': { strokeDashoffset: '175', opacity: '0.25' },
        },
        /* Dashed "never traveled" remainder — appears after deny */
        'trace-ghost': {
          from: { opacity: '0' },
          to:   { opacity: '0.25' },
        },
        /* Breaker overshoot bounce — handle passes target by 4px */
        'breaker-on': {
          '0%':   { left: '2px' },
          '70%':  { left: '22px' },
          '85%':  { left: '16px' },
          '100%': { left: '18px' },
        },
        'breaker-off': {
          '0%':   { left: '18px' },
          '70%':  { left: '-2px' },
          '85%':  { left: '4px' },
          '100%': { left: '2px' },
        },
        /* Trip shake — for /premium-research first-attempt */
        'breaker-trip': {
          '0%':   { transform: 'translateX(0) rotate(0deg)' },
          '20%':  { transform: 'translateX(-3px) rotate(-4deg)' },
          '40%':  { transform: 'translateX(3px) rotate(3deg)' },
          '60%':  { transform: 'translateX(-2px) rotate(-2deg)' },
          '80%':  { transform: 'translateX(1px) rotate(1deg)' },
          '100%': { transform: 'translateX(0) rotate(0deg)' },
        },
        /* Spark burst */
        'spark': {
          '0%':   { transform: 'scale(0)',   opacity: '1' },
          '50%':  { transform: 'scale(2)',   opacity: '0.9' },
          '100%': { transform: 'scale(0)',   opacity: '0' },
        },
      },
      animation: {
        'ink-bleed':    'ink-bleed 150ms linear',
        'flash-red':    'flash-red 200ms ease-out',
        'snap-in':      'snap-in 240ms cubic-bezier(0.0, 0.0, 0.2, 1.0) both',
        'trace-draw':   'trace-draw var(--trace-dur, 800ms) ease-out forwards',
        'trace-deny':   'trace-deny 500ms ease-out forwards',
        'trace-ghost':  'trace-ghost 300ms ease-out 400ms both',
        'breaker-on':   'breaker-on 280ms cubic-bezier(0.0, 0.0, 0.2, 1.0) both',
        'breaker-off':  'breaker-off 280ms cubic-bezier(0.0, 0.0, 0.2, 1.0) both',
        'breaker-trip': 'breaker-trip 320ms ease-out',
        'spark':        'spark 300ms ease-out forwards',
      },
    },
  },
  plugins: [],
}
