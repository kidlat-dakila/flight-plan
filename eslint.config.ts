import baseConfig, { defineProjectConfig } from "./eslint.base.config"

export default defineProjectConfig({ ignores: ["src"] }, baseConfig)
