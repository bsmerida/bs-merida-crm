import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont"],
      },
      colors: {
        brand: {
          50: "#F4F2F9",
          100: "#E5E0F0",
          200: "#C7BCDF",
          300: "#A292C8",
          400: "#8071AE",
          500: "#5E4B8E",
          600: "#4D3D74",
          700: "#3D3060",
          800: "#2E244A",
          900: "#1F1832",
        },
        ink: {
          DEFAULT: "#2A2640",
          muted: "#6E6987",
          soft: "#948FAA",
          line: "#EAE5F2",
          ghost: "#F8F6FB",
        },
        warm: {
          50: "#FDF7F0",
          100: "#FBEEE0",
          200: "#F5D9B8",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.04)",
        float: "0 8px 24px -8px rgba(94,75,142,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
