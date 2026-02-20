/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF9F6',
        'champagne-gold': '#D4AF37',
        'soft-gold': '#E5D1B0',
        'brand-gold': '#C5A059',
        'text-main': '#2D2926',
        'text-muted': '#6B6661',
        'border-light': '#E8E2D9',
        'sage-bg': '#f2f5f1',
        'sage-text': '#5d6e5a',
        'blush-bg': '#fdf2f2',
        'blush-text': '#966b6b',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        hover: '0 10px 30px -4px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
