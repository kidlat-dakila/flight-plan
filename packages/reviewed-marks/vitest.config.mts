import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.spec.json"]

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/packages/reviewed-marks",
  plugins: [tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  test: {
    name: "reviewed-marks",
    watch: false,
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/packages/reviewed-marks",
      provider: "v8" as const,
    },
  },
})
