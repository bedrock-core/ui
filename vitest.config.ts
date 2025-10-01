import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const rootDir = dirname(fileURLToPath(new URL('./package.json', import.meta.url)));
const r = (p: string) => resolve(rootDir, p);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/__tests__/**/*.ts'],
    alias: {
      '@minecraft/server': new URL('./src/__mocks__/@minecraft/server.ts', import.meta.url).pathname,
      '@minecraft/server-ui': new URL('./src/__mocks__/@minecraft/server-ui.ts', import.meta.url).pathname,
    },
  },
});
