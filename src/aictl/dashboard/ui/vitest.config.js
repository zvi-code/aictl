import { defineConfig } from 'vitest/config';
import { dashboardFrameworks } from './vite.config.js';

export default defineConfig({
  plugins: dashboardFrameworks(),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'legacy',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./test/setup.js', './test/lazy_chunks.js'],
          include: ['test/**/*.test.{js,tsx}'],
          // Keep Preact's renderer and hooks on the same module instance in jsdom.
          server: { deps: { inline: ['preact', '@testing-library/preact', 'htm', 'lucide-preact'] } },
        },
      },
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
    ],
  },
});
