import type { Config } from "tailwindcss";
import colors from 'tailwindcss/colors';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: colors.slate[900],
        foreground: colors.white,
        header: colors.slate[950],
        panel: colors.slate[800],
        primary: colors.slate[700],
        'primary-hover': colors.slate[600],
        'primary-highlight': colors.slate[400],
      },
    },
  },
  plugins: [],
};
export default config;
