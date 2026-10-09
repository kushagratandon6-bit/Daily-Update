import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 50: "#f7f7f5", 100: "#eeeeea", 200: "#dcdcd5", 300: "#b9b9ae", 500: "#6e6e63", 700: "#3a3a33", 800: "#24241f", 900: "#171713", 950: "#0e0e0b" },
        brand: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 900: "#312e81" },
        gold: { 400: "#e0b04a", 500: "#c8962e", 600: "#a87b1f" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
