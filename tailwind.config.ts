import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calming, muted palette — sage, slate, warm sand
        calm: {
          50: "#f5f7f4",
          100: "#e8ede6",
          200: "#d0dccb",
          300: "#adc2a4",
          400: "#84a078",
          500: "#628057",
          600: "#4d6544",
          700: "#3d5036",
          800: "#33412e",
          900: "#2b3727",
        },
        sand: {
          50: "#faf8f5",
          100: "#f2ede5",
          200: "#e5d9c8",
          300: "#d4bfa3",
          400: "#c09e7a",
          500: "#b2875e",
          600: "#9e7150",
          700: "#845c44",
          800: "#6c4c3b",
          900: "#583f32",
        },
        slate: {
          // Using Tailwind's existing slate — good enough
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "typing-dot": "typingDot 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        typingDot: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
