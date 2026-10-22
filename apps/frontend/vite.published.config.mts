import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json"]
const ENTRY_PATH = "src/published/main.tsx"
const INLINE_EVERY_ASSET_BYTES = 100_000_000
const REACT_COMPILER_PLUGIN = "babel-plugin-react-compiler"

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../node_modules/.vite/apps/frontend-published",
  publicDir: false,
  plugins: [react({ babel: { plugins: [REACT_COMPILER_PLUGIN] } }), tailwindcss(), tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  build: {
    outDir: "../../dist/apps/published-review",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: INLINE_EVERY_ASSET_BYTES,
    rollupOptions: {
      input: ENTRY_PATH,
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "app[extname]",
      },
    },
  },
})
