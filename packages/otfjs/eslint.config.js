import bschlenk, { globals } from '@bschlenk/eslint-config'

export default [
  { ignores: ['**/dist/'] },
  { files: ['**/*.js', '**/*.ts'] },

  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },

  ...bschlenk.configs.typescript,
]
