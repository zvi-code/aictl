import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import solid from 'eslint-plugin-solid'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['**/dist/', '**/build/', '**/docs/', '**/logs/']),
  {
    files: ['**/*.js', 'test/{e2e,replay}/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022, ...globals.node },
    },
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
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended, solid.configs['flat/typescript']],
    rules: { 'solid/reactivity': 'error' },
  },
])
