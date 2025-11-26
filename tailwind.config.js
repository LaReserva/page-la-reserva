/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'; // Importación corregida
import forms from '@tailwindcss/forms';           // Importación corregida
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
      },
    },
    extend: {
      colors: {
        // Colores de La Reserva
        primary: {
          50: '#FEF9E7',
          100: '#FDF3D0',
          200: '#FAE7A1',
          300: '#F7DB72',
          400: '#F4CF43',
          500: '#D4AF37', // Dorado principal
          600: '#B8941F',
          700: '#8A6F17',
          800: '#5C4A0F',
          900: '#2E2508',
        },
        secondary: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#B3B3B3',
          400: '#999999',
          500: '#2D2D2D',
          600: '#1A1A1A', // Negro principal
          700: '#0D0D0D',
          800: '#000000',
          900: '#000000',
        },
        accent: {
          DEFAULT: '#F59E0B',
          50: '#FEF3E2',
          100: '#FDE8C5',
          200: '#FBD18B',
          300: '#F9BA51',
          400: '#F7A317',
          500: '#F59E0B',
          600: '#C47E09',
          700: '#935F07',
          800: '#623F04',
          900: '#312002',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['4.5rem', { lineHeight: '1.2', letterSpacing: '0.08em' }],
        'display': ['3rem', { lineHeight: '1.2', letterSpacing: '0.06em' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    typography, // Uso de la variable importada
    forms,      // Uso de la variable importada
  ],
};