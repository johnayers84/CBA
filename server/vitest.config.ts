import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    setupFiles: ['./test/setup/vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run test files sequentially to avoid database schema conflicts
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
});
