import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.spec.json"]

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/packages/codegraph",
  plugins: [tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  test: {
    name: "codegraph",
    watch: false,
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "test-setup/**/*.spec.ts", "playground/*/*.integration.test.ts"],
    setupFiles: ["test-setup/mock-git-forge.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/packages/codegraph",
      provider: "v8" as const,
    },
  },
})
