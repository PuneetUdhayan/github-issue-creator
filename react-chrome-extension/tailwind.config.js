/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          gray: {
            50: '#f6f8fa',
            100: '#f1f1f2',
            200: '#e1e4e8',
            300: '#d0d7de',
            400: '#8c959f',
            500: '#656d76',
            600: '#586069',
            700: '#24292e',
            800: '#1f2328',
            900: '#0d1117',
          },
          blue: {
            50: '#f6f8fa',
            100: '#ddf4ff',
            200: '#b6e3ff',
            300: '#80ccff',
            400: '#54aeff',
            500: '#218bff',
            600: '#0969da',
            700: '#0550ae',
            800: '#033d8b',
            900: '#0a3069',
          },
          green: {
            50: '#dafbe1',
            100: '#aceebb',
            200: '#6fdd8b',
            300: '#4ac26b',
            400: '#2ea043',
            500: '#2ea44f',
            600: '#2c974b',
            700: '#1a7f37',
            800: '#116329',
            900: '#144620',
          },
          red: {
            50: '#ffebe9',
            100: '#ffceca',
            200: '#ffaba8',
            300: '#ff8182',
            400: '#fa4549',
            500: '#cf222e',
            600: '#d73a49',
            700: '#a40e26',
            800: '#82071e',
            900: '#660018',
          }
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}

