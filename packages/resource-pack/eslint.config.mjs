import json from "@eslint/json";
import { defineConfig } from "eslint/config";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { commonTsConfig } from "../../eslint.config.mjs";
import tseslint from "typescript-eslint";

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
      ".*/**",           // Any directory starting with dot (.yarn, .vscode, .regolith, etc.)
      ".*",              // Any file starting with dot
      "node_modules/**",
      "**/*.*js",        // Generated JS files
      "filters/**",      // The filters directory
      "build/**",        // Build output
      "*.json",          // Root level JSON files (config.json, package.json, tsconfig.json)
      "*.md",            // Root level markdown files
      "*.mjs",           // Root level mjs files (like this config)
      "*.js",            // Root level js files
    ],
  },

  {
    plugins: {
      json,
    },
  },

  // lint JSON files
  {
    files: ["**/*.json"],
    language: "json/jsonc",
    rules: {
      "json/no-duplicate-keys": "error",
      "json/no-empty-keys": "off",
      "json/no-unnormalized-keys": "error",
      "json/no-unsafe-values": "error",
      "json/sort-keys": "off",
      "json/top-level-interop": "off",
    }
  }
]);
