import baseConfig, { defineProjectConfig, node } from "../../eslint.base.config"

const SCRIPT_FILES = ["index.ts", "utils/**/*.ts"]
const SCRIPT_ENTRY_FILES = ["index.ts"]

export default defineProjectConfig(
  baseConfig,
  node.map((config) => ({ ...config, files: SCRIPT_FILES })),
  {
    files: SCRIPT_ENTRY_FILES,
    rules: {
      "no-console": "off",
      "no-restricted-properties": "off",
    },
  },
)
