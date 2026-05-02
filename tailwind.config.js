/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#141313',
        surface: '#2a2a2a',
        border: '#444444',
        text: '#e5e2e1',
        textMuted: '#94918e',
        primary: '#6699cc',
      }
    },
  },
  plugins: [],
}
