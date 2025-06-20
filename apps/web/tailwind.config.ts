import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#2563eb',
        bg: '#181a20',
        panel: '#23262f',
        text: '#f3f4f6',
        'text-secondary': '#b3b8c5',
        border: '#313442',
        'accent-light': 'rgba(37, 99, 235, 0.1)'
      },
      borderRadius: {
        'lg': '12px',
      },
      boxShadow: {
        'DEFAULT': '0 4px 24px 0 rgba(0,0,0,0.18)',
        'btn': '0 2px 8px 0 rgba(37,99,235,0.08)',
        'btn-hover': '0 4px 16px 0 rgba(37,99,235,0.18)',
      },
      spacing: {
        '4.5': '1.125rem', // 18px
      }
    },
  },
  plugins: [],
} satisfies Config 