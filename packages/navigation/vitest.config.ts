import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['../ui-runtime/src/test-setup.ts'],
    alias: {
      '@bedrock-core/ui/navigation': path.resolve(__dirname, '../../src/navigation.ts'),
      '@minecraft/server': path.resolve(__dirname, '../ui-runtime/src/__mocks__/@minecraft/server.ts'),
      '@minecraft/server-ui': path.resolve(__dirname, '../ui-runtime/src/__mocks__/@minecraft/server-ui.ts'),
    },
  },
});
