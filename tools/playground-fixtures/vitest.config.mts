import { join } from "node:path"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.spec.json"]
const PACKAGES_PATH = join(import.meta.dirname, "..", "..", "packages")

const TEST_CASE_ALIASES = {
  "@test-setup": join(import.meta.dirname, "test-setup"),
  "@flightplan/codegraph": join(PACKAGES_PATH, "codegraph", "src", "index.ts"),
  "@flightplan/git-forge": join(PACKAGES_PATH, "git-forge", "src", "index.ts"),
}

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/tools/playground-fixtures",
  plugins: [tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  resolve: { alias: TEST_CASE_ALIASES },
  test: {
    name: "playground-fixtures",
    watch: false,
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "test-setup/**/*.spec.ts", "test-cases/*/*.integration.test.ts"],
    setupFiles: ["test-setup/mock-git-forge.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/tools/playground-fixtures",
      provider: "v8" as const,
    },
  },
})
