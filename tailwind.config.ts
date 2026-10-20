import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        ink: { DEFAULT: "#1c1b19", soft: "#55524c", faint: "#8d8980" },
        paper: { DEFAULT: "#fbfaf7", raised: "#ffffff", sunk: "#f3f1ec" },
        line: "#e7e4dd",
        accent: { DEFAULT: "#3b5bdb", soft: "#eef2ff" },
      },
    },
  },
  plugins: [],
} satisfies Config;
