import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0C0E14",
        surface: "#161B27",
        "surface-2": "#1E2535",
        border: "#2A3347",
        accent: "#3B82F6",
        "accent-hover": "#2563EB",
        muted: "#64748B",
        "text-primary": "#F1F5F9",
        "text-secondary": "#94A3B8",
        "score-high": "#22C55E",
        "score-mid": "#F59E0B",
        "score-low": "#EF4444",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
