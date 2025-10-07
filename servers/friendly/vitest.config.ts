import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/tests/**',
        '**/types/**'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@controllers': path.resolve(__dirname, './src/controllers'),
      '@services': path.resolve(__dirname, './src/services'),
      '@middlewares': path.resolve(__dirname, './src/middlewares'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  }
});
