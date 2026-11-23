import { defineConfig } from 'vitest/config';
// Component tests (*.test.tsx) compile with the same Solid plugin as the build and run in jsdom.
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid({ include: /\.tsx$/ })],
  resolve: { conditions: ['browser', 'development'] },
  test: { environment: 'node', include: ['test/**/*.test.ts', 'test/**/*.test.tsx'] },
});
