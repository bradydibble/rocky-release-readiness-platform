/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rocky: {
          green: '#10b981',
          blue: '#3b82f6',
          dark: '#1e293b',
        },
      },
    },
  },
  plugins: [],
}
