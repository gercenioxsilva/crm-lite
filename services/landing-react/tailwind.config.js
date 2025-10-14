/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F10',
        panel: '#171718',
        border: '#2A2A2B',
        text: '#F2F2F3',
        muted: '#B0B0B5',
        primary: '#8A05BE',
        'primary-2': '#b5179e',
        accent: '#12CBC4',
        error: '#ff6b6b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'radial-gradient(1200px 600px at -10% -10%, rgba(138,5,190,.24), transparent 50%), radial-gradient(800px 500px at 120% -20%, rgba(181,23,158,.14), transparent 60%)',
      },
    },
  },
  plugins: [],
}