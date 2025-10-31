import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/__tests__/**/*.ts'],
    alias: {
      '@minecraft/server': new URL('./src/__mocks__/@minecraft/server.ts', import.meta.url).pathname,
      '@minecraft/server-ui': new URL('./src/__mocks__/@minecraft/server-ui.ts', import.meta.url).pathname,
      '@bedrock-core/ui/jsx-runtime': path.resolve(__dirname, './src/jsx/jsx-runtime.ts'),
      '@bedrock-core/ui/jsx-dev-runtime': path.resolve(__dirname, './src/jsx/jsx-dev-runtime.ts'),
    },
  },
});
