module.exports = {
  rules: {
    semi: ['error', 'never'],
    indent: ['error', 2, { SwitchCase: 1 }],
    quotes: ['error', 'single', { allowTemplateLiterals: true }],
    curly: ['error', 'multi-line'],
    'object-curly-spacing': ['error', 'always'],
    'arrow-parens': ['error', 'always'],
    'capitalized-comments': 'off',
    // 'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 0 }],
    // 'padding-line-between-statements': ['error', { blankLine: 'any', prev: '*', next: '*' }],
    // 'no-unused-vars': ['warn', { caughtErrors: 'none', varsIgnorePattern: '^error$', args: 'none' }],
    // 'require-await': 'error',
    // 'no-return-await': 'off',
    'unicorn/filename-case': [
      'error',
      {
        cases: {
          camelCase: true,
          pascalCase: true,
        },
        ignore: ['\\d*-[\\w\\d]*.js'],
      },
    ],
    // 'unicorn/prefer-optional-catch-binding': 'off',
    // 'unicorn/no-process-exit': 'off',
  },
}
