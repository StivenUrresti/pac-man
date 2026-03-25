/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: '#0a0a1a',
        wall: '#6366f1',
        pellet: '#a855f7',
      },
      fontFamily: {
        retro: ['"Press Start 2P"', 'cursive'],
      },
    },
  },
  plugins: [],
}

