export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "tertiary-container": "#00e3fd",
        "on-surface-variant": "#acaab1",
        "surface-bright": "#2b2b33",
        "inverse-surface": "#fbf8ff",
        "surface": "#000000",
        "surface-container-lowest": "#000000",
        "surface-variant": "#121214",
        "outline-variant": "#2a2a2d",
        "surface-container-high": "#18181b",
        "primary-fixed": "var(--primary)",
        "surface-container": "#0a0a0b",
        "outline": "#444447",
        "on-surface": "#f6f2fa",
        "on-tertiary": "#005762",
        "surface-dim": "#000000",
        "primary-container": "var(--primary)",
        "secondary-container": "#be0036",
        "surface-tint": "var(--primary-bg)",
        "primary-dim": "var(--primary)",
        "on-background": "#f6f2fa",
        "surface-container-highest": "#1c1c1f",
        "background": "#000000",
        "surface-container-low": "#08080a",
        "primary": "var(--primary)",
        "secondary": "#ff6f7c",
        "tertiary": "#81ecff",
        "error": "#ff7351"
      },
      fontFamily: {
        "headline": ["Space Grotesk", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      },
      borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"}
    },
  },
  plugins: [],
}
