/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: { DEFAULT: '#5a0f23', deep: '#3a0a17', dark: '#240610', soft: '#7b1a35' },
        midnight: '#0b0709',
        gold: { DEFAULT: '#d4b483', light: '#ecd9b0', dark: '#b08d57' },
        ivory: '#faf4e8',
        cream: '#fff8ec',
        blush: { DEFAULT: '#f4cfd3', deep: '#e8a3b0' },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['"Great Vibes"', 'cursive'],
        hand: ['Caveat', 'cursive'],
        sans: ['Jost', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(212, 180, 131, 0.25)',
        soft: '0 20px 60px -20px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-10px)' },
          '40%': { transform: 'translateX(9px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        twinkle: { '0%, 100%': { opacity: 0.2 }, '50%': { opacity: 1 } },
      },
      animation: { shake: 'shake 0.5s ease-in-out', twinkle: 'twinkle 3s ease-in-out infinite' },
    },
  },
  plugins: [],
};
