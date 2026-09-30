import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/apps/backend",
  plugins: [tsconfigPaths()],
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
