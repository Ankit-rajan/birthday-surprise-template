/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Colours read CSS variables (set per page by the theme, see src/config/siteConfig themeVars); the fallbacks are the classic look.
        burgundy: {
          DEFAULT: 'rgb(var(--c-burgundy, 90 15 35) / <alpha-value>)',
          deep: 'rgb(var(--c-burgundy-deep, 58 10 23) / <alpha-value>)',
          dark: 'rgb(var(--c-burgundy-dark, 36 6 16) / <alpha-value>)',
          soft: 'rgb(var(--c-burgundy-soft, 123 26 53) / <alpha-value>)',
        },
        midnight: 'rgb(var(--c-midnight, 11 7 9) / <alpha-value>)',
        gold: {
          DEFAULT: 'rgb(var(--c-gold, 212 180 131) / <alpha-value>)',
          light: 'rgb(var(--c-gold-light, 236 217 176) / <alpha-value>)',
          dark: 'rgb(var(--c-gold-dark, 176 141 87) / <alpha-value>)',
        },
        ivory: 'rgb(var(--c-ivory, 250 244 232) / <alpha-value>)',
        cream: 'rgb(var(--c-cream, 255 248 236) / <alpha-value>)',
        blush: { DEFAULT: '#f4cfd3', deep: '#e8a3b0' },
        btn: {
          DEFAULT: 'rgb(var(--c-btn, 212 180 131) / <alpha-value>)',
          light: 'rgb(var(--c-btn-light, 236 217 176) / <alpha-value>)',
          text: 'rgb(var(--c-btn-text, 36 6 16) / <alpha-value>)',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif, "Cormorant Garamond")', 'Georgia', 'serif'],
        script: ['var(--font-script, "Great Vibes")', 'cursive'],
        hand: ['var(--font-hand, Caveat)', 'cursive'],
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
