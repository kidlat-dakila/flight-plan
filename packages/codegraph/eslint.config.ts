import baseConfig, { defineProjectConfig, node } from "../../eslint.base.config"

const SYNCHRONOUS_FILE_SYSTEM_SPECS = ["src/core/__tests__/virtual-fs.spec.ts"]

export default defineProjectConfig(baseConfig, node, {
  files: SYNCHRONOUS_FILE_SYSTEM_SPECS,
  rules: {
    "n/no-sync": "off",
    "n/prefer-promises/fs": "off",
  },
})
