import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    environment: 'node',
    include: ['packages/navigation/src/**/__tests__/**/*.test.ts'],
    setupFiles: ['packages/ui-runtime/src/test-setup.ts'],
    alias: {
      '@bedrock-core/ui/navigation': path.resolve(__dirname, '../../src/navigation.ts'),
      '@minecraft/server': path.resolve(__dirname, '../ui-runtime/src/__mocks__/@minecraft/server.ts'),
      '@minecraft/server-ui': path.resolve(__dirname, '../ui-runtime/src/__mocks__/@minecraft/server-ui.ts'),
    },
  },
});
