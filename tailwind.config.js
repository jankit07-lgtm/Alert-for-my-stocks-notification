export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Urbanist', 'system-ui', 'sans-serif'] },
      colors: {
        stonks: {
          bg: '#000000', surface: '#151525', surface2: '#212034', surface3: '#0B0B16',
          nav: '#1E1E32', chip: '#3F3F50', segment: '#2B2B3A', divider: '#3B3958',
          field: '#3E3E3E', muted: '#9F9FB1', dim: '#5A5A6B',
          brand: '#139756', brandBorder: '#29513D', loss: '#FF4B4B', gauge: '#4FE682',
          amber: '#FFC21A', info: '#5DBAFF', infoBg: '#455A77', highlight: '#FFD12E', neutral: '#2E2E3C',
        },
      },
      keyframes: {
        drop: { '0%': { transform: 'translateY(-120%)' }, '100%': { transform: 'translateY(0)' } },
        up: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        fade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      },
      animation: { drop: 'drop .35s ease-out', up: 'up .28s ease-out', fade: 'fade .2s ease-out' },
    },
  },
};
