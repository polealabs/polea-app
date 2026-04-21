import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        serif: ["var(--font-fraunces)", "serif"],
      },
      colors: {
        forest: "#1E3A2F",
        terra: "#C4622D",
        "terra-light": "#E8845A",
        "terra-pale": "#F9EDE5",
        gold: "#D4A853",
        cream: "#FAF6F0",
        ink: "#1A1510",
        "ink-mid": "#4A3F35",
        "ink-soft": "#8A7D72",
        "ink-faint": "#C4B8B0",
        "border-warm": "#EDE5DC",
        "red-alert": "#C44040",
        "red-pale": "#FDEAEA",
        green: "#3A7D5A",
        "green-pale": "#E8F5EE",
        "forest-light": "#3D6B5A",
        "gold-pale": "#FBF3E0",
      },
    },
  },
  plugins: [],
};

export default config;
