/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/client/**/*.{html,tsx}'],
  theme: {
    extend: {
      fontSize: {
        base: '16px',
      },
      animation: {
        confetti: 'confetti 0.6s ease-out forwards',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        confetti: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1.5) rotate(180deg)', opacity: '0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
