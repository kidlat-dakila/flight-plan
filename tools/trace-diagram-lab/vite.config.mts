import { join } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { traceFixturesPlugin } from "./src/server/trace-fixtures-plugin"

const DEV_SERVER_PORT = 4410
const PREVIEW_SERVER_PORT = 4411
const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.spec.json"]
const WORKSPACE_PATH = join(import.meta.dirname, "..", "..")
const PACKAGES_PATH = join(WORKSPACE_PATH, "packages")
const PLAYGROUND_FIXTURES_PATH = join(WORKSPACE_PATH, "tools", "playground-fixtures")

const CASE_ALIASES = {
  "@test-setup": join(import.meta.dirname, "test-setup"),
  "@flightplan/codegraph": join(PACKAGES_PATH, "codegraph", "src", "index.ts"),
  "@flightplan/git-forge": join(PACKAGES_PATH, "git-forge", "src", "index.ts"),
  "@flightplan/playground-fixtures/test-setup": join(PLAYGROUND_FIXTURES_PATH, "test-setup", "index.ts"),
  "@flightplan/playground-fixtures": join(PLAYGROUND_FIXTURES_PATH, "src", "index.ts"),
}

const NODE_TESTS = ["src/fixtures/**/*.spec.ts", "src/server/**/*.spec.ts", "test-setup/**/*.spec.ts", "cases/*/*.integration.test.ts", "playgrounds/*/*/*.integration.test.ts", "playgrounds/*/*/*/*.integration.test.ts"]
const BROWSER_TESTS = ["src/**/*.spec.tsx"]
const GIT_FORGE_MOCK = join(PLAYGROUND_FIXTURES_PATH, "test-setup", "mock-git-forge.ts")

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/tools/trace-diagram-lab",
  server: {
    port: DEV_SERVER_PORT,
    host: "localhost",
  },
  preview: {
    port: PREVIEW_SERVER_PORT,
    host: "localhost",
  },
  plugins: [react(), tailwindcss(), tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" }), traceFixturesPlugin()],
  resolve: { alias: CASE_ALIASES },
  build: {
    outDir: "../../dist/tools/trace-diagram-lab",
    emptyOutDir: true,
    reportCompressedSize: true,
  },
  test: {
    watch: false,
    globals: true,
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/tools/trace-diagram-lab",
      provider: "v8" as const,
    },
    projects: [
      {
        extends: true,
        test: {
          name: "trace-diagram-lab-node",
          environment: "node",
          include: NODE_TESTS,
          setupFiles: [GIT_FORGE_MOCK],
        },
      },
      {
        extends: true,
        test: {
          name: "trace-diagram-lab-browser",
          environment: "jsdom",
          include: BROWSER_TESTS,
        },
      },
    ],
  },
})
