/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Coliseu Dash (tema branco corporativo)
        bg: {
          primary: '#FFFFFF',
          secondary: '#F8F9FA',
          tertiary: '#F0F2F5',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#666666',
          muted: '#9CA3AF',
        },
        brand: {
          DEFAULT: '#0066CC',
          50: '#E6F0FA',
          100: '#CCE0F5',
          500: '#0066CC',
          600: '#0052A3',
          700: '#003D7A',
        },
        success: '#28A745',
        warning: '#FFC107',
        danger: '#DC3545',
        neutral: '#6C757D',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08)',
      },
      borderColor: {
        DEFAULT: '#E0E0E0',
      },
    },
  },
  plugins: [],
}
