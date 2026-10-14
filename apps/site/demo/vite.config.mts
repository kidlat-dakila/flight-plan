import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

const OUTPUT_FOLDER = "../public/demo-app"
const PUBLIC_BASE = "/demo-app/"
const ENTRY_PATH = "app/main.tsx"
const TSCONFIG_NAMES = ["tsconfig.app.json", "tsconfig.lib.json", "tsconfig.json"]
const NODE_ONLY_MODULES = /^(node:(?!crypto$)|tree-sitter|node-pty|fastify|@fastify\/|@agntn\/forges|@napi-rs\/keyring|enhanced-resolve|@modelcontextprotocol\/sdk\/server|mqemitter)/
const UNAVAILABLE_PREFIX = "\0demo-unavailable:"
const STYLESHEET_SUFFIX = ".css"

const unavailableModuleCode = (moduleName: string): string => `
const unavailable = () => { throw new Error(${JSON.stringify(`${moduleName} is not available in the demo`)}) }
const stub = new Proxy(unavailable, { get: (_target, key) => (key === "__esModule" ? false : stub), apply: unavailable, construct: unavailable })
export default stub
`

const nodeOnlyModules = (): Plugin => ({
  name: "demo-node-only-modules",
  enforce: "pre",
  resolveId: (source) => (NODE_ONLY_MODULES.test(source) ? `${UNAVAILABLE_PREFIX}${source}` : null),
  load: (id) =>
    id.startsWith(UNAVAILABLE_PREFIX)
      ? { code: unavailableModuleCode(id.slice(UNAVAILABLE_PREFIX.length)), syntheticNamedExports: true }
      : null,
})

export default defineConfig({
  root: import.meta.dirname,
  base: PUBLIC_BASE,
  cacheDir: "../../../node_modules/.vite/apps/site-demo",
  publicDir: false,
  define: { IS_DEVELOPMENT_BUILD: "false" },
  resolve: { alias: { "node:crypto": `${import.meta.dirname}/app/node-crypto.ts` } },
  plugins: [nodeOnlyModules(), react(), tailwindcss(), tsconfigPaths({ configNames: TSCONFIG_NAMES, projectDiscovery: "lazy" })],
  build: {
    outDir: OUTPUT_FOLDER,
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: `${import.meta.dirname}/${ENTRY_PATH}`,
      output: {
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: (asset) => (asset.names.some((name) => name.endsWith(STYLESHEET_SUFFIX)) ? "app.css" : "assets/[name]-[hash][extname]"),
      },
    },
  },
})
