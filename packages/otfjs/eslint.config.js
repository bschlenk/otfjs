import bschlenk, { globals } from '@bschlenk/eslint-config'

export default [
  { ignores: ['**/dist/', 'eslint.config.js'] },
  { files: ['**/*.ts'] },

  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },

  ...bschlenk.configs.typescript,

  {
    rules: {
      'unicorn/filename-case': [
        'error',
        { case: 'kebabCase', ignore: [/^__tests__$/] },
      ],
    },
  },
]
