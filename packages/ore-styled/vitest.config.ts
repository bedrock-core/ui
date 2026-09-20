import { defineConfig } from 'vitest/config';

/**
 * The Minecraft modules are declarations with no runtime, so a test that
 * imports anything from `@bedrock-core/ui-runtime` reaches for them and finds
 * nothing. The runtime's own mocks stand in, which is the same pair its tests
 * run against.
 */
const mocks = new URL('../ui-runtime/src/__mocks__/@minecraft/', import.meta.url).pathname;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/__tests__/**/*.ts'],
    alias: {
      '@minecraft/server': `${mocks}server.ts`,
      '@minecraft/server-ui': `${mocks}server-ui.ts`,
    },
  },
});
