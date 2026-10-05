import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const TSCONFIG_NAMES = ["tsconfig.lib.json", "tsconfig.spec.json"]

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../node_modules/.vite/tools",
  plugins: [tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  test: {
    name: "tools",
    watch: false,
    globals: true,
    environment: "node",
    include: ["**/*.spec.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../coverage/tools",
      provider: "v8" as const,
    },
  },
})
