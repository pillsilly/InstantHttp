const { defineConfig, globalIgnores } = require("eslint/config");
const globals = require("globals");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");
const nPlugin = require("eslint-plugin-n");
const promisePlugin = require("eslint-plugin-promise");

module.exports = defineConfig([
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            ecmaVersion: "latest",
            sourceType: "module",
            parser: tsparser,
            parserOptions: {
                project: "./tsconfig.spec.json",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
            import: importPlugin,
            n: nPlugin,
            promise: promisePlugin,
        },
        rules: {
            strict: 1,
            "@typescript-eslint/semi": ["off"],
            "@typescript-eslint/no-var-requires": ["off"],
            "@typescript-eslint/no-floating-promises": ["off"],
            "@typescript-eslint/strict-boolean-expressions": ["off"],
            "@typescript-eslint/explicit-function-return-type": ["off"],
        },
    },
    globalIgnores(["**/*.config.js", "**/.eslintrc.js", "dist/", "coverage/", "node_modules/"]),
]);
