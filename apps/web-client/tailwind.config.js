/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Sora', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          primary: '#321E48',
          secondary: '#43637E',
          accent: '#65DCD5',
          'accent-deep': '#1E8E86',
          highlight: '#D9FFF4',
        },
        ink: 'rgb(var(--vc-page) / <alpha-value>)',
        content: 'rgb(var(--vc-content) / <alpha-value>)',
        mist: 'rgb(var(--vc-muted) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--vc-page) / <alpha-value>)',
          card: 'rgb(var(--vc-card) / <alpha-value>)',
          elevated: 'rgb(var(--vc-elevated) / <alpha-value>)',
          border: 'var(--vc-border)',
          nav: '#2A1A3D',
        },
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(101, 220, 213, 0.25)',
        card: '0 4px 24px -4px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.45s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
