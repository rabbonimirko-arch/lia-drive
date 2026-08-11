import type { Config } from 'tailwindcss';

export default {
  content: ['./public/**/*.html', './src/**/*.{ts,html}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        panel: '#0d1b2e',
        mist: '#a9bad0',
        cyan: '#4de3ff',
        lime: '#b7ff5a',
        amber: '#ffcc66',
        coral: '#ff7a7a',
      },
      boxShadow: { glow: '0 0 40px rgba(77, 227, 255, 0.16)' },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
