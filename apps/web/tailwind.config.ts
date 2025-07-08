import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#2563eb',
        'accent-light': 'rgba(37, 99, 235, 0.08)',
        bg: '#f7f8fa',
        panel: '#ffffff',
        text: '#22223b',
        'text-secondary': '#6c6f80',
        border: '#e0e3eb',
        error: '#ff4d4f',
        success: '#1ecb7a',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
      },
      boxShadow: {
        DEFAULT: '0 4px 24px 0 rgba(0,0,0,0.18)',
        btn: '0 2px 8px 0 rgba(37,99,235,0.08)',
        'btn-hover': '0 4px 16px 0 rgba(37,99,235,0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem', // 18px
      },
    },
  },
  plugins: [],
} satisfies Config 