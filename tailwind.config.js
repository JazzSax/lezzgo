/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm travel palette
        base: {
          bg: "#0b1220",
          surface: "#111a2e",
          card: "#16223b",
          border: "#22314f",
        },
        accent: {
          DEFAULT: "#ff7a45", // sunset orange
          soft: "#ffb08a",
        },
        sea: {
          DEFAULT: "#2dd4bf", // teal
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
