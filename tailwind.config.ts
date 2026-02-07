import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Agent colors
        agent: {
          pm: '#FACC15',
          sa: '#FB923C',
          le: '#22D3EE',
          sr: '#F87171',
          ui: '#60A5FA',
          mce: '#4ADE80'
        },
        // Status column backgrounds (light mode)
        status: {
          backlog: '#F9FAFB',
          design: '#EFF6FF',
          progress: '#FEFCE8',
          review: '#FAF5FF',
          done: '#F0FDF4',
          blocked: '#FEF2F2'
        }
      },
      // Safe area insets for iPhone notch/home indicator
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)'
      }
    }
  },
  plugins: []
} satisfies Config;
