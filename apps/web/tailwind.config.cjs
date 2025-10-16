/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx}',
    '../shared/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#010101',
          primary: '#5f43b2',
          surface: '#3a3153',
          text: '#fefdfd',
          muted: '#b1aebb',
          accent: '#6f5ac6'
        }
      },
      backgroundColor: {
        base: '#010101',
        surface: '#3a3153'
      },
      textColor: {
        base: '#fefdfd',
        muted: '#b1aebb'
      }
    }
  },
  plugins: []
};
