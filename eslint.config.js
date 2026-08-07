const js = require('@eslint/js');
const eslintConfigPrettier = require('eslint-config-prettier');
const playwright = require('eslint-plugin-playwright');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      'playwright/.cache/**',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  eslintConfigPrettier,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['tests/**/*.ts', 'playwright.config.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      'playwright/no-wait-for-timeout': 'warn',
    },
  },
);
