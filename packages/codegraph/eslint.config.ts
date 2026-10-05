import baseConfig, { defineProjectConfig, node } from "../../eslint.base.config"

const SYNCHRONOUS_FILE_SYSTEM_SPECS = ["src/core/__tests__/virtual-fs.spec.ts"]
const ENGINE_FOLDER = "./src/core"
const SOURCE_FOLDER = "./src"
const CASE_REPOSITORIES = ["cases/*/repo/**"]
const TEST_SETUP_FILES = ["test-setup/**/*.ts"]
const TEST_ONLY_FOLDERS = ["./cases", "./test-setup"]
const CASE_TESTS = ["cases/*/*.integration.test.ts"]
const CASE_ASSERTIONS = ["expect", "expectCaseSnapshot"]

export default defineProjectConfig(
  { ignores: CASE_REPOSITORIES },
  baseConfig,
  node,
  {
    files: CASE_TESTS,
    rules: {
      "vitest/expect-expect": ["error", { assertFunctionNames: CASE_ASSERTIONS }],
    },
  },
  {
    files: TEST_SETUP_FILES,
    rules: {
      "import-x/no-extraneous-dependencies": "off",
    },
  },
  {
    files: SYNCHRONOUS_FILE_SYSTEM_SPECS,
    rules: {
      "n/no-sync": "off",
      "n/prefer-promises/fs": "off",
    },
  },
  {
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: ENGINE_FOLDER,
              from: SOURCE_FOLDER,
              except: ["./core"],
              message: "The engine in core/ stands alone. Import it from the builders, never the other way round.",
            },
            ...TEST_ONLY_FOLDERS.map((folder) => ({
              target: SOURCE_FOLDER,
              from: folder,
              message: "The cases and their setup are tests. The package's source never imports them.",
            })),
          ],
        },
      ],
    },
  },
)
