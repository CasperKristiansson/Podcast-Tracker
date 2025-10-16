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
        rise: {
          "0%": {
            opacity: "0",
            transform: "translateY(40px) scale(0.95)",
          },
          "55%": {
            opacity: "1",
            transform: "translateY(-6px) scale(1.03)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
        drift: {
          "0%": { transform: "translate3d(-10px, 20px, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(12px, -16px, 0) rotate(6deg)" },
          "100%": { transform: "translate3d(-10px, 20px, 0) rotate(0deg)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(16px) rotate(0deg)" },
          "50%": { transform: "rotate(180deg) translateX(16px) rotate(-180deg)" },
          "100%": {
            transform: "rotate(360deg) translateX(16px) rotate(-360deg)",
          },
        },
        pulseRing: {
          "0%": { transform: "scale(0.85)", opacity: "0.45" },
          "70%": { transform: "scale(1.25)", opacity: "0.1" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
      },
      animation: {
        blob: "blob 24s ease-in-out infinite",
        float: "float 8s ease-in-out infinite",
        rise: "rise 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
        drift: "drift 26s ease-in-out infinite",
        orbit: "orbit 18s linear infinite",
        pulseRing: "pulseRing 3.6s ease-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
