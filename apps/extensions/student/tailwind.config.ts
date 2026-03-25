import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#fdf6ef",
        foreground: "#4d3728",
        card: "#fffaf5",
        muted: "#f4e9dc",
        border: "#e9ddd0",
        primary: "#7d5b30"
      }
    }
  },
  plugins: []
};

export default config;
