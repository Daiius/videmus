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
        primary: colors.slate[600],
        'primary-hover': colors.slate[500],
        'primary-highlight': colors.slate[400],
        danger: colors.red[400],
        success: colors.green[400],
        active: colors.blue[500],
      },
    },
  },
  plugins: [],
};
export default config;
