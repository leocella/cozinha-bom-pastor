import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        card: "#FFFFFF",
        ink: "#1B1A16",
        muted: "#6F6C63",
        line: "#E6E3DB",
        brand: {
          DEFAULT: "#1F7A5C",
          dark: "#175E47",
          soft: "#E7F1EC",
        },
        amber: {
          DEFAULT: "#E29A2C",
          soft: "#FBEBCF",
        },
        danger: {
          DEFAULT: "#B4462F",
          soft: "#F6E1DB",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque Variable"', "Georgia", "serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27,26,22,0.04), 0 6px 20px rgba(27,26,22,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
