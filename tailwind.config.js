/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f7f3ff",
          100: "#eee7ff",
          200: "#d9ccff",
          300: "#bfa6ff",
          400: "#a275ff",
          500: "#8b4dff",
          600: "#7b2bff",
          700: "#681ce6",
          800: "#5516bf",
          900: "#45139a"
        }
      },
      boxShadow: {
        glass: "0 10px 30px rgba(139,77,255,0.25)",
        glow: "0 0 30px rgba(139,77,255,0.35)"
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
};
