/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safetrip: {
          teal: '#00A88F',
          darkTeal: '#0B826F',
          navy: '#0A2540',
          rose: '#E11D48',
          pink: '#EC4899',
          lightBg: '#F8FAFC',
          lightGreenBg: '#F0FDF4',
          lightRoseBg: '#FFF1F2'
        }
      }
    },
  },
  plugins: [],
}
