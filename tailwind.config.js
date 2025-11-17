/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D47A1',
        secondary: '#1565C0',
        accent: '#2196F3',
        dark: '#121212',
        'dark-light': '#333333',
        'light-blue': '#64B5F6'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}