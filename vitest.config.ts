import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@/lib': path.resolve(__dirname, './packages/shared-lib/src/lib'),
      '@/types': path.resolve(__dirname, './packages/shared-lib/src/types'),
      '@volo/shared-types': path.resolve(__dirname, './packages/shared-types/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
    },
    include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],
  },
});
