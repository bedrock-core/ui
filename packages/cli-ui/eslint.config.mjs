import { defineConfig } from "eslint/config";
import { dirname } from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";
import { commonTsConfig } from "../../eslint.config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig([
  {
    ...commonTsConfig,

    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: ["tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
  },

  {
    ignores: [
      ".*/**",           // Any directory starting with dot
      ".*",              // Any file starting with dot
      "node_modules/**",
      "build/**",
      "dist/**",
      "templates/**",    // Ignore template files
    ],
  },
]);
