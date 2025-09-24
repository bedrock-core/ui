import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const rootDir = dirname(fileURLToPath(new URL('./package.json', import.meta.url)));
const r = (p: string) => resolve(rootDir, p);

export default defineConfig({
  resolve: {
    alias: {
      '@minecraft/server': r('test/mocks/minecraft-server.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/__tests__/**/*.ts'],
  },
});
