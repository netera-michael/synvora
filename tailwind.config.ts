import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
    "./src/styles/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        synvora: {
          primary: "#0A5AFF",
          dark: "#082c6c",
          accent: "#1D9BF0",
          surface: "#F6F6F7", // Updated to matches Polaris bg-surface-secondary
          "surface-active": "#F1F2F3",
          border: "#C9CCCF",
          text: "#202223",
          "text-secondary": "#6D7175",
          "surface-disabled": "#fafbfb",
          "border-hover": "#8C9196"
        }
      }
    }
  },
  plugins: []
};

export default config;
