import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const runtime = (file: string): string =>
  fileURLToPath(new URL(`../ui-runtime/src/${file}`, import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/__tests__/**/*.ts'],
    // The compiler runs the runtime's own phases, so it needs the runtime's own
    // test doubles for the game modules. Pointing at source rather than a build
    // is deliberate: the two move together, and a stale build would hide a break.
    setupFiles: [runtime('test-setup.ts')],
    // Longest specifier first: an alias matches any import it prefixes.
    alias: {
      '@minecraft/server': runtime('__mocks__/@minecraft/server.ts'),
      '@minecraft/server-ui': runtime('__mocks__/@minecraft/server-ui.ts'),
      '@bedrock-core/ui-runtime/jsx-dev-runtime': runtime('jsx/jsx-dev-runtime.ts'),
      '@bedrock-core/ui-runtime/jsx-runtime': runtime('jsx/jsx-runtime.ts'),
      '@bedrock-core/ui-runtime/compile': runtime('compile.ts'),
      '@bedrock-core/ui-runtime': runtime('index.ts'),
    },
  },
});
