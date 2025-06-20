import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#2563eb",
        bg: "#181a20",
        panel: "#23262f",
        text: "#f3f4f6",
        border: "#313442",
      },
    },
  },
} satisfies Config; 