import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const DEV_SERVER_PORT = 4200
const PREVIEW_SERVER_PORT = 4300
const BACKEND_URL = "http://localhost:3000"
const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.spec.json"]
const TEST_FOLDER_PATTERN = "^__tests__$"

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/apps/frontend",
  server: {
    port: DEV_SERVER_PORT,
    host: "localhost",
    proxy: { "/api": BACKEND_URL },
  },
  preview: {
    port: PREVIEW_SERVER_PORT,
    host: "localhost",
  },
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true, routeFileIgnorePattern: TEST_FOLDER_PATTERN }),
    react(),
    tailwindcss(),
    tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" }),
  ],
  build: {
    outDir: "../../dist/apps/frontend",
    emptyOutDir: true,
    reportCompressedSize: true,
  },
  test: {
    name: "frontend",
    watch: false,
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["src/__tests__/jsdom-setup.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/apps/frontend",
      provider: "v8" as const,
    },
  },
})
