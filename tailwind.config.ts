import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#1C2B4B",
          mid:     "#263650",
          light:   "#3D5278",
          50:      "#EEF1F6",
          100:     "#D4DBE8",
        },
        gold: {
          DEFAULT: "#C4956A",
          lt:      "#E8C99A",
          dk:      "#8C6040",
          50:      "#FDF7F0",
          100:     "#F9EADB",
        },
        cream: "#FAF8F5",
        stone: {
          DEFAULT: "#EDE9E1",
          dk:      "#D4CFC6",
        },
        // brand maps to navy for backward compat in admin
        brand: {
          50:  "#EEF1F6",
          100: "#D4DBE8",
          200: "#A9B7D1",
          300: "#7E93B9",
          400: "#536FA2",
          500: "#1C2B4B",
          600: "#192545",
          700: "#151F3A",
          800: "#10182E",
          900: "#0C1222",
        },
        ink: {
          DEFAULT: "#111827",
          muted:   "#4B5563",
          soft:    "#9CA3AF",
          line:    "#EDE9E1",
          ghost:   "#FAF8F5",
        },
      },
      boxShadow: {
        card:  "0 1px 2px 0 rgba(0,0,0,0.04)",
        float: "0 8px 24px -8px rgba(28,43,75,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
