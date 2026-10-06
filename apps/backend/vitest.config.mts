import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.spec.json"]

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/apps/backend",
  define: { IS_DEVELOPMENT_BUILD: "true" },
  plugins: [tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  test: {
    name: "backend",
    watch: false,
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/apps/backend",
      provider: "v8" as const,
    },
  },
})
