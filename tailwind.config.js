/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0A7B6E',
          'primary-light': '#E6F5F3',
          'primary-dark': '#065C52',
          accent: '#F0A830',
          'accent-light': '#FEF3DC',
        },
        surface: {
          base: '#F9F7F4',
          DEFAULT: '#FFFFFF',
          alt: '#F4F2EF',
        },
        border: {
          DEFAULT: '#E8E5E0',
          subtle: '#F0EDE8',
          focus: '#0A7B6E',
        },
        text: {
          primary: '#1A1F2E',
          secondary: '#5C6270',
          tertiary: '#9EA3AD',
          brand: '#0A7B6E',
        },
        status: {
          alert: '#DC2626',
          'alert-bg': '#FEF2F2',
          warning: '#D97706',
          'warning-bg': '#FFFBEB',
          ok: '#16A34A',
          'ok-bg': '#F0FDF4',
          info: '#2563EB',
          'info-bg': '#EFF6FF',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(26,31,46,0.06), 0 1px 2px rgba(26,31,46,0.04)',
        md: '0 4px 12px rgba(26,31,46,0.08), 0 2px 4px rgba(26,31,46,0.04)',
        lg: '0 10px 30px rgba(26,31,46,0.10), 0 4px 8px rgba(26,31,46,0.06)',
        brand: '0 4px 14px rgba(10,123,110,0.20)',
      },
    },
  },
  plugins: [],
}
