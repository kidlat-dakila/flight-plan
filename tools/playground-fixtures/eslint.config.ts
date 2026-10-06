import baseConfig, { defineProjectConfig, node } from "../../eslint.base.config"

const SOURCE_FOLDER = "./src"
const TEST_CASES = ["test-cases/**"]
const TEST_SETUP_FILES = ["test-setup/**/*.ts"]
const TEST_ONLY_FOLDERS = ["./test-cases", "./test-setup"]

export default defineProjectConfig(
  { ignores: TEST_CASES },
  baseConfig,
  node,
  {
    files: TEST_SETUP_FILES,
    rules: {
      "import-x/no-extraneous-dependencies": "off",
    },
  },
  {
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          basePath: import.meta.dirname,
          zones: TEST_ONLY_FOLDERS.map((folder) => ({
            target: SOURCE_FOLDER,
            from: folder,
            message: "The test cases and their setup are tests. The package's source never imports them.",
          })),
        },
      ],
    },
  },
)
