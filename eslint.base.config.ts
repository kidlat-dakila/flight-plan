import eslintReact from "@eslint-react/eslint-plugin"
import nx from "@nx/eslint-plugin"
import stylistic from "@stylistic/eslint-plugin"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import tanstackRouter from "@tanstack/eslint-plugin-router"
import { defineConfig } from "eslint/config"
import jsxA11y from "eslint-plugin-jsx-a11y"
import nodePlugin from "eslint-plugin-n"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

const typeScriptFiles = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
const reactFiles = ["**/*.tsx"]
const untypedFiles = ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.config.ts", "**/*.config.mts"]

export default defineConfig(
  {
    ignores: [
      "**/dist",
      "**/out-tsc",
      "**/routeTree.gen.ts",
      "**/vite.config.*.timestamp*",
      "**/vitest.config.*.timestamp*",
    ],
  },
  ...nx.configs["flat/base"],
  {
    files: typeScriptFiles,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/prefer-readonly": "error",
    },
  },
  {
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/semi": ["error", "never"],
      curly: ["error", "multi-line"],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-param-reassign": ["error", { props: true }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: [String.raw`^.*/eslint(\.base)?\.config(\.[cm]?[jt]s)?$`, String.raw`^@flight-plan/ui/.+$`],
          depConstraints: [{ sourceTag: "*", onlyDependOnLibsWithTags: ["*"] }],
        },
      ],
    },
  },
  {
    files: untypedFiles,
    extends: [tseslint.configs.disableTypeChecked],
  },
)

export const react = defineConfig(
  {
    files: reactFiles,
    extends: [
      eslintReact.configs["strict-type-checked"],
      eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"],
      reactHooks.configs.flat["recommended-latest"],
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: { globals: globals.browser },
    rules: { "@eslint-react/rules-of-hooks": "off" },
  },
  {
    files: typeScriptFiles,
    extends: [tanstackQuery.configs["flat/recommended-strict"], tanstackRouter.configs["flat/recommended"]],
  },
)

export const node = defineConfig({
  files: ["src/**/*.ts"],
  extends: [nodePlugin.configs["flat/recommended-module"]],
  languageOptions: { globals: globals.node },
  rules: {
    "n/no-missing-import": "off",
    "n/no-unpublished-import": "off",
    "n/no-extraneous-import": "off",
  },
})
