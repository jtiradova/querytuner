/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fusion / SingleStore neutral scale
        neutral: {
          1: '#ffffff',
          2: '#fafafa',
          3: '#f5f5f5',
          4: '#ededed',
          5: '#e6e6e6',
          6: '#d6d6d6',
          7: '#bfbfbf',
          8: '#999999',
          9: '#808080',
          10: '#666666',
          11: '#4c4c4c',
          12: '#191919',
        },
        // SingleStore purple / brand scale
        brand: {
          1: '#fdfaff',
          2: '#faf4ff',
          3: '#f7edff',
          4: '#f0dcff',
          5: '#e5c2ff',
          6: '#d39fff',
          7: '#bd70ff',
          8: '#a33ef4',
          9: '#820ddf',
          10: '#7209c5',
          11: '#5b0a9a',
          12: '#3d0a66',
        },
        success: {
          1: '#f5fbf3',
          6: '#55c44a',
          9: '#168104',
          10: '#0e5e02',
        },
        warning: {
          1: '#fffbeb',
          6: '#f5bc3d',
          9: '#e0a206',
          10: '#b07e04',
        },
        danger: {
          1: '#fff5f5',
          6: '#ef4444',
          9: '#d32f2f',
        },
        // Semantic text
        'text-primary': '#191919',
        'text-secondary': '#666666',
        'text-mid': '#4c4c4c',
        'text-low': '#666666',
        'text-inverse': '#ffffff',
        'text-brand': '#820ddf',
        // Surfaces & borders
        'surface-1': '#ffffff',
        'surface-2': '#fafafa',
        'surface-selected': '#f7edff',
        'border-default': '#d6d6d6',
        'border-subtle': '#ededed',
        'border-hover': '#bfbfbf',
        'border-brand': '#a33ef4',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['Lato', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['Inconsolata', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        icon: ['"Font Awesome 6 Free"', '"Font Awesome 6 Pro"', 'sans-serif'],
      },
      fontSize: {
        // 14 = base body, 12 = small, 10 = x-small, 16 = h3
        '2xs': ['10px', { lineHeight: '1.5', letterSpacing: '0.2px' }],
        xs: ['12px', { lineHeight: '1.5', letterSpacing: '0.24px' }],
        sm: ['13px', { lineHeight: '1.4', letterSpacing: '0' }],
        base: ['14px', { lineHeight: '1.5', letterSpacing: '0.28px' }],
        md: ['16px', { lineHeight: '1.5', letterSpacing: '0' }],
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        'tab-active': 'inset 0px 2px 0px 0px #820ddf, inset -1px 0px 0px 0px #e6e5ea, inset 1px 0px 0px 0px #e6e5ea',
        popover: '0px 4px 12px rgba(25, 25, 25, 0.08), 0px 0px 0px 1px rgba(25, 25, 25, 0.08)',
      },
      spacing: {
        '4.5': '18px',
      },
    },
  },
  plugins: [],
};
