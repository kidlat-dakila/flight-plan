import { join } from "node:path"
import baseConfig, { defineProjectConfig, node, react } from "../../eslint.base.config"

const CASES = ["cases/**", "playgrounds/**"]
const FIXTURE_FILES = ["src/fixtures/**/*.ts"]
const BROWSER_FOLDERS = ["./src/app", "./src/main.tsx"]
const FIXTURES_FOLDER = "./src/fixtures"
const TEST_ONLY_FOLDERS = ["./cases", "./playgrounds", "./test-setup"]
const SOURCE_FOLDER = "./src"
const WORKSPACE_ROOT = join(import.meta.dirname, "..", "..")
const WORKSPACE_PACKAGES = [
  "@flightplan/codegraph",
  "@flightplan/configurations",
  "@flightplan/git-forge",
  "@flightplan/playground-fixtures",
  "@flightplan/ui",
]
const DEVELOPMENT_FILES = ["**/__tests__/**", "**/*.spec.ts", "**/*.spec.tsx", "test-setup/**", "**/*.config.ts", "**/*.config.mts"]

const nodeFixtures = node.map((config) => ({ ...config, files: FIXTURE_FILES }))

export default defineProjectConfig(
  { ignores: CASES },
  baseConfig,
  react,
  nodeFixtures,
  {
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        { packageDir: [WORKSPACE_ROOT], devDependencies: DEVELOPMENT_FILES, whitelist: WORKSPACE_PACKAGES },
      ],
    },
  },
  {
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          basePath: import.meta.dirname,
          zones: [
            ...BROWSER_FOLDERS.map((target) => ({
              target,
              from: FIXTURES_FOLDER,
              message: "The fixtures read the disk. The page never imports them.",
            })),
            ...TEST_ONLY_FOLDERS.map((folder) => ({
              target: SOURCE_FOLDER,
              from: folder,
              message: "The cases and their setup are tests. The lab's source never imports them.",
            })),
          ],
        },
      ],
    },
  },
)
