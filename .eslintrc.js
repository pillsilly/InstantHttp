module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'standard-with-typescript',
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
    {
      files: [
        '**/*.ts',
        '**/*.ts'
      ],
      parserOptions: {
        project: './tsconfig.spec.json',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  
  rules: {
    strict: 1,
    '@typescript-eslint/semi': ['off'],
    '@typescript-eslint/no-var-requires': ['off'],
    '@typescript-eslint/no-floating-promises':['off'],
    '@typescript-eslint/strict-boolean-expressions': ['off'],
    '@typescript-eslint/explicit-function-return-type': ['off'],
  },
  ignorePatterns: [
    "*.config.js",
    ".eslintrc.js"
  ]
};
