module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['import', 'react', 'react-refresh', 'simple-import-sort'],
  settings: { react: { version: 'detect' } },
  rules: {
    eqeqeq: ['error', 'smart'],
    // handled by prettier
    'no-extra-semi': 'off',

    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',

    'react/jsx-curly-brace-presence': [
      'error',
      { propElementValues: 'always' },
    ],
    'react/self-closing-comp': ['error', { component: true, html: true }],

    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    'simple-import-sort/exports': 'error',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // Side effect imports.
          ['^\\u0000'],
          // Node.js builtins prefixed with `node:`.
          ['^node:'],
          // Packages (react first).
          // Things that start with a letter (or digit or underscore), or `@` followed by a letter.
          ['^react$', '^react-dom$', '^@?\\w'],
          // Absolute imports and other imports such as Vue-style `@/foo`.
          // Anything not matched in another group.
          ['^'],
          // Relative imports.
          // Anything that starts with a dot.
          ['^\\.'],
          // Css imports
          ['\\.css$', '\\.module\\.css$'],
        ],
      },
    ],

    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        // prefer omitting the binding instead
        // caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        // prefer an empty space between commas
        ignoreRestSiblings: false,
      },
    ],
  },
}
