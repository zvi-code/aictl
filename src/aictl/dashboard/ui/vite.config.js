import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  root: '.',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Only reached through lazy tabs; 450 kB of it is expected and async.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/echarts/') || id.includes('/zrender/')) return 'echarts';
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
  },
})
