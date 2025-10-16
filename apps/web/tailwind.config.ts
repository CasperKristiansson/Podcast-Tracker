import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx}",
    "../shared/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#010101",
          primary: "#5f43b2",
          surface: "#3a3153",
          text: "#fefdfd",
          muted: "#b1aebb",
          accent: "#6f5ac6",
        },
      },
      backgroundColor: {
        base: "#010101",
        surface: "#3a3153",
      },
      textColor: {
        base: "#fefdfd",
        muted: "#b1aebb",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(20px, -35px, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-25px, 30px, 0) scale(0.96)" },
          "100%": { transform: "translate3d(0, 0, 0) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        blob: "blob 24s ease-in-out infinite",
        float: "float 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
