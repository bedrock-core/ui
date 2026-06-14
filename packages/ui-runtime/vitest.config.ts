import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/__tests__/**/*.ts'],
    // Register the built-in native components so pipeline tests (serialize /
    // layout / inherit) resolve writers and transparent types from the registry.
    setupFiles: ['./src/test-setup.ts'],
    alias: {
      '@minecraft/server': new URL('./src/__mocks__/@minecraft/server.ts', import.meta.url).pathname,
      '@minecraft/server-ui': new URL('./src/__mocks__/@minecraft/server-ui.ts', import.meta.url).pathname,
      '@bedrock-core/ui/jsx-runtime': path.resolve(__dirname, './src/jsx/jsx-runtime.ts'),
      '@bedrock-core/ui/jsx-dev-runtime': path.resolve(__dirname, './src/jsx/jsx-dev-runtime.ts'),
    },
  },
});
