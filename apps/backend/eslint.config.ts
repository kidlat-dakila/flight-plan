import baseConfig, { defineProjectConfig, node } from "../../eslint.base.config"

const SERVER_ENTRY_FILES = ["src/main.ts"]

export default defineProjectConfig(baseConfig, node, {
  files: SERVER_ENTRY_FILES,
  rules: {
    "no-console": "off",
    "no-restricted-properties": "off",
  },
})
