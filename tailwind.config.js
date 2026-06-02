// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1', // 科技蓝紫 (主色调)
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        background: '#F9FAFB', // 极浅的高级灰底色
        surface: '#FFFFFF',    // 卡片背景色
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'float': '0 10px 30px -4px rgba(99, 102, 241, 0.15)',
      },
      borderRadius: {
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
      }
    },
  },
  plugins: [],
}