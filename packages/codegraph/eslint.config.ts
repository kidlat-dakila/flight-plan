import baseConfig, { defineProjectConfig, node } from "../../eslint.base.config"

const SYNCHRONOUS_FILE_SYSTEM_SPECS = ["src/core/__tests__/virtual-fs.spec.ts"]
const ENGINE_FOLDER = "./src/core"
const SOURCE_FOLDER = "./src"

export default defineProjectConfig(
  baseConfig,
  node,
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
          ],
        },
      ],
    },
  },
)
