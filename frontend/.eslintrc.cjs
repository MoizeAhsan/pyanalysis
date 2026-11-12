module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  ignorePatterns: [
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    '.eslintrc.cjs',
    'src/shared/api/schema.d.ts',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jsx-a11y'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    'no-console': 'error',
    eqeqeq: ['error', 'always'],
    // autoFocus is used once, on the search page's only input, where it is the expected behaviour.
    'jsx-a11y/no-autofocus': 'off',
  },
};
