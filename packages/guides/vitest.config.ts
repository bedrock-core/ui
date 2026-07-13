import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    alias: {
      // Reuse ui-runtime's game-module mocks — the runtime imports them at
      // module scope, but nothing here exercises engine behavior.
      '@minecraft/server': path.resolve(__dirname, '../ui-runtime/src/__mocks__/@minecraft/server.ts'),
      '@minecraft/server-ui': path.resolve(__dirname, '../ui-runtime/src/__mocks__/@minecraft/server-ui.ts'),
    },
  },
});
