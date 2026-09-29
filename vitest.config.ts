import { defineConfig } from "vitest/config"

/**
 * Every test in the repository, in one run.
 *
 * Tests sit in a `__tests__` folder beside the module they test, under all
 * four folders of `src`. They are plain Node: the UI tests check pure helpers
 * and never mount a component, so there is no DOM environment.
 *
 * `src/vscode/__tests__/extension.test.ts` stays out: it imports `vscode`,
 * which only resolves inside a real extension host. That one keeps
 * `vscode-test`, under `pnpm run test:vscode`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["src/vscode/__tests__/extension.test.ts", "**/node_modules/**"],
  },
})
