/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // PillPulse color palette as defined in architecture
      colors: {
        'pillpulse-blue': '#2196F3',
        'pillpulse-green': '#81C784', 
        'pillpulse-white': '#FFFFFF',
        'pillpulse-gray': '#B0BEC5',
        'pillpulse-teal': '#26A69A',
      },
      // Custom animation for smooth transitions
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}