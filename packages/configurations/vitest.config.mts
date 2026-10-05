import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.spec.json"]

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/packages/configurations",
  plugins: [tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  test: {
    name: "configurations",
    watch: false,
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/packages/configurations",
      provider: "v8" as const,
    },
  },
})
