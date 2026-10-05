import js from "@eslint/js"
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs"
import eslintReact from "@eslint-react/eslint-plugin"
import nx from "@nx/eslint-plugin"
import stylistic from "@stylistic/eslint-plugin"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import tanstackRouter from "@tanstack/eslint-plugin-router"
import vitest from "@vitest/eslint-plugin"
import type { Linter } from "eslint"
import { defineConfig } from "eslint/config"
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript"
import checkFile from "eslint-plugin-check-file"
import functional from "eslint-plugin-functional"
import { importX } from "eslint-plugin-import-x"
import jsxA11y from "eslint-plugin-jsx-a11y"
import nodePlugin from "eslint-plugin-n"
import noComments from "eslint-plugin-no-comments"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

const WORKSPACE_ROOT = import.meta.dirname

const typeScriptFiles = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
const reactFiles = ["**/*.tsx"]
const testFiles = ["**/__tests__/**", "**/*.spec.ts", "**/*.spec.tsx"]
const configFiles = ["**/*.config.ts", "**/*.config.mts"]
const untypedFiles = ["**/*.js", "**/*.mjs", "**/*.cjs", ...configFiles]

const BOOLEAN_PREFIXES = ["is", "has", "can", "should", "was", "will", "did", "are"]
const UPPER_CASE_BOOLEAN_PREFIXES = BOOLEAN_PREFIXES.map((prefix) => `${prefix.toUpperCase()}_`)
const TEST_FILE_PATTERN = String.raw`.*\.spec\.tsx?$`

const namingConvention = [
  { selector: "default", format: ["camelCase"] },
  { selector: "import", format: ["camelCase", "PascalCase"] },
  { selector: "variable", format: ["camelCase"] },
  { selector: "variable", modifiers: ["const", "global"], format: ["camelCase", "UPPER_CASE"] },
  { selector: "variable", types: ["function"], format: ["camelCase", "PascalCase"] },
  { selector: "variable", modifiers: ["const", "global"], types: ["function"], format: ["camelCase", "PascalCase"] },
  { selector: "variable", modifiers: ["const", "global", "exported"], filter: { regex: "^Route$", match: true }, format: ["PascalCase"] },
  { selector: ["variable", "parameter"], types: ["boolean"], format: ["PascalCase"], prefix: BOOLEAN_PREFIXES },
  {
    selector: "variable",
    modifiers: ["const", "global"],
    types: ["boolean"],
    format: ["PascalCase", "UPPER_CASE"],
    prefix: [...BOOLEAN_PREFIXES, ...UPPER_CASE_BOOLEAN_PREFIXES],
  },
  { selector: ["variable", "parameter"], modifiers: ["destructured"], format: null },
  { selector: ["variable", "parameter"], modifiers: ["destructured"], types: ["boolean"], format: null },
  { selector: "parameter", modifiers: ["unused"], format: ["camelCase"], leadingUnderscore: "require" },
  { selector: "function", format: ["camelCase", "PascalCase"] },
  { selector: "typeLike", format: ["PascalCase"] },
  { selector: "interface", format: ["PascalCase"], custom: { regex: "^I[A-Z]", match: false } },
  { selector: "enumMember", format: ["PascalCase", "UPPER_CASE"] },
  { selector: ["objectLiteralProperty", "objectLiteralMethod", "typeProperty", "typeMethod"], format: null },
]

export const PARENT_IMPORT_PATTERN = {
  regex: String.raw`^\.\./`,
  message: "Import from a parent folder through the project's base path, @/, instead of ../.",
}

const importOrder = {
  "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
  "pathGroups": [{ pattern: "@flightplan/**", group: "internal" }],
  "pathGroupsExcludedImportTypes": ["builtin"],
  "alphabetize": { order: "asc", caseInsensitive: true },
  "newlines-between": "never",
}

const ESLINT_CONFIG_IMPORT = String.raw`^.*/eslint(\.base)?\.config(\.[cm]?[jt]s)?$`

export const moduleBoundaries = (allowedImports: readonly string[]) => ({
  enforceBuildableLibDependency: true,
  allow: [ESLINT_CONFIG_IMPORT, ...allowedImports],
  depConstraints: [
    { sourceTag: "platform:browser", onlyDependOnLibsWithTags: ["type:ui"] },
    { sourceTag: "platform:node", onlyDependOnLibsWithTags: ["type:configuration"] },
    { sourceTag: "type:configuration", onlyDependOnLibsWithTags: [] },
    { sourceTag: "type:ui", onlyDependOnLibsWithTags: ["type:ui"] },
    {
      sourceTag: "platform:browser",
      bannedExternalImports: ["fastify", "@fastify/*", "@modelcontextprotocol/*", "@trpc/server"],
    },
    {
      sourceTag: "type:ui",
      bannedExternalImports: ["@trpc/*", "@tanstack/react-query", "@tanstack/react-router"],
    },
    {
      sourceTag: "platform:node",
      bannedExternalImports: ["react", "react-dom", "@tanstack/*", "@base-ui/*", "lucide-react"],
    },
  ],
})

const escalateSeverity = (entry: Linter.RuleEntry): Linter.RuleEntry => {
  if (entry === "warn" || entry === 1) return "error"
  if (Array.isArray(entry) && (entry[0] === "warn" || entry[0] === 1)) return ["error", ...entry.slice(1)]
  return entry
}

const escalateRules = (rules: Partial<Linter.RulesRecord>): Partial<Linter.RulesRecord> =>
  Object.fromEntries(
    Object.entries(rules).map(([name, entry]) => [name, entry === undefined ? entry : escalateSeverity(entry)]),
  )

const escalateWarnings = (configs: readonly Linter.Config[]): Linter.Config[] =>
  configs.map((config) => (config.rules ? { ...config, rules: escalateRules(config.rules) } : config))

export const defineProjectConfig = (...configs: Parameters<typeof defineConfig>): Linter.Config[] =>
  escalateWarnings(defineConfig(...configs))

const baseConfig = defineConfig(
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
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
  },
  {
    extends: [js.configs.recommended],
    rules: {
      "no-console": "error",
      "no-restricted-imports": ["error", { patterns: [PARENT_IMPORT_PATTERN] }],
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Read the environment once in apps/backend/src/main.ts and pass config in as data.",
        },
      ],
      "no-await-in-loop": "error",
      "no-promise-executor-return": "error",
      "no-template-curly-in-string": "error",
      "no-self-compare": "error",
      "no-unmodified-loop-condition": "error",
      "no-unreachable-loop": "error",
      "no-constructor-return": "error",
      "no-implicit-coercion": "error",
      "no-else-return": ["error", { allowElseIf: false }],
      "no-lonely-if": "error",
      "no-useless-return": "error",
      "no-useless-concat": "error",
      "no-useless-computed-key": "error",
      "no-useless-rename": "error",
      "no-unneeded-ternary": "error",
      "no-nested-ternary": "error",
      "no-multi-assign": "error",
      "no-return-assign": "error",
      "no-sequences": "error",
      "no-eval": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-object-constructor": "error",
      "no-extend-native": "error",
      "no-caller": "error",
      "no-proto": "error",
      "no-labels": "error",
      "no-lone-blocks": "error",
      "no-new": "error",
      "no-param-reassign": ["error", { props: true }],
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "prefer-arrow-callback": "error",
      "prefer-object-spread": "error",
      "prefer-object-has-own": "error",
      "prefer-exponentiation-operator": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "default-case-last": "error",
      "grouped-accessor-pairs": "error",
      "symbol-description": "error",
      "radix": "error",
      "yoda": "error",
      "curly": ["error", "multi-line"],
      "eqeqeq": ["error", "always", { null: "ignore" }],
    },
  },
  {
    files: typeScriptFiles,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: WORKSPACE_ROOT,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
      ],
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-loop-func": "error",
      "@typescript-eslint/default-param-last": "error",
      "@typescript-eslint/method-signature-style": "error",
      "@typescript-eslint/no-useless-empty-export": "error",
      "@typescript-eslint/prefer-enum-initializers": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/no-unnecessary-qualifier": "error",
      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          ignoreClassFieldInitialValues: true,
        },
      ],
      "@typescript-eslint/naming-convention": ["error", ...namingConvention],
    },
  },
  stylistic.configs.customize({
    indent: 2,
    quotes: "double",
    semi: false,
    commaDangle: "always-multiline",
    braceStyle: "1tbs",
    arrowParens: true,
    quoteProps: "consistent-as-needed",
    jsx: true,
  }),
  comments.recommended,
  {
    plugins: { "no-comments": noComments },
    rules: {
      "no-comments/disallowComments": ["error", { allow: ["eslint", "global", "@ts-expect-error"] }],
      "@eslint-community/eslint-comments/no-use": ["error", { allow: ["eslint-disable-next-line"] }],
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
  {
    plugins: { functional },
    rules: {
      "functional/immutable-data": ["error", { ignoreClasses: "fieldsOnly", ignoreAccessorPattern: ["**.current", "process.exitCode"] }],
      "functional/no-let": ["error", { allowInForLoopInit: true }],
    },
  },
  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: [`${WORKSPACE_ROOT}/apps/*/tsconfig.*.json`, `${WORKSPACE_ROOT}/packages/*/tsconfig.*.json`],
        }),
      ],
    },
    rules: {
      "import-x/no-cycle": "error",
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": ["error", { noUselessIndex: true }],
      "import-x/no-duplicates": ["error", { "prefer-inline": true }],
      "import-x/no-mutable-exports": "error",
      "import-x/no-relative-packages": "error",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/order": ["error", importOrder],
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          packageDir: [WORKSPACE_ROOT, `${WORKSPACE_ROOT}/packages/ui`],
          devDependencies: [...testFiles, ...configFiles],
        },
      ],
    },
  },
  {
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.{ts,tsx,mts,cts}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-match-with-fex": ["error", { "*.spec.{ts,tsx}": "**/__tests__/" }],
    },
  },
  {
    rules: {
      "@nx/enforce-module-boundaries": ["error", moduleBoundaries([])],
    },
  },
  {
    files: ["**/eslint.config.ts"],
    rules: {
      "import-x/no-relative-packages": "off",
      "no-restricted-imports": "off",
    },
  },
  {
    files: testFiles,
    extends: [vitest.configs.recommended],
    rules: {
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/consistent-test-it": ["error", { fn: "it", withinDescribe: "it" }],
      "vitest/consistent-test-filename": ["error", { pattern: TEST_FILE_PATTERN }],
      "vitest/no-conditional-in-test": "error",
      "vitest/no-conditional-expect": "error",
      "vitest/no-duplicate-hooks": "error",
      "vitest/prefer-hooks-in-order": "error",
      "vitest/prefer-hooks-on-top": "error",
      "vitest/prefer-to-be": "error",
      "vitest/prefer-strict-equal": "error",
      "vitest/require-to-throw-message": "error",
      "@typescript-eslint/no-magic-numbers": "off",
    },
  },
  {
    files: untypedFiles,
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },
)

export default escalateWarnings(baseConfig)

export const react = escalateWarnings(
  defineConfig(
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
  ),
)

export const node = escalateWarnings(
  defineConfig({
    files: ["src/**/*.ts"],
    extends: [nodePlugin.configs["flat/recommended-module"]],
    languageOptions: { globals: globals.node },
    rules: {
      "n/no-missing-import": "off",
      "n/no-unpublished-import": "off",
      "n/no-extraneous-import": "off",
      "n/no-sync": "error",
      "n/prefer-node-protocol": "error",
      "n/prefer-promises/fs": "error",
      "n/prefer-promises/dns": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [PARENT_IMPORT_PATTERN],
          paths: [
            {
              name: "@fastify/autoload",
              message: "Register every plugin explicitly in buildServer; autoload breaks once esbuild bundles the backend.",
            },
            {
              name: "node:child_process",
              importNames: ["exec", "execSync"],
              message: "Run binaries with execFile or spawn and an argument array, never a shell string.",
            },
          ],
        },
      ],
    },
  }),
)
