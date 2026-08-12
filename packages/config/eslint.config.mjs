import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig([
  ...baseConfig,
  {
    // Emitted by scripts/generate-framework-keys.mjs, quoted by JSON.stringify. Reformatting it
    // to satisfy style rules would mean hand-rolling escapes for prose full of apostrophes; tsc
    // still typechecks it as part of the build.
    ignores: ['src/frameworkGuideKeys.ts'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
]);
