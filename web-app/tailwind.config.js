/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: '#f5f7f6',
        ink: '#0f1f19',
        mute: '#66766e',
        line: '#e6ebe8',
        live: '#f5a524',
        'live-text': '#b87400',
        danger: '#d64545',
        ext: '#6d5bd0',
        info: '#2d6cdf',
        brand: {
          50: '#e4f3ec',
          100: '#cfe9dd',
          200: '#a7d6c1',
          300: '#6fbb9d',
          400: '#38997a',
          500: '#0f8a67',
          600: '#0b7a5a',
          700: '#09644a',
          800: '#084f3b',
          900: '#063d2e',
          950: '#032a20',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        portal: '1240px',
      },
    },
  },
  plugins: [],
}
