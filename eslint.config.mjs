import js from '@eslint/js';
import json from "@eslint/json";
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    ignores: [
      ".yarn/**",
      "dist/**",
      "node_modules/**",
    ],
  },

  {
    files: ["**/*.json" ,"**/*.jsonc"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },

  // Stylistic configuration factory (only for JS/TS files)
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    ...stylistic.configs.customize({
      indent: 2,
      quotes: 'single',
      semi: true,
      jsx: true,
      braceStyle: '1tbs',
    }),
  },

  // Global padding rules (only for JS/TS files)
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'any', prev: ['case', 'default'], next: 'break' },
        { blankLine: 'any', prev: 'case', next: 'case' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: 'block', next: '*' },
        { blankLine: 'always', prev: '*', next: 'block' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: ['import'], next: ['const', 'let', 'var'] },
      ],
    },
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      "@typescript-eslint/no-empty-object-type": ["error", {
        "allowInterfaces": 'always',
      }],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      /* Use type predicates or guards instead of as cast. https://www.w3schools.com/typescript/typescript_type_guards.php */
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: ['public-static-field', 'static-field', 'instance-field', 'public-instance-method', 'public-static-field'],
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
      ],
       "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      // @stylistic
      '@stylistic/jsx-curly-brace-presence': ["warn", "always"],
      // eslint
      'arrow-body-style': ['error', 'as-needed'],
      'curly': 'warn',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      'prefer-const': 'warn',
    },
  },
]);

