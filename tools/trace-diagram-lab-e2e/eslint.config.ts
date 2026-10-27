import playwright from "eslint-plugin-playwright"
import baseConfig, { defineProjectConfig, node } from "../../eslint.base.config"

const SPEC_FILES = ["src/**/*.spec.ts"]

export default defineProjectConfig(
  playwright.configs["flat/recommended"],
  baseConfig,
  node,
  {
    files: SPEC_FILES,
    rules: {
      "n/no-sync": "off",
      "playwright/valid-title": "off",
    },
  },
)
