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
          surface: "#f6f8fb"
        }
      }
    }
  },
  plugins: []
};

export default config;
