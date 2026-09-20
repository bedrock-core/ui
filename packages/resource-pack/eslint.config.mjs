import minecraftLinting from "eslint-plugin-minecraft-linting";
import { defineConfig } from "eslint/config";
import baseConfig from '../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,

  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/*.d.ts"],
    plugins: {
      "@minecraft": minecraftLinting
    },
    rules: {
      "@minecraft/avoid-unnecessary-command": "error",
    }
  },

  {
    ignores: [
      ".*/**",           // Any directory starting with dot (.yarn, .vscode, .regolith, etc.)
      ".*",              // Any file starting with dot
      "node_modules/**",
      "**/*.generated.*", // Filter-generated files (i18n bundle + declarations)
      "**/*.*js",        // Generated JS files
      "filters/**",      // The filters directory
      "build/**",        // Build output
      "*.json",          // Root level JSON files (config.json, package.json, tsconfig.json)
      "*.md",            // Root level markdown files
      "*.mjs",           // Root level mjs files (like this config)
      "*.js",            // Root level js files
    ],
  }
]);
