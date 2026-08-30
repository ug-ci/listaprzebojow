/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      colors: {
        ug: {
          blue: '#0041d2',
          'blue-dark': '#032c73',
          navy: '#00214d',
          sail: '#a1daf8',
          foam: '#e5f5fd',
          white: '#ffffff',
          error: '#EF305E',
          success: '#1BA345',
          warning: '#FEC001',
          info: '#02A2B9',
          gray: {
            100: '#F5F5F5',
            200: '#D9D9D9',
            300: '#E5E7EB',
            400: '#647391',
            500: '#6B6B6B',
            800: '#1E293B',
            900: '#0F172A',
          },
        },
      },
      fontFamily: {
        headings: ['Work Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        'ug-sm': '0px',
        'ug-md': '0px',
        'ug-lg': '0px',
        DEFAULT: '0px',
        full: '0px',
      },
      boxShadow: {
        'ug-sm': '0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'ug-md': '0 4px 14px rgba(3, 44, 115, 0.08), 0 2px 4px rgba(0, 0, 0, 0.03)',
        'ug-lg': '0 10px 25px rgba(3, 44, 115, 0.12), 0 4px 10px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
