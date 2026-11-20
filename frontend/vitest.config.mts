import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/lib/**', 'src/components/**', 'src/app/**/checkout/**', 'src/app/**/quality/**', 'src/app/**/account/**'],
      exclude: ['src/lib/types.ts', '**/*.test.*'],
      thresholds: { lines: 85, functions: 75, branches: 80, statements: 85 },
    },
  },
});
