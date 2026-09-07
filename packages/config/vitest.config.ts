import path from 'path';
import { defineConfig } from 'vitest/config';
import { desugarJsxConditionals } from '../../../regolith-filters/ui-compile/lib/sugar.ts';

export default defineConfig({
  plugins: [
    {
      // The conditional sugar the build applies to every screen module, so a
      // test renders the same tree the compile bakes and the runtime walks.
      name: 'jsx-conditional-sugar',
      enforce: 'pre',
      transform(code, id) {
        return id.endsWith('.screen.tsx') ? { code: desugarJsxConditionals(code, id), map: null } : null;
      },
    },
  ],
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
