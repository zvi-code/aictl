import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import solid from 'eslint-plugin-solid'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['**/dist/', '**/build/', '**/docs/', '**/logs/']),
  {
    files: ['**/*.js', 'test/{e2e,replay}/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', {
        args: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: { ...globals.mocha, vi: 'readonly', expect: 'readonly' },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended, solid.configs['flat/typescript']],
    rules: { 'solid/reactivity': 'error' },
  },
])
