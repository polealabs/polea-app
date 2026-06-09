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
        sans: ["var(--font-space-grotesk)", "sans-serif"],
        serif: ["var(--font-fraunces)", "serif"],
      },
      colors: {
        forest: "#1E3A2F",
        terra: "#4A90D9",
        "terra-light": "#5C9FE0",
        "terra-pale": "#E8F2FB",
        gold: "#D4A853",
        cream: "#F4F1EA",
        ink: "#16140F",
        "ink-mid": "#4A463C",
        "ink-soft": "#4A463C",
        "ink-faint": "#C4B8B0",
        "border-warm": "#DCD7CA",
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
