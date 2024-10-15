import bschlenk, { globals } from '@bschlenk/eslint-config'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['**/dist/', '*.config.js', '*.config.ts'] },
  { files: ['**/*.ts', '**/*.tsx'] },

  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },

  ...bschlenk.configs.typescript,
  ...bschlenk.configs.react,

  {
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
