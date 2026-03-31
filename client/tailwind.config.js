/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#ea580c",
        "on-primary": "#ffffff",
        "primary-container": "#ffedd5",
        "on-primary-container": "#7c2d12",
        surface: "#fafaf9",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fafaf9",
        "surface-container": "#f5f5f4",
        "surface-container-high": "#e7e5e4",
        "on-surface": "#1c1917",
        "on-surface-variant": "#57534e",
        outline: "#d6d3d1",
        "outline-variant": "#e7e5e4",
        error: "#b91c1c",
        "error-container": "#fee2e2",
        background: "#fafaf9",
        "on-background": "#1c1917",
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        headline: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        body: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        label: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      boxShadow: {
        sunset: "0 10px 40px -10px rgba(249, 115, 22, 0.25)",
        drawer: "-10px 0 30px rgba(0, 0, 0, 0.05)",
      },
      keyframes: {
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "loading-dot": {
          "0%, 80%, 100%": { opacity: "0.35", transform: "scale(0.85)" },
          "40%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "page-enter": "page-enter 0.45s ease-out both",
        "loading-dot": "loading-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
