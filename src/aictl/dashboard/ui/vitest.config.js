import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js', './test/lazy_chunks.js'],
    include: ['test/**/*.test.js'],
  },
});
